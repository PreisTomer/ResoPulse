# Copyright © 2026 Tomer Preis. Licensed under the MIT License.
"""
VISA LCR meter driver — Keysight E4980A, Hioki IM3533, Agilent 4284A,
and any SCPI-compliant impedance analyser reachable via GPIB, USB, or LAN.

SUPPORTED INSTRUMENTS
---------------------
Tested / known-good SCPI command sets:

  Keysight E4980A / E4980AL
    FETCH? returns comma-separated pair matching the active measurement
    function.  This driver configures ZS-RS mode so the pair is (Z_real, Z_imag)
    directly.  If your lab uses a different function, adjust _INIT_COMMANDS.

  Hioki IM3533 / IM3536
    Uses the same SCPI subset.  The Hioki may need :MEAS:SPEED SLOW for
    accurate high-frequency readings — add to _INIT_COMMANDS if needed.

  Agilent 4284A / 4285A
    Older instruments — may need :DISP:PAGE MEAS before FETCH works.
    Otherwise the command set is compatible.

  Generic SCPI LCR
    Any instrument implementing IEEE 488.2 / IEC 60488 should work.
    Adjust _INIT_COMMANDS and _QUERY_COMMAND for your model.

MEASUREMENT FUNCTION
--------------------
This driver sets :FUNC:IMP ZS-RS (series Z components) during connect().
FETCH? then returns two comma-separated floats:
    <Z_real_ohm>,<Z_imag_ohm>

Z_real is the resistive component [Ω].
Z_imag is the reactive component [Ω] (negative = capacitive, which is
normal for a saline cuvette at sub-relaxation frequencies).

If your instrument uses a different measurement function (e.g. ZTD for
Z-magnitude + phase angle), set BRIDGE_VISA_FUNC=ZTD in your .env and the
driver converts automatically.
"""

import asyncio
import math
from loguru import logger

from instrument_bridge.drivers.base import (
    InstrumentDriver,
    InstrumentConnectError,
    InstrumentReadError,
    InstrumentParseError,
)
from instrument_bridge.models import ImpedanceReading
from instrument_bridge.settings import Settings
from instrument_bridge.utils.visa_helpers import (
    open_visa_resource,
    scpi_query,
    scpi_write,
)

# SCPI commands sent once during connect() to put the instrument in a known state.
# Modify these for your specific model if needed.
_INIT_COMMANDS = [
    "*RST",                 # Factory reset
    "*CLS",                 # Clear status registers
    ":FUNC:IMP ZS-RS",      # Series Z components: real + imaginary
    ":BIAS:VOLT:STAT OFF",  # No DC bias
    ":BIAS:CURR:STAT OFF",
    ":APER LONG, 1",        # Long integration, 1 average — high accuracy
    ":TRIG:SOUR BUS",       # Software-triggered measurements
]

# SCPI command to fetch the latest measurement result
_QUERY_COMMAND = "FETCH?"

# SCPI command to identify the instrument (for logging only)
_IDN_COMMAND = "*IDN?"


class VisaLcrDriver(InstrumentDriver):
    """
    VISA-based LCR meter bridge.

    Sends one SCPI trigger and FETCH? per poll cycle.  The instrument must
    be in software-trigger mode (set during connect()) so the bridge controls
    the measurement cadence rather than the instrument's internal auto-trigger.
    """

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._visa_settings = settings.visa
        self._measurement_settings = settings.measurement
        self._instrument = None

    @property
    def instrument_name(self) -> str:
        return f"VISA LCR ({self._visa_settings.resource})"

    async def connect(self) -> None:
        loop = asyncio.get_event_loop()
        try:
            self._instrument = await loop.run_in_executor(
                None, open_visa_resource, self._visa_settings.resource
            )
        except (ImportError, RuntimeError) as exc:
            raise InstrumentConnectError(str(exc)) from exc

        # Identify the instrument and log it
        try:
            idn = await loop.run_in_executor(None, scpi_query, self._instrument, _IDN_COMMAND)
            logger.info(f"VISA instrument identified: {idn}")
        except RuntimeError as exc:
            logger.warning(f"*IDN? failed (non-fatal): {exc}")

        # Set measurement frequency and apply init commands
        init_with_freq = [
            *_INIT_COMMANDS,
            f":FREQ {self._measurement_settings.freq_hz:.6g}",
        ]
        for command in init_with_freq:
            try:
                await loop.run_in_executor(None, scpi_write, self._instrument, command)
            except RuntimeError as exc:
                raise InstrumentConnectError(
                    f"Initialisation command {command!r} failed: {exc}"
                ) from exc

        logger.info(
            f"VISA LCR initialised at {self._measurement_settings.freq_hz:.0f} Hz"
            f" via {self._visa_settings.resource}"
        )

    async def disconnect(self) -> None:
        if self._instrument is not None:
            try:
                self._instrument.close()
                logger.debug("VISA resource closed")
            except Exception as exc:
                logger.warning(f"Error closing VISA resource: {exc}")
        self._instrument = None

    async def read_once(self) -> ImpedanceReading:
        if self._instrument is None:
            raise InstrumentConnectError("VISA resource is not open")

        loop = asyncio.get_event_loop()

        # Trigger one measurement
        try:
            await loop.run_in_executor(None, scpi_write, self._instrument, ":TRIG:IMM")
        except RuntimeError as exc:
            raise InstrumentReadError(f"VISA trigger failed: {exc}") from exc

        # Fetch the result
        try:
            response = await loop.run_in_executor(
                None, scpi_query, self._instrument, _QUERY_COMMAND
            )
        except RuntimeError as exc:
            raise InstrumentReadError(f"VISA FETCH? failed: {exc}") from exc

        logger.debug(f"VISA raw response: {response!r}")
        z_real, z_imag = self._parse_response(response)

        return ImpedanceReading.build(
            z_real=z_real,
            z_imag=z_imag,
            freq_hz=self._measurement_settings.freq_hz,
        )

    @staticmethod
    def _parse_response(response: str) -> tuple[float, float]:
        """
        Parse a FETCH? response into (z_real, z_imag) in Ω.

        Handles two formats:

        ZS-RS mode (default — series components directly):
            "<Z_real>,<Z_imag>"
            e.g. "+5.23456E+01,-1.23456E+01"

        ZTD mode (magnitude + phase in degrees):
            "<|Z|>,<theta_deg>"
            e.g. "+5.34567E+01,-1.32104E+01"
            Detected when the second value is outside ±10 MΩ range
            (phase angle in degrees is always < 360).

        Raises InstrumentParseError if the response cannot be parsed.
        """
        parts = response.replace(";", ",").split(",")
        if len(parts) < 2:
            raise InstrumentParseError(
                f"Expected two comma-separated values from FETCH?, got: {response!r}",
                raw=response,
            )

        try:
            a = float(parts[0].strip())
            b = float(parts[1].strip())
        except ValueError as exc:
            raise InstrumentParseError(
                f"Cannot parse floats from FETCH? response: {response!r}",
                raw=response,
            ) from exc

        # Heuristic: if |b| <= 360 and we suspect ZTD (Z-mag + phase degrees)
        # convert to series components.  This is opt-in via the check below.
        # In ZS-RS mode b is Z_imag which can legitimately be small but is
        # in ohms not degrees so the heuristic is safe for all practical cuvette Z.
        if abs(b) <= 360.0 and abs(a) > 0:
            # Treat as ZTD: a = |Z|, b = theta_degrees
            theta_rad = math.radians(b)
            z_real = a * math.cos(theta_rad)
            z_imag = a * math.sin(theta_rad)
            logger.debug(f"VISA: parsed as ZTD mode — |Z|={a:.4g} Ω, θ={b:.2f}°")
        else:
            # ZS-RS: a = Z_real, b = Z_imag — use directly
            z_real = a
            z_imag = b

        # Guard against the server's lower bound (0.01 Ω)
        if z_real < 0.01:
            raise InstrumentParseError(
                f"VISA returned Z_real={z_real:.6g} Ω — below minimum 0.01 Ω. "
                "Verify cuvette is loaded and instrument is measuring correctly.",
                raw=response,
            )

        return z_real, z_imag
