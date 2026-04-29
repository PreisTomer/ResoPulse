# Copyright © 2026 Tomer Preis. Licensed under the MIT License.
"""Reusable Click option helpers for bridge CLI commands."""

from collections.abc import Callable
from typing import Any, TypeVar

import click

from instrument_bridge.commands.constants import BRIDGE_LOG_LEVEL_CHOICES, DRIVER_CHOICES

CommandFunction = TypeVar("CommandFunction", bound=Callable[..., Any])

RUN_OPTION_DECORATORS = [
    click.option(
        "--driver",
        type=click.Choice(DRIVER_CHOICES),
        default=None,
        help="Instrument driver (overrides BRIDGE_DRIVER in .env)",
    ),
    click.option(
        "--backend-url",
        default=None,
        help="Socket.IO backend URL, e.g. http://localhost:3001 (overrides BRIDGE_BACKEND_URL)",
    ),
    click.option(
        "--port",
        default=None,
        help="Serial port for btx / ascii_serial drivers, e.g. COM3 or /dev/ttyUSB0",
    ),
    click.option(
        "--visa-resource",
        default=None,
        help="VISA resource string for visa_lcr driver, e.g. GPIB0::17::INSTR",
    ),
    click.option(
        "--poll",
        type=float,
        default=None,
        help="Poll interval in seconds, e.g. 0.5 (overrides BRIDGE_POLL_INTERVAL_S)",
    ),
    click.option(
        "--freq",
        type=float,
        default=None,
        help="Measurement frequency in Hz, e.g. 10000 (overrides BRIDGE_MEAS_FREQ_HZ)",
    ),
    click.option(
        "--pb-host",
        default=None,
        help="Pulse Biosciences instrument IP / hostname, e.g. 192.168.1.100 (overrides BRIDGE_PB_HOST)",
    ),
    click.option(
        "--pb-tcp-port",
        type=int,
        default=None,
        help="Pulse Biosciences TCP port (overrides BRIDGE_PB_TCP_PORT, default 20000)",
    ),
    click.option(
        "--log-level",
        type=click.Choice(BRIDGE_LOG_LEVEL_CHOICES, case_sensitive=False),
        default=None,
        help="Log verbosity (overrides BRIDGE_LOG_LEVEL)",
    ),
]


def apply_run_options(command: CommandFunction) -> CommandFunction:
    """Apply the shared run command Click options to a command function."""
    decorated_command = command
    for option_decorator in reversed(RUN_OPTION_DECORATORS):
        decorated_command = option_decorator(decorated_command)
    return decorated_command
