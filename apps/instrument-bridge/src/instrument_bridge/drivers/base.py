# Copyright © 2026 Tomer Preis. Licensed under the MIT License.
"""
Abstract base class for all instrument drivers.

Each driver is responsible for exactly one thing: opening a connection to a
physical (or simulated) instrument and returning one ImpedanceReading per call.
Retry logic, Socket.IO communication, and Rich display all live in the emitter.
Drivers stay pure and focused.

Error contract
--------------
connect()    raises InstrumentConnectError on failure
read_once()  raises InstrumentReadError (or its subclass InstrumentParseError)
             if the reading cannot be obtained or parsed
disconnect() is best-effort — swallow exceptions, always complete
"""

from abc import ABC, abstractmethod

from instrument_bridge.models import ImpedanceReading


# ── Exception hierarchy ────────────────────────────────────────────────────────

class InstrumentError(Exception):
    """Base for all instrument errors."""


class InstrumentConnectError(InstrumentError):
    """Cannot open or establish a connection to the instrument."""


class InstrumentReadError(InstrumentError):
    """A reading attempt failed (timeout, no data, instrument error)."""


class InstrumentParseError(InstrumentReadError):
    """
    The instrument responded but the response could not be parsed.
    The raw response string is stored in the `raw` attribute for diagnostics.
    """

    def __init__(self, message: str, raw: str = "") -> None:
        super().__init__(message)
        self.raw = raw


# ── Abstract base ──────────────────────────────────────────────────────────────

class InstrumentDriver(ABC):
    """
    Protocol that every instrument driver must implement.

    Drivers are async context managers as well as providing the explicit
    connect()/disconnect() methods, so they can be used with `async with`
    or called directly from the emitter loop.
    """

    @property
    @abstractmethod
    def instrument_name(self) -> str:
        """Human-readable name shown in the Rich status panel."""

    @abstractmethod
    async def connect(self) -> None:
        """
        Open the connection to the instrument.

        Raises InstrumentConnectError if the port/resource cannot be opened.
        Must be idempotent — calling connect() on an already-connected driver
        should be safe (no-op or reconnect gracefully).
        """

    @abstractmethod
    async def read_once(self) -> ImpedanceReading:
        """
        Take one measurement and return a validated ImpedanceReading.

        Raises InstrumentReadError  if the instrument does not respond.
        Raises InstrumentParseError if the response cannot be interpreted.
        Must NOT block longer than a few seconds — use timeouts internally.
        """

    @abstractmethod
    async def disconnect(self) -> None:
        """
        Close the connection cleanly.

        Must not raise — catch and log any errors internally.
        """

    # ── Context manager support ────────────────────────────────────────────────

    async def __aenter__(self) -> "InstrumentDriver":
        await self.connect()
        return self

    async def __aexit__(self, *_) -> None:
        await self.disconnect()
