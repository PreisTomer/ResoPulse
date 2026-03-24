"""
Command-line interface for the ResoPulse instrument bridge.

Commands
--------
  instrument-bridge run     Start the bridge (reads instrument, emits to backend)
  instrument-bridge probe   List available serial ports and VISA resources

CLI flags override .env values.  Precedence:
  CLI flag  >  BRIDGE_* env var  >  .env file  >  built-in default
"""

import asyncio
import sys
from typing import Optional

import click
from loguru import logger
from rich.console import Console
from rich.table import Table
from rich import box

from instrument_bridge.settings import Settings, DriverName
from instrument_bridge.emitter import BridgeEmitter

console = Console()


# ── Driver factory ─────────────────────────────────────────────────────────────

def _create_driver(settings: Settings):
    """Instantiate the correct driver from the settings.driver value."""
    match settings.driver:
        case "demo":
            from instrument_bridge.drivers.demo import DemoDriver
            return DemoDriver(settings)
        case "btx":
            from instrument_bridge.drivers.btx import BtxDriver
            return BtxDriver(settings)
        case "visa_lcr":
            from instrument_bridge.drivers.visa_lcr import VisaLcrDriver
            return VisaLcrDriver(settings)
        case "ascii_serial":
            from instrument_bridge.drivers.ascii_serial import AsciiSerialDriver
            return AsciiSerialDriver(settings)
        case _:
            # Should not reach here — pydantic validates the driver field
            click.echo(f"Unknown driver: {settings.driver!r}", err=True)
            sys.exit(1)


# ── Logging setup ──────────────────────────────────────────────────────────────

def _configure_logging(level: str) -> None:
    """Configure loguru to output at the requested level."""
    logger.remove()
    logger.add(
        sys.stderr,
        level=level,
        format=(
            "<green>{time:HH:mm:ss}</green> | "
            "<level>{level: <8}</level> | "
            "<cyan>{name}</cyan>:<cyan>{line}</cyan> — <level>{message}</level>"
        ),
        colorize=True,
    )


# ── CLI group ──────────────────────────────────────────────────────────────────

@click.group()
def main():
    """
    ResoPulse instrument bridge.

    Reads impedance from a lab instrument and streams it to the ResoPulse
    backend so the UI displays live cuvette load data during experiments.

    Quick start (no hardware needed):

    \b
        cd instrument-bridge
        uv sync
        cp .env.example .env
        uv run instrument-bridge run --driver demo

    Then open the ResoPulse UI, go to the Experiment view, enable Hardware Mode
    in the Load Monitor panel and watch live impedance readings appear.
    """


# ── run command ────────────────────────────────────────────────────────────────

@main.command()
@click.option(
    "--driver",
    type=click.Choice(["demo", "btx", "visa_lcr", "ascii_serial"]),
    default=None,
    help="Instrument driver (overrides BRIDGE_DRIVER in .env)",
)
@click.option(
    "--backend-url",
    default=None,
    help="Socket.IO backend URL, e.g. http://localhost:3001 (overrides BRIDGE_BACKEND_URL)",
)
@click.option(
    "--port",
    default=None,
    help="Serial port for btx / ascii_serial drivers, e.g. COM3 or /dev/ttyUSB0",
)
@click.option(
    "--visa-resource",
    default=None,
    help="VISA resource string for visa_lcr driver, e.g. GPIB0::17::INSTR",
)
@click.option(
    "--poll",
    type=float,
    default=None,
    help="Poll interval in seconds, e.g. 0.5 (overrides BRIDGE_POLL_INTERVAL_S)",
)
@click.option(
    "--freq",
    type=float,
    default=None,
    help="Measurement frequency in Hz, e.g. 10000 (overrides BRIDGE_MEAS_FREQ_HZ)",
)
@click.option(
    "--log-level",
    type=click.Choice(["TRACE", "DEBUG", "INFO", "WARNING", "ERROR"], case_sensitive=False),
    default=None,
    help="Log verbosity (overrides BRIDGE_LOG_LEVEL)",
)
def run(
    driver: Optional[str],
    backend_url: Optional[str],
    port: Optional[str],
    visa_resource: Optional[str],
    poll: Optional[float],
    freq: Optional[float],
    log_level: Optional[str],
):
    """
    Start the instrument bridge.

    Connects to the instrument, then continuously reads impedance and
    emits readings to the ResoPulse backend via Socket.IO.

    Press Ctrl-C to stop cleanly.

    Examples:

    \b
      # Synthetic demo (no hardware needed)
      instrument-bridge run --driver demo

    \b
      # BTX ECM 830 on Windows COM4
      instrument-bridge run --driver btx --port COM4

    \b
      # Keysight E4980A via GPIB at address 17
      instrument-bridge run --driver visa_lcr --visa-resource "GPIB0::17::INSTR"

    \b
      # DE-5000 ASCII serial on Linux, 2400 baud
      instrument-bridge run --driver ascii_serial --port /dev/ttyUSB0

    \b
      # Connect to a remote ngrok backend
      instrument-bridge run --driver demo --backend-url https://abc123.ngrok.io
    """
    # Load base settings from .env / environment
    settings = Settings()

    # Apply CLI overrides
    overrides: dict = {}
    if driver:
        overrides["driver"] = driver
    if backend_url:
        overrides["backend_url"] = backend_url
    if port:
        overrides["serial_port"] = port
    if visa_resource:
        overrides["visa_resource"] = visa_resource
    if poll is not None:
        overrides["poll_interval_s"] = poll
    if freq is not None:
        overrides["meas_freq_hz"] = freq
    if log_level:
        overrides["log_level"] = log_level.upper()

    if overrides:
        settings = settings.model_copy(update=overrides)

    _configure_logging(settings.log_level)

    # Print startup summary
    _print_startup_summary(settings)

    # Build driver and emitter
    instrument_driver = _create_driver(settings)
    emitter = BridgeEmitter(instrument_driver, settings)

    # Run the async loop
    try:
        asyncio.run(emitter.run())
    except KeyboardInterrupt:
        console.print("\n[yellow]Bridge stopped by user.[/yellow]")


# ── probe command ──────────────────────────────────────────────────────────────

@main.command()
def probe():
    """
    List available serial ports and VISA resources on this machine.

    Use the output to determine the correct --port or --visa-resource
    value for your instrument before starting the bridge.

    Examples:

    \b
      instrument-bridge probe
    """
    _configure_logging("WARNING")  # Suppress info noise during probe

    # ── Serial ports ───────────────────────────────────────────────────────────
    from instrument_bridge.utils.serial_helpers import list_serial_ports

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
        for p in serial_ports:
            table.add_row(p["port"], p["description"], p["hwid"])
        console.print(table)

    # ── VISA resources ─────────────────────────────────────────────────────────
    from instrument_bridge.utils.visa_helpers import list_visa_resources

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


# ── Startup summary ────────────────────────────────────────────────────────────

def _print_startup_summary(settings: Settings) -> None:
    table = Table(box=box.ROUNDED, show_header=False, padding=(0, 1))
    table.add_column(style="bold cyan", min_width=20)
    table.add_column()

    table.add_row("Driver", settings.driver)
    table.add_row("Backend URL", settings.backend_url)
    table.add_row("Poll interval", f"{settings.poll_interval_s:.2f} s")

    match settings.driver:
        case "btx" | "ascii_serial":
            table.add_row("Serial port", settings.serial_port)
            table.add_row("Baud rate", str(settings.baud_rate))
        case "visa_lcr":
            table.add_row("VISA resource", settings.visa_resource)
            table.add_row("Meas. frequency", f"{settings.meas_freq_hz:.0f} Hz")
        case "demo":
            table.add_row(
                "Sweep range",
                f"{settings.demo_freq_min_hz:.0f} – {settings.demo_freq_max_hz:.0f} Hz",
            )
            table.add_row(
                "Cuvette geometry",
                f"{settings.demo_cuvette_gap_mm} mm gap, "
                f"{settings.demo_cuvette_area_cm2} cm² area",
            )

    from rich.panel import Panel
    console.print(
        Panel(table, title="[bold]ResoPulse Instrument Bridge — Starting[/bold]", border_style="blue")
    )
    console.print(
        "[dim]Open the ResoPulse UI → Experiment view → Load Monitor → enable Hardware Mode.[/dim]\n"
        "[dim]Press Ctrl-C to stop the bridge cleanly.[/dim]\n"
    )
