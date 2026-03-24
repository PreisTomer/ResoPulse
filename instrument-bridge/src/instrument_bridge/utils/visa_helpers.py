"""
Helpers for opening and communicating with VISA instruments.

Wraps pyvisa with consistent error raising and deferred imports so the
package remains importable in environments without a VISA backend.
"""

from loguru import logger


def open_visa_resource(resource_string: str, timeout_ms: int = 5000):
    """
    Open a VISA resource and return the instrument handle.

    Args:
        resource_string: VISA resource identifier
                         (e.g. 'GPIB0::17::INSTR' or 'USB0::...::INSTR')
        timeout_ms:      Communication timeout in milliseconds

    Returns:
        An open pyvisa Resource instance

    Raises:
        ImportError                    if pyvisa is not installed
        RuntimeError (connect-flavour) on VISA open failure
    """
    try:
        import pyvisa
    except ImportError as exc:
        raise ImportError(
            "pyvisa is not installed. Run:  uv sync --extra visa\n"
            "You also need a VISA backend: NI-VISA, Keysight IO, or pyvisa-py."
        ) from exc

    try:
        rm = pyvisa.ResourceManager()
        instrument = rm.open_resource(resource_string)
        instrument.timeout = timeout_ms
        logger.debug(f"VISA resource {resource_string!r} opened")
        return instrument
    except pyvisa.errors.VisaIOError as exc:
        raise RuntimeError(
            f"Cannot open VISA resource {resource_string!r}: {exc}"
        ) from exc


def scpi_query(instrument, command: str) -> str:
    """
    Send a SCPI query command and return the stripped response string.

    Args:
        instrument: An open pyvisa Resource
        command:    SCPI command string (e.g. 'FETCH:IMP?')

    Returns:
        Stripped response string

    Raises:
        RuntimeError on communication failure
    """
    try:
        import pyvisa
        response: str = instrument.query(command)
        return response.strip()
    except pyvisa.errors.VisaIOError as exc:
        raise RuntimeError(f"SCPI query {command!r} failed: {exc}") from exc


def scpi_write(instrument, command: str) -> None:
    """
    Send a SCPI write command (no response expected).

    Args:
        instrument: An open pyvisa Resource
        command:    SCPI command string (e.g. ':FREQ 1000')

    Raises:
        RuntimeError on communication failure
    """
    try:
        import pyvisa
        instrument.write(command)
    except pyvisa.errors.VisaIOError as exc:
        raise RuntimeError(f"SCPI write {command!r} failed: {exc}") from exc


def list_visa_resources() -> list[str]:
    """
    Return a list of VISA resource strings found on this machine.
    Returns an empty list if pyvisa is not installed or no resources are found.
    """
    try:
        import pyvisa
        rm = pyvisa.ResourceManager()
        return list(rm.list_resources())
    except Exception:
        return []
