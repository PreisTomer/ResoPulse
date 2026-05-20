# Copyright © 2026 Tomer Preis. Licensed under the MIT License.
"""Run command registration for the instrument bridge CLI."""

import asyncio
from collections.abc import Callable

import click
from rich.console import Console

from instrument_bridge.commands.drivers import create_driver
from instrument_bridge.commands.options import apply_run_options
from instrument_bridge.commands.startup_summary import print_startup_summary
from instrument_bridge.emitter import BridgeEmitter
from instrument_bridge.settings import Settings
from instrument_bridge.settings.overrides import build_run_overrides

console = Console()


def register_run_command(main: click.Group, configure_logging: Callable[[str], None]) -> None:
    """Attach the run command to the root Click group."""

    @main.command()
    @apply_run_options
    def run(
        driver: str | None,
        backend_url: str | None,
        port: str | None,
        visa_resource: str | None,
        poll: float | None,
        freq: float | None,
        pb_host: str | None,
        pb_tcp_port: int | None,
        log_level: str | None,
    ) -> None:
        """
        Start the instrument bridge.

        Connects to the instrument, then continuously reads impedance and
        emits readings to the SimBiotix backend via Socket.IO.

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
        settings = Settings()
        overrides = build_run_overrides(
            driver=driver,
            backend_url=backend_url,
            port=port,
            visa_resource=visa_resource,
            poll=poll,
            freq=freq,
            pb_host=pb_host,
            pb_tcp_port=pb_tcp_port,
            log_level=log_level,
        )

        if overrides:
            settings = settings.model_copy(update=overrides)

        logging_config = settings.logging_config

        configure_logging(logging_config.level)
        print_startup_summary(settings)

        instrument_driver = create_driver(settings)
        emitter = BridgeEmitter(instrument_driver, settings)

        try:
            asyncio.run(emitter.run())
        except KeyboardInterrupt:
            console.print("\n[yellow]Bridge stopped by user.[/yellow]")
