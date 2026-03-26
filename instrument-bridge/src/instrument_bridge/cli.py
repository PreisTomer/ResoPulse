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
        case "nanopulse":
            from instrument_bridge.drivers.pulse_biosciences import NanoPulseDriver
            return NanoPulseDriver(settings)
        case "pulse_select":
            from instrument_bridge.drivers.pulse_biosciences import PulseSelectDriver
            return PulseSelectDriver(settings)
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
    type=click.Choice(["demo", "btx", "visa_lcr", "ascii_serial", "nanopulse", "pulse_select"]),
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
    "--pb-host",
    default=None,
    help="Pulse Biosciences instrument IP / hostname, e.g. 192.168.1.100 (overrides BRIDGE_PB_HOST)",
)
@click.option(
    "--pb-tcp-port",
    type=int,
    default=None,
    help="Pulse Biosciences TCP port (overrides BRIDGE_PB_TCP_PORT, default 20000)",
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
    pb_host: Optional[str],
    pb_tcp_port: Optional[int],
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
      # Pulse Biosciences NanoPulse on 192.168.1.50
      instrument-bridge run --driver nanopulse --pb-host 192.168.1.50

    \b
      # Pulse Biosciences PulseSelect on default IP, custom TCP port
      instrument-bridge run --driver pulse_select --pb-tcp-port 20001

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
    if pb_host:
        overrides["pb_host"] = pb_host
    if pb_tcp_port is not None:
        overrides["pb_tcp_port"] = pb_tcp_port
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


# ── ai-service command ─────────────────────────────────────────────────────────

@main.command("ai-service")
@click.option(
    "--host",
    default="127.0.0.1",
    show_default=True,
    help="Host to bind the AI service to (use 0.0.0.0 to expose on LAN)",
)
@click.option(
    "--port",
    type=int,
    default=8000,
    show_default=True,
    help="Port for the AI FastAPI service",
)
@click.option(
    "--reload",
    is_flag=True,
    default=False,
    help="Enable auto-reload on code changes (development only)",
)
@click.option(
    "--log-level",
    type=click.Choice(["critical", "error", "warning", "info", "debug", "trace"], case_sensitive=False),
    default="info",
    show_default=True,
    help="Uvicorn log level",
)
def ai_service(host: str, port: int, reload: bool, log_level: str) -> None:
    """
    Start the ResoPulse AI optimizer FastAPI service.

    Node.js connects to this service via HTTP to request protocol recommendations.
    Set AI_SERVICE_URL=http://<host>:<port> in the Node.js environment.

    Install AI dependencies first:

    \b
        uv sync --extra ai

    Examples:

    \b
      # Local development (Node.js on same machine)
      instrument-bridge ai-service

    \b
      # Expose on LAN (e.g. AI service on a separate GPU machine)
      instrument-bridge ai-service --host 0.0.0.0 --port 8000

    \b
      # Development with auto-reload
      instrument-bridge ai-service --reload
    """
    try:
        import uvicorn
    except ImportError:
        click.echo(
            "[ERROR] uvicorn not installed. Run: uv sync --extra ai",
            err=True,
        )
        raise SystemExit(1)

    console.print(
        f"[bold green]ResoPulse AI Service[/bold green] starting on "
        f"[cyan]http://{host}:{port}[/cyan]\n"
        "[dim]Set AI_SERVICE_URL=http://localhost:8000 in the Node.js backend env.[/dim]\n"
        "[dim]POST /ai/optimize  — get protocol recommendation[/dim]\n"
        "[dim]POST /ai/retrain   — retrain model from outcomes DB[/dim]\n"
        "[dim]GET  /health       — service + model status[/dim]\n"
    )

    uvicorn.run(
        "instrument_bridge.ai.server:app",
        host=host,
        port=port,
        reload=reload,
        log_level=log_level.lower(),
    )


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


# ── seed-demo command ──────────────────────────────────────────────────────────

@main.command("seed-demo")
def seed_demo() -> None:
    """
    Insert synthetic demo outcomes and train the AI model.

    Generates 40 physically realistic outcomes for the default
    hepatocyte-vs-adenocarcinoma cell pair based on the Schwan equation,
    inserts them into the outcomes database, then runs XGBoost training so
    the AI optimizer starts in ML mode (confidence > 0.50) immediately.

    Safe to run multiple times — skips insertion if seed rows already exist.

    Requires the ai extras:

    \b
        uv sync --extra ai

    Examples:

    \b
      # Local: seed and train before starting the AI service
      instrument-bridge seed-demo
      instrument-bridge ai-service
    """
    _configure_logging("INFO")
    try:
        from instrument_bridge.ai.seed import seed_database
        from instrument_bridge.ai.train import DATA_DIR, retrain_model
    except ImportError:
        click.echo("[ERROR] AI extras not installed. Run: uv sync --extra ai", err=True)
        raise SystemExit(1)

    n_inserted = seed_database(DATA_DIR)
    if n_inserted == 0:
        console.print("[yellow]Seed rows already present — skipping insertion.[/yellow]")
    else:
        console.print(f"[green]Inserted {n_inserted} synthetic outcome rows.[/green]")

    console.print("[cyan]Training XGBoost model...[/cyan]")
    n_trained = retrain_model()
    if n_trained > 0:
        console.print(f"[bold green]Model trained on {n_trained} samples. AI service is ready.[/bold green]")
    else:
        console.print("[red]Training failed — check logs above.[/red]")
        raise SystemExit(1)


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
        case "nanopulse" | "pulse_select":
            table.add_row("Instrument host", settings.pb_host)
            table.add_row("TCP port", str(settings.pb_tcp_port))
            table.add_row("TCP timeout", f"{settings.pb_tcp_timeout_s:.1f} s")

    from rich.panel import Panel
    console.print(
        Panel(table, title="[bold]ResoPulse Instrument Bridge — Starting[/bold]", border_style="blue")
    )
    console.print(
        "[dim]Open the ResoPulse UI → Experiment view → Load Monitor → enable Hardware Mode.[/dim]\n"
        "[dim]Press Ctrl-C to stop the bridge cleanly.[/dim]\n"
    )
