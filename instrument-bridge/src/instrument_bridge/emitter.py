"""
Bridge emitter — the core async loop.

Owns the Socket.IO client connection and the poll-emit cycle.
Separates three concerns that must stay independent:

  1. Instrument connection  — handled by the driver
  2. Backend connection     — handled by the socketio.AsyncClient
  3. Poll loop + display    — handled here

Both connections use exponential back-off on failure so the bridge recovers
automatically from a rebooted backend or a temporarily disconnected instrument
without any manual intervention.
"""

import asyncio
import time
from typing import TYPE_CHECKING

import socketio
from loguru import logger
from rich.console import Console
from rich.live import Live
from rich.panel import Panel
from rich.table import Table
from rich import box

from instrument_bridge.drivers.base import (
    InstrumentDriver,
    InstrumentConnectError,
    InstrumentReadError,
)
from instrument_bridge.models import ImpedanceReading
from instrument_bridge.settings import Settings

if TYPE_CHECKING:
    pass

# Socket event names — must match backend/src/socket.ts SOCKET_EVENTS exactly
_EVENT_IMPEDANCE_READING = "impedanceReading"

# Exponential back-off ceiling [seconds]
_BACKOFF_MAX_S = 30

# Consecutive read errors before attempting driver reconnect
_MAX_CONSECUTIVE_ERRORS = 5

console = Console()


def _backoff_seconds(attempt: int) -> float:
    """Return capped exponential back-off: 1, 2, 4, 8, 16, 30, 30, ..."""
    return min(2 ** attempt, _BACKOFF_MAX_S)


class BridgeEmitter:
    """
    Connects to the ResoPulse backend and the instrument driver, then
    polls the driver at poll_interval_s and emits each reading.
    """

    def __init__(self, driver: InstrumentDriver, settings: Settings) -> None:
        self._driver = driver
        self._settings = settings
        self._sio = socketio.AsyncClient(reconnection=False, logger=False)
        self._backend_connected = False
        self._reading_count = 0
        self._error_count = 0
        self._last_reading: ImpedanceReading | None = None
        self._start_time = time.monotonic()

        # Register disconnect handler so we know when the backend drops
        @self._sio.event
        async def disconnect():
            self._backend_connected = False
            logger.warning("Disconnected from backend")

    # ── Public entry point ─────────────────────────────────────────────────────

    async def run(self) -> None:
        """
        Main loop: connect backend → connect driver → poll forever.
        Handles Ctrl-C cleanly.
        """
        self._start_time = time.monotonic()

        with Live(self._build_status_panel(), refresh_per_second=2, console=console) as live:
            self._live = live

            try:
                await self._connect_backend()
                await self._connect_driver()
                await self._poll_loop()
            except asyncio.CancelledError:
                pass
            finally:
                await self._shutdown()

    # ── Connection helpers ─────────────────────────────────────────────────────

    async def _connect_backend(self) -> None:
        """Connect to the Socket.IO backend with exponential back-off."""
        for attempt in range(999):
            try:
                logger.info(
                    f"Connecting to backend {self._settings.backend_url} "
                    f"(attempt {attempt + 1})..."
                )
                await self._sio.connect(
                    self._settings.backend_url,
                    transports=["websocket"],
                    wait_timeout=5,
                )
                self._backend_connected = True
                logger.info("Backend connected")
                self._refresh_display()
                return
            except (socketio.exceptions.ConnectionError, Exception) as exc:
                wait = _backoff_seconds(attempt)
                logger.warning(
                    f"Backend connection failed: {exc}. Retrying in {wait}s..."
                )
                await asyncio.sleep(wait)

    async def _connect_driver(self) -> None:
        """Connect to the instrument with exponential back-off."""
        for attempt in range(999):
            try:
                logger.info(
                    f"Connecting to {self._driver.instrument_name} (attempt {attempt + 1})..."
                )
                await self._driver.connect()
                logger.info(f"Instrument connected: {self._driver.instrument_name}")
                self._refresh_display()
                return
            except InstrumentConnectError as exc:
                wait = _backoff_seconds(attempt)
                logger.warning(
                    f"Instrument connection failed: {exc}. Retrying in {wait}s..."
                )
                await asyncio.sleep(wait)

    # ── Poll loop ──────────────────────────────────────────────────────────────

    async def _poll_loop(self) -> None:
        """Poll the driver and emit readings indefinitely."""
        consecutive_errors = 0

        while True:
            loop_start = time.monotonic()

            # Reconnect backend if it dropped
            if not self._backend_connected or not self._sio.connected:
                logger.warning("Backend disconnected — reconnecting...")
                await self._connect_backend()

            try:
                reading = await self._driver.read_once()
                await self._emit_reading(reading)
                self._last_reading = reading
                self._reading_count += 1
                consecutive_errors = 0
                self._refresh_display()

            except InstrumentConnectError as exc:
                # Port went away — reconnect the driver
                logger.error(f"Instrument disconnect: {exc} — reconnecting...")
                consecutive_errors = 0
                await self._connect_driver()

            except InstrumentReadError as exc:
                consecutive_errors += 1
                logger.warning(
                    f"Read error ({consecutive_errors}/{_MAX_CONSECUTIVE_ERRORS}): {exc}"
                )
                if consecutive_errors >= _MAX_CONSECUTIVE_ERRORS:
                    logger.error(
                        f"{_MAX_CONSECUTIVE_ERRORS} consecutive errors — "
                        "reconnecting instrument..."
                    )
                    consecutive_errors = 0
                    await self._connect_driver()

            # Sleep for the remainder of the poll interval
            elapsed = time.monotonic() - loop_start
            sleep_s = max(0.0, self._settings.poll_interval_s - elapsed)
            await asyncio.sleep(sleep_s)

    # ── Emit ───────────────────────────────────────────────────────────────────

    async def _emit_reading(self, reading: ImpedanceReading) -> None:
        """Emit one impedanceReading event to the backend."""
        payload = reading.to_socket_payload()
        try:
            await self._sio.emit(_EVENT_IMPEDANCE_READING, payload)
            logger.debug(
                f"Emitted: Z={reading.zReal:.4g}+j{reading.zImag:.4g} Ω "
                f"@ {reading.freqHz:.0f} Hz"
            )
        except Exception as exc:
            logger.error(f"Emit failed: {exc}")
            self._backend_connected = False

    # ── Shutdown ───────────────────────────────────────────────────────────────

    async def _shutdown(self) -> None:
        """Cleanly disconnect instrument and backend."""
        logger.info("Shutting down bridge...")
        try:
            await self._driver.disconnect()
        except Exception as exc:
            logger.warning(f"Driver disconnect error: {exc}")
        try:
            if self._sio.connected:
                await self._sio.disconnect()
        except Exception as exc:
            logger.warning(f"Socket disconnect error: {exc}")
        logger.info("Bridge stopped.")

    # ── Rich display ───────────────────────────────────────────────────────────

    def _refresh_display(self) -> None:
        if hasattr(self, "_live"):
            self._live.update(self._build_status_panel())

    def _build_status_panel(self) -> Panel:
        elapsed = time.monotonic() - self._start_time
        elapsed_str = _format_elapsed(elapsed)

        table = Table(box=box.SIMPLE, show_header=False, padding=(0, 1))
        table.add_column(style="bold cyan", min_width=18)
        table.add_column()

        backend_status = (
            "[green]Connected[/green]"
            if self._backend_connected
            else "[red]Disconnected[/red]"
        )
        table.add_row("Instrument", f"[yellow]{self._driver.instrument_name}[/yellow]")
        table.add_row("Backend", f"{self._settings.backend_url}  {backend_status}")
        table.add_row("Readings sent", str(self._reading_count))
        table.add_row("Running", elapsed_str)

        if self._last_reading:
            r = self._last_reading
            table.add_row(
                "Last Z",
                f"{r.zReal:.4g} + j{r.zImag:.4g} Ohm  @ {_format_freq(r.freqHz)}",
            )
            if r.conductivity is not None:
                table.add_row("Last σ_e", f"{r.conductivity:.4f} S/m")

        return Panel(
            table,
            title="[bold]ResoPulse Instrument Bridge[/bold]",
            border_style="blue",
        )


def _format_elapsed(seconds: float) -> str:
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    if h:
        return f"{h}h {m:02d}m {s:02d}s"
    if m:
        return f"{m}m {s:02d}s"
    return f"{s}s"


def _format_freq(freq_hz: float) -> str:
    if freq_hz >= 1_000_000:
        return f"{freq_hz / 1_000_000:.4g} MHz"
    if freq_hz >= 1_000:
        return f"{freq_hz / 1_000:.4g} kHz"
    return f"{freq_hz:.4g} Hz"
