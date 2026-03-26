# Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.
"""
Generic ASCII serial LCR meter driver.

For instruments that stream one ASCII line of comma/tab/space-delimited
numbers per measurement — e.g. DER EE DE-5000, Peak LCR45, BK Precision 889B.

PROTOCOL ASSUMPTION
-------------------
The instrument continuously outputs one line per measurement at its configured
rate.  This driver reads one line per poll and extracts the first one or two
numeric tokens as Z_real [, Z_imag].

Since these instruments typically cannot be commanded over serial (they just
stream data), the measurement frequency reported to the UI must be declared
via BRIDGE_MEAS_FREQ_HZ — set this to match whatever frequency you configured
on the instrument's front panel.

COMMON LINE FORMATS
-------------------
  "53.24"             — Z_real only (Z_imag assumed 0.0)
  "53.24,-12.87"      — Z_real, Z_imag (Ω, Ω)
  "53.24\t-12.87"     — tab-delimited
  "53.24 -12.87"      — space-delimited
  "R=53.24 X=-12.87"  — labelled (labels are stripped)
  "53.24,-12.87,1000" — extra tokens ignored

If your instrument uses a different format, adjust _extract_numbers() below.
Watch the DEBUG log output on first run to see the raw lines and tune parsing.
"""

from loguru import logger

from instrument_bridge.drivers.base import (
    InstrumentDriver,
    InstrumentConnectError,
    InstrumentReadError,
    InstrumentParseError,
)
from instrument_bridge.drivers.constants import DEFAULT_SERIAL_CONNECT_TIMEOUT_S, DEFAULT_SERIAL_READ_TIMEOUT_S
from instrument_bridge.models import ImpedanceReading
from instrument_bridge.settings import Settings
from instrument_bridge.utils.serial_helpers import open_serial_port, read_line_async


class AsciiSerialDriver(InstrumentDriver):
    """
    Generic ASCII-streaming serial LCR meter.

    One readline() per poll.  Parses the first two numeric tokens as
    (Z_real, Z_imag) in Ω.  If only one numeric token is found, Z_imag = 0.
    """

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._serial_settings = settings.serial
        self._measurement_settings = settings.measurement
        self._serial = None

    @property
    def instrument_name(self) -> str:
        return f"ASCII Serial LCR ({self._serial_settings.port})"

    async def connect(self) -> None:
        try:
            self._serial = open_serial_port(
                port=self._serial_settings.port,
                baud_rate=self._serial_settings.baud_rate,
                timeout_s=DEFAULT_SERIAL_CONNECT_TIMEOUT_S,
            )
        except (ImportError, RuntimeError) as exc:
            raise InstrumentConnectError(str(exc)) from exc

        logger.info(
            f"ASCII serial LCR connected on {self._serial_settings.port} "
            f"at {self._serial_settings.baud_rate} baud"
        )

    async def disconnect(self) -> None:
        if self._serial and self._serial.is_open:
            try:
                self._serial.close()
                logger.debug("ASCII serial port closed")
            except Exception as exc:
                logger.warning(f"Error closing ASCII serial port: {exc}")
        self._serial = None

    async def read_once(self) -> ImpedanceReading:
        if not self._serial or not self._serial.is_open:
            raise InstrumentConnectError("ASCII serial port is not open")

        try:
            line = await read_line_async(self._serial, timeout_s=DEFAULT_SERIAL_READ_TIMEOUT_S)
        except RuntimeError as exc:
            raise InstrumentReadError(str(exc)) from exc

        logger.debug(f"ASCII serial raw line: {line!r}")

        numbers = _extract_numbers(line)
        if not numbers:
            raise InstrumentParseError(
                f"No numeric values found in serial line: {line!r}",
                raw=line,
            )

        z_real = numbers[0]
        z_imag = numbers[1] if len(numbers) >= 2 else 0.0

        if z_real < 0.01:
            raise InstrumentParseError(
                f"Parsed Z_real={z_real:.6g} Ω from {line!r} — "
                "below the 0.01 Ω minimum. Verify instrument output format.",
                raw=line,
            )

        return ImpedanceReading.build(
            z_real=z_real,
            z_imag=z_imag,
            freq_hz=self._measurement_settings.freq_hz,
        )


def _extract_numbers(line: str) -> list[float]:
    """
    Extract all floating-point numbers from an ASCII line, ignoring labels.

    Splits on commas, tabs, and spaces.  Strips leading label prefixes
    like 'R=', 'X=', 'Z=', 'Y=' before attempting float conversion.
    Returns numbers in the order they appear in the line.
    """
    import re

    # Split on comma, tab, or whitespace
    tokens = re.split(r"[,\t\s]+", line.strip())

    numbers: list[float] = []
    for token in tokens:
        # Strip common label prefixes
        cleaned = re.sub(r"^[A-Za-z]+=", "", token)
        try:
            numbers.append(float(cleaned))
        except ValueError:
            continue  # Non-numeric token — skip

    return numbers
