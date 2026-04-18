# Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.
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

from loguru import logger
from rich.live import Live

from instrument_bridge.drivers.base import (
    InstrumentDriver,
    InstrumentConnectError,
    InstrumentReadError,
)
from instrument_bridge.models import ImpedanceReading
from instrument_bridge.settings import Settings

from .backend_socket import BackendSocketClient
from .bridge_runtime import BridgeRuntimeState
from .constants import BACKOFF_MAX_S, MAX_CONSECUTIVE_ERRORS, MAX_RETRY_ATTEMPTS
from .status_display import BridgeStatusDisplay, console


def _backoff_seconds(attempt: int) -> float:
    """Return capped exponential back-off: 1, 2, 4, 8, 16, 30, 30, ..."""
    return min(2 ** attempt, BACKOFF_MAX_S)


class BridgeEmitter:
    """
    Connects to the ResoPulse backend and the instrument driver, then
    polls the driver at poll_interval_s and emits each reading.
    """

    def __init__(self, driver: InstrumentDriver, settings: Settings) -> None:
        self._driver = driver
        self._settings = settings
        self._connection_settings = settings.connection
        self._measurement_settings = settings.measurement
        self._state = BridgeRuntimeState()
        self._status_display = BridgeStatusDisplay()
        self._live: Live | None = None
        self._backend_client = BackendSocketClient(
            backend_url=self._connection_settings.backend_url,
            on_disconnect=self._handle_backend_disconnect,
        )

    # ── Public entry point ─────────────────────────────────────────────────────

    async def run(self) -> None:
        """
        Main loop: connect backend → connect driver → poll forever.
        Handles Ctrl-C cleanly.
        """
        self._state.restart_clock()

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
        for attempt in range(MAX_RETRY_ATTEMPTS):
            try:
                logger.info(
                    f"Connecting to backend {self._connection_settings.backend_url} "
                    f"(attempt {attempt + 1})..."
                )
                await self._backend_client.connect()
                self._state.is_backend_connected = True
                logger.info("Backend connected")
                self._refresh_display()
                return
            except Exception as exc:
                wait = _backoff_seconds(attempt)
                logger.warning(
                    f"Backend connection failed: {exc}. Retrying in {wait}s..."
                )
                await asyncio.sleep(wait)

    async def _connect_driver(self) -> None:
        """Connect to the instrument with exponential back-off."""
        for attempt in range(MAX_RETRY_ATTEMPTS):
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
            loop_start = asyncio.get_running_loop().time()

            # Reconnect backend if it dropped
            if not self._state.is_backend_connected or not self._backend_client.connected:
                logger.warning("Backend disconnected — reconnecting...")
                await self._connect_backend()

            try:
                reading = await self._driver.read_once()
                await self._emit_reading(reading)
                self._state.record_reading(reading)
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
                    f"Read error ({consecutive_errors}/{MAX_CONSECUTIVE_ERRORS}): {exc}"
                )
                if consecutive_errors >= MAX_CONSECUTIVE_ERRORS:
                    logger.error(
                        f"{MAX_CONSECUTIVE_ERRORS} consecutive errors — "
                        "reconnecting instrument..."
                    )
                    consecutive_errors = 0
                    await self._connect_driver()

            # Sleep for the remainder of the poll interval
            elapsed = asyncio.get_running_loop().time() - loop_start
            sleep_s = max(0.0, self._measurement_settings.poll_interval_s - elapsed)
            await asyncio.sleep(sleep_s)

    # ── Emit ───────────────────────────────────────────────────────────────────

    async def _emit_reading(self, reading: ImpedanceReading) -> None:
        """Emit one impedanceReading event to the backend."""
        try:
            await self._backend_client.emit_reading(reading)
            logger.debug(
                f"Emitted: Z={reading.zReal:.4g}+j{reading.zImag:.4g} Ω "
                f"@ {reading.freqHz:.0f} Hz"
            )
        except Exception as exc:
            logger.error(f"Emit failed: {exc}")
            self._state.is_backend_connected = False

    # ── Shutdown ───────────────────────────────────────────────────────────────

    async def _shutdown(self) -> None:
        """Cleanly disconnect instrument and backend."""
        logger.info("Shutting down bridge...")
        try:
            await self._driver.disconnect()
        except Exception as exc:
            logger.warning(f"Driver disconnect error: {exc}")
        try:
            await self._backend_client.disconnect()
        except Exception as exc:
            logger.warning(f"Socket disconnect error: {exc}")
        logger.info("Bridge stopped.")

    # ── Rich display ───────────────────────────────────────────────────────────

    def _refresh_display(self) -> None:
        if self._live is not None:
            self._live.update(self._build_status_panel())

    def _build_status_panel(self):
        return self._status_display.build_panel(
            state=self._state,
            instrument_name=self._driver.instrument_name,
            settings=self._settings,
        )

    def _handle_backend_disconnect(self) -> None:
        self._state.is_backend_connected = False
        self._refresh_display()
