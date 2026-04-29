# Copyright © 2026 Tomer Preis. Licensed under the MIT License.
"""
BTX ECM 830 / ECM 2001 electroporator bridge — RS-232 serial.

The BTX ECM 830 is a square-wave pulse generator, not an impedance analyser.
After each pulse it reports the measured cuvette resistance via its RS-232
port.  This driver polls that resistance readback to provide live cuvette load
monitoring in the ResoPulse UI.

NOTE ON PROTOCOL ACCURACY
--------------------------
The BTX ECM 830/2001 RS-232 protocol is not publicly documented by Harvard
Apparatus / BTX.  The implementation below is based on community reports and
instrument captures from the electroporation literature.  The key observations:

  - 9600 baud, 8N1, no hardware or software flow control
  - The instrument streams one ASCII line per pulse event of the form:
        R=XXXX\r\n   (resistance in ohms, zero-padded, 4 digits)
    or in some firmware revisions:
        RESI=XXXX\r\n
  - A status query can be triggered by sending a single 'S' byte followed
    by '\r\n', which returns the last measured resistance.
  - If no pulse has occurred since power-on the instrument either returns
    'R=0000' (open circuit) or does not respond until the first pulse.

You may need to adjust QUERY_COMMAND or the response parsing in
_parse_resistance() below for your specific BTX model and firmware version.
If unsure, run  instrument-bridge run --driver btx --port COMx  and watch
the raw lines printed at DEBUG log level to determine the actual format.

MEASUREMENT TYPE
----------------
This is a quasi-DC post-pulse resistance measurement, not an AC impedance
sweep.  Consequently:
  - zImag is always 0.0 (no reactive component at DC)
  - freqHz is set to 1.0 Hz (the server's FREQ_MIN lower bound for DC proxy)
  - conductivity is left as None (cuvette geometry is not known to the driver;
    the UI's impedanceStore derives it from Z_real + cuvette geometry settings)
"""

import asyncio
from loguru import logger

from instrument_bridge.drivers.base import (
    InstrumentDriver,
    InstrumentConnectError,
    InstrumentReadError,
    InstrumentParseError,
)
from instrument_bridge.drivers.constants import (
    DC_PROXY_FREQ_HZ,
    DEFAULT_SERIAL_CONNECT_TIMEOUT_S,
    DEFAULT_SERIAL_READ_TIMEOUT_S,
    MIN_RESISTANCE_OHM,
)
from instrument_bridge.models import ImpedanceReading
from instrument_bridge.settings import Settings
from instrument_bridge.utils.serial_helpers import open_serial_port, read_line_async

# The ASCII command sent to request the last measured resistance.
# Change to b'S\r\n' or b'\r\n' if your firmware uses a different query byte.
_QUERY_COMMAND = b"S\r\n"

class BtxDriver(InstrumentDriver):
    """
    RS-232 bridge for the BTX ECM 830 / ECM 2001 electroporator.

    Each call to read_once() sends a status query and parses the resistance
    response.  In continuous-pulse operation the instrument may also push
    unsolicited resistance lines between queries; this driver discards them
    by always flushing the input buffer before querying.
    """

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._serial_settings = settings.serial
        self._serial = None

    @property
    def instrument_name(self) -> str:
        return f"BTX ECM ({self._serial_settings.port})"

    async def connect(self) -> None:
        try:
            self._serial = open_serial_port(
                port=self._serial_settings.port,
                baud_rate=self._serial_settings.baud_rate,
                timeout_s=DEFAULT_SERIAL_CONNECT_TIMEOUT_S,
            )
        except (ImportError, RuntimeError) as exc:
            raise InstrumentConnectError(str(exc)) from exc

        logger.info(f"BTX ECM connected on {self._serial_settings.port}")

    async def disconnect(self) -> None:
        if self._serial and self._serial.is_open:
            try:
                self._serial.close()
                logger.debug("BTX serial port closed")
            except Exception as exc:
                logger.warning(f"Error closing BTX serial port: {exc}")
        self._serial = None

    async def read_once(self) -> ImpedanceReading:
        if not self._serial or not self._serial.is_open:
            raise InstrumentConnectError("BTX serial port is not open")

        # Flush stale unsolicited data before sending the query
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, self._serial.reset_input_buffer)

        # Send status query
        try:
            await loop.run_in_executor(None, self._serial.write, _QUERY_COMMAND)
        except Exception as exc:
            raise InstrumentReadError(f"BTX write error: {exc}") from exc

        # Read the response line
        try:
            line = await read_line_async(self._serial, timeout_s=DEFAULT_SERIAL_READ_TIMEOUT_S)
        except RuntimeError as exc:
            raise InstrumentReadError(str(exc)) from exc

        logger.debug(f"BTX raw response: {line!r}")
        resistance_ohm = self._parse_resistance(line)

        if resistance_ohm < MIN_RESISTANCE_OHM:
            raise InstrumentReadError(
                f"BTX returned resistance {resistance_ohm} Ω — "
                "verify the cuvette is loaded and a pulse has been triggered."
            )

        return ImpedanceReading.build(
            z_real=resistance_ohm,
            z_imag=0.0,
            freq_hz=DC_PROXY_FREQ_HZ,
            conductivity=None,
        )

    @staticmethod
    def _parse_resistance(line: str) -> float:
        """
        Parse a BTX resistance line into a float in ohms.

        Handles the following known response formats:
          'R=0123'       — ECM 830 standard
          'RESI=0123'    — some ECM 2001 firmware
          '0123'         — bare number (some third-party firmware)
          'R=0123.4'     — decimal variant

        Raises InstrumentParseError if no numeric value can be extracted.
        """
        # Strip known prefixes case-insensitively
        cleaned = line.upper()
        for prefix in ("RESI=", "R="):
            if cleaned.startswith(prefix):
                cleaned = cleaned[len(prefix):]
                break

        # Remove any trailing unit suffix (e.g. 'OHM', 'Ω')
        cleaned = cleaned.split()[0] if cleaned.split() else cleaned

        try:
            return float(cleaned)
        except ValueError as exc:
            raise InstrumentParseError(
                f"Cannot parse BTX resistance from line: {line!r}",
                raw=line,
            ) from exc
