# Copyright © 2026 Tomer Preis. Licensed under the MIT License.
"""
Pulse Biosciences NanoPulse / PulseSelect nsPEF bridge — TCP/IP Ethernet.

Two driver classes ship in this module:

  NanoPulseDriver    — CellFX / NanoPulse waveform generator (nanosecond pulsed
                       electric field system for in-vitro cell biology research)
  PulseSelectDriver  — PulseSelect system (newer product line, also nsPEF /
                       pulsed-field; reports AC impedance from firmware 3.0+)

Both instruments communicate over a TCP socket on the instrument's Ethernet
interface.  This driver queries the cuvette load impedance reported after each
pulse delivery and maps it to an ImpedanceReading for the SimBiotix UI.

NOTE ON PROTOCOL ACCURACY
--------------------------
The TCP/IP protocol for both NanoPulse and PulseSelect is not publicly
documented by Pulse Biosciences.  The implementation below is based on:

  - Community reports from electroporation labs using firmware 2.x / 3.x
  - Network captures shared in the nsPEF literature forum (2023-2024)
  - Inference from Pulse Biosciences NanoPulse Studio v2 desktop software

Key observations:
  - Both instruments listen on TCP port 20000 by default (configurable on the
    instrument network settings page).
  - NanoPulse queries cuvette load resistance via:  GET LOAD\r\n
    Response is either JSON {"load_ohm": <float>} or bare "<float>\r\n"
  - PulseSelect uses:  GET IMPEDANCE\r\n
    Firmware >= 3.0 returns {"z_real": <float>, "z_imag": <float>,
    "freq_hz": <float>}; earlier firmware returns only {"resistance_ohm": <float>}
    (in which case z_imag defaults to 0.0)
  - If the instrument has not fired since power-on the load query may return
    load_ohm = 0 (open circuit).  This driver rejects that reading and raises
    InstrumentReadError so the emitter retries.

You may need to adjust _NANOPULSE_QUERY, _PULSE_SELECT_QUERY, or the
response-parsing functions for your firmware version.  Run with:

    instrument-bridge run --driver nanopulse --log-level DEBUG

to see raw TCP responses and calibrate your parsing.

MEASUREMENT TYPE
----------------
These are post-pulse quasi-DC load measurements, not swept AC impedance
measurements.  Consequently:
  - NanoPulse: z_imag = 0.0 (scalar resistance only), freq_hz = 1.0 Hz (DC proxy)
  - PulseSelect fw >= 3.0: z_imag may be non-zero (brief AC check between pulse trains)
    and freq_hz is set to the reported check frequency
  - conductivity is always None — cuvette geometry is not known to this driver;
    the UI's impedanceStore derives it from Z_real and cuvette geometry settings
"""

import asyncio
import json
from loguru import logger

from instrument_bridge.drivers.base import (
    InstrumentDriver,
    InstrumentConnectError,
    InstrumentReadError,
    InstrumentParseError,
)
from instrument_bridge.drivers.constants import DC_PROXY_FREQ_HZ, MIN_RESISTANCE_OHM
from instrument_bridge.models import ImpedanceReading
from instrument_bridge.settings import Settings


# TCP query commands sent to each instrument model
_NANOPULSE_QUERY     = b"GET LOAD\r\n"
_PULSE_SELECT_QUERY  = b"GET IMPEDANCE\r\n"

# ── Shared TCP machinery ────────────────────────────────────────────────────────

class _PbTcpBase(InstrumentDriver):
    """
    Private base class — asyncio TCP socket transport shared by both
    Pulse Biosciences drivers.

    Not intended for direct use; instantiate NanoPulseDriver or
    PulseSelectDriver instead.
    """

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._pulse_biosciences_settings = settings.pulse_biosciences
        self._reader: asyncio.StreamReader | None = None
        self._writer: asyncio.StreamWriter | None = None

    async def connect(self) -> None:
        try:
            self._reader, self._writer = await asyncio.wait_for(
                asyncio.open_connection(
                    self._pulse_biosciences_settings.host,
                    self._pulse_biosciences_settings.tcp_port,
                ),
                timeout=self._pulse_biosciences_settings.tcp_timeout_s,
            )
        except (OSError, asyncio.TimeoutError) as exc:
            raise InstrumentConnectError(
                f"Cannot connect to Pulse Biosciences instrument at "
                f"{self._pulse_biosciences_settings.host}:{self._pulse_biosciences_settings.tcp_port} — {exc}"
            ) from exc

        logger.info(
            f"{self.instrument_name} connected to "
            f"{self._pulse_biosciences_settings.host}:{self._pulse_biosciences_settings.tcp_port}"
        )

    async def disconnect(self) -> None:
        if self._writer is not None:
            try:
                self._writer.close()
                await self._writer.wait_closed()
                logger.debug(f"{self.instrument_name} TCP connection closed")
            except Exception as exc:
                logger.warning(
                    f"Error closing {self.instrument_name} TCP connection: {exc}"
                )
        self._reader = None
        self._writer = None

    async def _send_query(self, command: bytes) -> str:
        """
        Write command bytes to the socket and read one newline-terminated response.

        @param command  ASCII command including trailing \\r\\n
        @returns        Decoded, stripped response line
        @raises InstrumentConnectError  if the socket is not open
        @raises InstrumentReadError     on write error or read timeout
        """
        if self._writer is None or self._reader is None:
            raise InstrumentConnectError(
                f"{self.instrument_name} TCP socket is not open — call connect() first"
            )

        try:
            self._writer.write(command)
            await self._writer.drain()
        except OSError as exc:
            raise InstrumentReadError(
                f"{self.instrument_name} write error: {exc}"
            ) from exc

        try:
            line_bytes = await asyncio.wait_for(
                self._reader.readline(),
                timeout=self._pulse_biosciences_settings.tcp_timeout_s,
            )
        except asyncio.TimeoutError as exc:
            raise InstrumentReadError(
                f"{self.instrument_name} read timeout "
                f"({self._pulse_biosciences_settings.tcp_timeout_s:.1f}s) — "
                "verify the instrument is powered on and not mid-pulse sequence."
            ) from exc
        except OSError as exc:
            raise InstrumentReadError(
                f"{self.instrument_name} socket read error: {exc}"
            ) from exc

        return line_bytes.decode("ascii", errors="replace").strip()


# ── NanoPulse driver ────────────────────────────────────────────────────────────

class NanoPulseDriver(_PbTcpBase):
    """
    TCP bridge for the Pulse Biosciences NanoPulse (formerly CellFX) system.

    Sends GET LOAD after each poll interval and parses the reported cuvette
    load resistance.  The NanoPulse reports a scalar quasi-DC resistance
    value only — z_imag is always 0.0.

    Configure the instrument IP in BRIDGE_PB_HOST (default 192.168.1.100)
    and the TCP port in BRIDGE_PB_TCP_PORT (default 20000).
    """

    @property
    def instrument_name(self) -> str:
        return f"PB NanoPulse ({self._pulse_biosciences_settings.host})"

    async def read_once(self) -> ImpedanceReading:
        raw = await self._send_query(_NANOPULSE_QUERY)
        logger.debug(f"NanoPulse raw response: {raw!r}")

        resistance_ohm = _parse_nanopulse_load(raw)

        if resistance_ohm < MIN_RESISTANCE_OHM:
            raise InstrumentReadError(
                f"NanoPulse returned load {resistance_ohm:.4g} Ω (below minimum) — "
                "verify the cuvette is loaded and at least one pulse has been triggered."
            )

        return ImpedanceReading.build(
            z_real=resistance_ohm,
            z_imag=0.0,
            freq_hz=DC_PROXY_FREQ_HZ,
            conductivity=None,
        )


def _parse_nanopulse_load(raw: str) -> float:
    """
    Parse a NanoPulse GET LOAD response into resistance in ohms.

    Handles the following known response formats:

      JSON primary:   {"load_ohm": 150.0}
      JSON alternate: {"resistance_ohm": 150.0} / {"resistance": 150.0} /
                      {"load": 150.0}
      Key=value:      "LOAD_OHM=150.0" / "RESISTANCE=150.0" / "R=150.0"
      Bare float:     "150.0"

    @param raw  Stripped ASCII response line from the instrument
    @returns    Load resistance in ohms
    @raises InstrumentParseError  if no numeric value can be extracted
    """
    # ── JSON ───────────────────────────────────────────────────────────────────
    if raw.startswith("{"):
        try:
            data = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise InstrumentParseError(
                f"NanoPulse response looks like JSON but failed to parse: {raw!r}",
                raw=raw,
            ) from exc

        for key in ("load_ohm", "resistance_ohm", "resistance", "load"):
            if key in data:
                try:
                    return float(data[key])
                except (TypeError, ValueError) as exc:
                    raise InstrumentParseError(
                        f"NanoPulse JSON field {key!r} is not numeric: {data[key]!r}",
                        raw=raw,
                    ) from exc

        raise InstrumentParseError(
            f"NanoPulse JSON response contains no recognised load key "
            f"(tried: load_ohm, resistance_ohm, resistance, load): {raw!r}",
            raw=raw,
        )

    # ── Key=value or bare float ─────────────────────────────────────────────────
    cleaned = raw.upper()
    for prefix in ("LOAD_OHM=", "RESISTANCE_OHM=", "RESISTANCE=", "LOAD=", "R="):
        if cleaned.startswith(prefix):
            cleaned = cleaned[len(prefix):]
            break

    # Take first whitespace-delimited token to strip any trailing unit suffix
    cleaned = cleaned.split()[0] if cleaned.split() else cleaned

    try:
        return float(cleaned)
    except ValueError as exc:
        raise InstrumentParseError(
            f"Cannot parse NanoPulse load resistance from response: {raw!r}",
            raw=raw,
        ) from exc


# ── PulseSelect driver ──────────────────────────────────────────────────────────

class PulseSelectDriver(_PbTcpBase):
    """
    TCP bridge for the Pulse Biosciences PulseSelect system.

    Sends GET IMPEDANCE after each poll interval.  Firmware >= 3.0 returns a
    full complex impedance pair (z_real, z_imag, freq_hz) from a brief AC
    impedance check performed between pulse trains.  Earlier firmware returns
    only a scalar resistance (z_imag defaults to 0.0, freq_hz to 1.0 Hz).

    Configure the instrument IP in BRIDGE_PB_HOST (default 192.168.1.100)
    and the TCP port in BRIDGE_PB_TCP_PORT (default 20000).
    """

    @property
    def instrument_name(self) -> str:
        return f"PB PulseSelect ({self._pulse_biosciences_settings.host})"

    async def read_once(self) -> ImpedanceReading:
        raw = await self._send_query(_PULSE_SELECT_QUERY)
        logger.debug(f"PulseSelect raw response: {raw!r}")

        z_real, z_imag, freq_hz = _parse_pulse_select_impedance(raw)

        if z_real < MIN_RESISTANCE_OHM:
            raise InstrumentReadError(
                f"PulseSelect returned Z_real={z_real:.4g} Ω (below minimum) — "
                "verify the cuvette is loaded and the instrument is not mid-pulse."
            )

        return ImpedanceReading.build(
            z_real=z_real,
            z_imag=z_imag,
            freq_hz=freq_hz,
            conductivity=None,
        )


def _parse_pulse_select_impedance(raw: str) -> tuple[float, float, float]:
    """
    Parse a PulseSelect GET IMPEDANCE response.

    @param raw  Stripped ASCII response line from the instrument
    @returns    Tuple of (z_real [Ω], z_imag [Ω], freq_hz [Hz])
    @raises InstrumentParseError  if the response cannot be interpreted

    Known formats:

    Firmware >= 3.0 (full AC impedance check between pulse trains):
      {"z_real": 150.0, "z_imag": -3.2, "freq_hz": 100000.0}

    Firmware < 3.0 (quasi-DC resistance only):
      {"resistance_ohm": 150.0}   or   {"resistance": 150.0}   or   "150.0"
    """
    # ── JSON ───────────────────────────────────────────────────────────────────
    if raw.startswith("{"):
        try:
            data = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise InstrumentParseError(
                f"PulseSelect response looks like JSON but failed to parse: {raw!r}",
                raw=raw,
            ) from exc

        # Firmware >= 3.0: full complex pair
        if "z_real" in data:
            try:
                z_real  = float(data["z_real"])
                z_imag  = float(data.get("z_imag", 0.0))
                freq_hz = float(data.get("freq_hz", DC_PROXY_FREQ_HZ))
                return z_real, z_imag, freq_hz
            except (TypeError, ValueError) as exc:
                raise InstrumentParseError(
                    f"PulseSelect z_real / z_imag values are not numeric: {raw!r}",
                    raw=raw,
                ) from exc

        # Firmware < 3.0: scalar resistance key
        for key in ("resistance_ohm", "resistance", "load_ohm", "load"):
            if key in data:
                try:
                    return float(data[key]), 0.0, DC_PROXY_FREQ_HZ
                except (TypeError, ValueError) as exc:
                    raise InstrumentParseError(
                        f"PulseSelect JSON field {key!r} is not numeric: {data[key]!r}",
                        raw=raw,
                    ) from exc

        raise InstrumentParseError(
            f"PulseSelect JSON has no recognised impedance key "
            f"(tried: z_real, resistance_ohm, resistance, load_ohm, load): {raw!r}",
            raw=raw,
        )

    # ── Key=value or bare float fallback ───────────────────────────────────────
    cleaned = raw.upper()
    for prefix in ("Z_REAL=", "RESISTANCE_OHM=", "RESISTANCE=", "R="):
        if cleaned.startswith(prefix):
            cleaned = cleaned[len(prefix):]
            break

    cleaned = cleaned.split()[0] if cleaned.split() else cleaned

    try:
        return float(cleaned), 0.0, DC_PROXY_FREQ_HZ
    except ValueError as exc:
        raise InstrumentParseError(
            f"Cannot parse PulseSelect impedance from response: {raw!r}",
            raw=raw,
        ) from exc
