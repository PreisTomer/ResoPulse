# Copyright © 2026 Tomer Preis. Licensed under the MIT License.
"""Probe command registration for the instrument bridge CLI."""

from collections.abc import Callable

import click
from rich import box
from rich.console import Console
from rich.table import Table

console = Console()


def register_probe_command(main: click.Group, configure_logging: Callable[[str], None]) -> None:
    """Attach the probe command to the root Click group."""

    @main.command()
    def probe() -> None:
        """
        List available serial ports and VISA resources on this machine.

        Use the output to determine the correct --port or --visa-resource
        value for your instrument before starting the bridge.

        Examples:

        \b
          instrument-bridge probe
        """
        configure_logging("WARNING")

        from instrument_bridge.utils.serial_helpers import list_serial_ports
        from instrument_bridge.utils.visa_helpers import list_visa_resources

        serial_ports = list_serial_ports()
        console.print()
        console.rule("[bold cyan]Serial Ports[/bold cyan]")

        if not serial_ports:
            console.print(
                "[dim]No serial ports found or pyserial not installed.[/dim]\n"
                "Install with:  uv sync --extra serial"
            )
        else:
            table = Table(box=box.ROUNDED, show_header=True)
            table.add_column("Port", style="green")
            table.add_column("Description")
            table.add_column("Hardware ID", style="dim")
            for port in serial_ports:
                table.add_row(port["port"], port["description"], port["hwid"])
            console.print(table)

        console.rule("[bold cyan]VISA Resources[/bold cyan]")
        visa_resources = list_visa_resources()

        if not visa_resources:
            console.print(
                "[dim]No VISA resources found or pyvisa not installed.[/dim]\n"
                "Install with:  uv sync --extra visa\n"
                "You also need a VISA backend: NI-VISA, Keysight IO, or pyvisa-py."
            )
        else:
            table = Table(box=box.ROUNDED, show_header=True)
            table.add_column("VISA Resource String", style="green")
            for resource in visa_resources:
                table.add_row(resource)
            console.print(table)

        console.print()
