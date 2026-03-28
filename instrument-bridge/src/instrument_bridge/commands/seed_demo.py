# Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.
"""Seed demo command registration for the instrument bridge CLI."""

from collections.abc import Callable

import click
from rich.console import Console

console = Console()


def register_seed_demo_command(main: click.Group, configure_logging: Callable[[str], None]) -> None:
    """Attach the seed-demo command to the root Click group."""

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
        configure_logging("INFO")
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
