# Copyright © 2026 Tomer Preis. Licensed under the MIT License.
"""Runtime state for the instrument bridge emitter."""

import time
from dataclasses import dataclass, field

from instrument_bridge.models import ImpedanceReading


@dataclass
class BridgeRuntimeState:
    """Mutable runtime state tracked while the bridge is running."""

    is_backend_connected: bool = False
    readings_sent: int = 0
    last_reading: ImpedanceReading | None = None
    started_at: float = field(default_factory=time.monotonic)

    def restart_clock(self) -> None:
        """Reset the runtime clock when a new bridge session starts."""
        self.started_at = time.monotonic()

    def record_reading(self, reading: ImpedanceReading) -> None:
        """Store the last reading and increment the sent counter."""
        self.last_reading = reading
        self.readings_sent += 1
