# Copyright © 2026 Tomer Preis. Licensed under the MIT License.
"""Rich status panel rendering for the instrument bridge."""

import time

from rich import box
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from instrument_bridge.settings import Settings

from .bridge_runtime import BridgeRuntimeState

console = Console()


class BridgeStatusDisplay:
    """Build the Rich panel shown while the bridge is running."""

    def build_panel(
        self,
        state: BridgeRuntimeState,
        instrument_name: str,
        settings: Settings,
    ) -> Panel:
        """Render the current bridge state into a Rich panel."""
        connection = settings.connection
        elapsed = time.monotonic() - state.started_at
        elapsed_str = _format_elapsed(elapsed)

        table = Table(box=box.SIMPLE, show_header=False, padding=(0, 1))
        table.add_column(style="bold cyan", min_width=18)
        table.add_column()

        backend_status = (
            "[green]Connected[/green]"
            if state.is_backend_connected
            else "[red]Disconnected[/red]"
        )
        table.add_row("Instrument", f"[yellow]{instrument_name}[/yellow]")
        table.add_row("Backend", f"{connection.backend_url}  {backend_status}")
        table.add_row("Readings sent", str(state.readings_sent))
        table.add_row("Running", elapsed_str)

        if state.last_reading is not None:
            reading = state.last_reading
            table.add_row(
                "Last Z",
                f"{reading.zReal:.4g} + j{reading.zImag:.4g} Ohm  @ {_format_freq(reading.freqHz)}",
            )
            if reading.conductivity is not None:
                table.add_row("Last σ_e", f"{reading.conductivity:.4f} S/m")

        return Panel(
            table,
            title="[bold]SimBiotix Instrument Bridge[/bold]",
            border_style="blue",
        )


def _format_elapsed(seconds: float) -> str:
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    remaining_seconds = int(seconds % 60)
    if hours:
        return f"{hours}h {minutes:02d}m {remaining_seconds:02d}s"
    if minutes:
        return f"{minutes}m {remaining_seconds:02d}s"
    return f"{remaining_seconds}s"


def _format_freq(freq_hz: float) -> str:
    if freq_hz >= 1_000_000:
        return f"{freq_hz / 1_000_000:.4g} MHz"
    if freq_hz >= 1_000:
        return f"{freq_hz / 1_000:.4g} kHz"
    return f"{freq_hz:.4g} Hz"
