# Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.
"""Command-line interface entry point for the ResoPulse instrument bridge."""

import sys

import click
from loguru import logger

from instrument_bridge.commands.probe import register_probe_command
from instrument_bridge.commands.run import register_run_command


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


register_run_command(main, _configure_logging)
register_probe_command(main, _configure_logging)
