# Copyright © 2026 Tomer Preis. Licensed under the MIT License.
"""Socket.IO transport wrapper used by the bridge emitter."""

from collections.abc import Callable

import socketio
from loguru import logger

from instrument_bridge.models import ImpedanceReading

from .constants import EVENT_IMPEDANCE_READING, SOCKET_WAIT_TIMEOUT_S


class BackendSocketClient:
    """Own the backend Socket.IO connection and impedance event emission."""

    def __init__(
        self,
        backend_url: str,
        on_disconnect: Callable[[], None] | None = None,
    ) -> None:
        self._backend_url = backend_url
        self._on_disconnect = on_disconnect
        self._socket = socketio.AsyncClient(reconnection=False, logger=False)

        @self._socket.event
        async def disconnect() -> None:
            logger.warning("Disconnected from backend")
            if self._on_disconnect is not None:
                self._on_disconnect()

    @property
    def connected(self) -> bool:
        """Return whether the underlying Socket.IO client is connected."""
        return self._socket.connected

    async def connect(self) -> None:
        """Connect to the configured backend over websocket."""
        await self._socket.connect(
            self._backend_url,
            transports=["websocket"],
            wait_timeout=SOCKET_WAIT_TIMEOUT_S,
        )

    async def emit_reading(self, reading: ImpedanceReading) -> None:
        """Emit a validated impedance reading to the backend."""
        await self._socket.emit(EVENT_IMPEDANCE_READING, reading.to_socket_payload())

    async def disconnect(self) -> None:
        """Disconnect from the backend if connected."""
        if self._socket.connected:
            await self._socket.disconnect()
