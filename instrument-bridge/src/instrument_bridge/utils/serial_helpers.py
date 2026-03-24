"""
Helpers for opening and reading from serial ports.

Both the BTX and ASCII-serial drivers use these so the error-handling and
timeout logic lives in one place.
"""

import asyncio
from loguru import logger


def open_serial_port(port: str, baud_rate: int, timeout_s: float = 2.0):
    """
    Open a serial port and return the Serial object.

    Args:
        port:      Port name (e.g. 'COM3' or '/dev/ttyUSB0')
        baud_rate: Baud rate (e.g. 9600)
        timeout_s: Read timeout in seconds

    Returns:
        An open serial.Serial instance

    Raises:
        ImportError if pyserial is not installed
        InstrumentConnectError (imported at call site) on port failure
    """
    try:
        import serial
    except ImportError as exc:
        raise ImportError(
            "pyserial is not installed. Run:  uv sync --extra serial"
        ) from exc

    try:
        ser = serial.Serial(
            port=port,
            baudrate=baud_rate,
            bytesize=serial.EIGHTBITS,
            parity=serial.PARITY_NONE,
            stopbits=serial.STOPBITS_ONE,
            timeout=timeout_s,
        )
        logger.debug(f"Serial port {port} opened at {baud_rate} baud")
        return ser
    except serial.SerialException as exc:
        raise RuntimeError(f"Cannot open serial port {port!r}: {exc}") from exc


async def read_line_async(ser, timeout_s: float = 3.0) -> str:
    """
    Read one line from a serial port, running the blocking readline()
    in a thread executor so the asyncio event loop is not blocked.

    Args:
        ser:       An open serial.Serial instance
        timeout_s: Maximum time to wait for a complete line

    Returns:
        Stripped ASCII line string

    Raises:
        RuntimeError if no data arrives within timeout_s or if the
        port is disconnected mid-read
    """
    loop = asyncio.get_event_loop()

    try:
        raw: bytes = await asyncio.wait_for(
            loop.run_in_executor(None, ser.readline),
            timeout=timeout_s,
        )
    except asyncio.TimeoutError as exc:
        raise RuntimeError(
            f"Serial read timed out after {timeout_s}s — is the instrument sending data?"
        ) from exc
    except Exception as exc:
        raise RuntimeError(f"Serial read error: {exc}") from exc

    if not raw:
        raise RuntimeError(
            "Serial read returned empty bytes — instrument may be disconnected"
        )

    return raw.decode("ascii", errors="replace").strip()


def list_serial_ports() -> list[dict]:
    """
    Return a list of available serial ports as dicts with keys:
    'port', 'description', 'hwid'.

    Returns an empty list if pyserial is not installed.
    """
    try:
        from serial.tools.list_ports import comports
        return [
            {"port": p.device, "description": p.description, "hwid": p.hwid}
            for p in sorted(comports(), key=lambda p: p.device)
        ]
    except ImportError:
        return []
