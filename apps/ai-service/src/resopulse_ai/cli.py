# Copyright © 2026 Tomer Preis. Licensed under the MIT License.
"""Command-line interface for the ResoPulse AI optimizer service."""

import click
from rich.console import Console

console = Console()


AI_SERVICE_DEFAULT_HOST = "127.0.0.1"
AI_SERVICE_DEFAULT_PORT = 8000
AI_SERVICE_DEFAULT_LOG_LEVEL = "info"
AI_SERVICE_LOG_LEVEL_CHOICES = ["critical", "error", "warning", "info", "debug", "trace"]


@click.group()
def main() -> None:
    """
    ResoPulse AI protocol optimizer.

    FastAPI + XGBoost service that Node.js calls over HTTP for protocol
    recommendations. Physics is pre-computed by the frontend; this service
    is ML-only.

    Quick start:

    \b
        cd apps/ai-service
        uv sync
        uv run resopulse-ai seed-demo   # optional — pre-populates training data
        uv run resopulse-ai serve
    """


@main.command("serve")
@click.option(
    "--host",
    default=AI_SERVICE_DEFAULT_HOST,
    show_default=True,
    help="Host to bind the AI service to (use 0.0.0.0 to expose on LAN)",
)
@click.option(
    "--port",
    type=int,
    default=AI_SERVICE_DEFAULT_PORT,
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
    type=click.Choice(AI_SERVICE_LOG_LEVEL_CHOICES, case_sensitive=False),
    default=AI_SERVICE_DEFAULT_LOG_LEVEL,
    show_default=True,
    help="Uvicorn log level",
)
def serve(host: str, port: int, reload: bool, log_level: str) -> None:
    """
    Start the ResoPulse AI optimizer FastAPI service.

    Node.js connects to this service via HTTP to request protocol recommendations.
    Set AI_SERVICE_URL=http://<host>:<port> in the Node.js environment.

    Examples:

    \b
      # Local development (Node.js on same machine)
      resopulse-ai serve

    \b
      # Expose on LAN (e.g. AI service on a separate GPU machine)
      resopulse-ai serve --host 0.0.0.0 --port 8000

    \b
      # Development with auto-reload
      resopulse-ai serve --reload
    """
    import uvicorn

    console.print(
        f"[bold green]ResoPulse AI Service[/bold green] starting on "
        f"[cyan]http://{host}:{port}[/cyan]\n"
        "[dim]Set AI_SERVICE_URL=http://localhost:8000 in the Node.js backend env.[/dim]\n"
        "[dim]POST /ai/optimize  — get protocol recommendation[/dim]\n"
        "[dim]POST /ai/retrain   — retrain model from outcomes DB[/dim]\n"
        "[dim]GET  /health       — service + model status[/dim]\n"
    )

    uvicorn.run(
        "resopulse_ai.server:app",
        host=host,
        port=port,
        reload=reload,
        log_level=log_level.lower(),
    )


@main.command("seed-demo")
def seed_demo() -> None:
    """
    Insert synthetic demo outcomes and train the AI model.

    Generates 40 physically realistic outcomes for the default
    hepatocyte-vs-adenocarcinoma cell pair based on the Schwan equation,
    inserts them into the outcomes database, then runs XGBoost training so
    the AI optimizer starts in ML mode (confidence > 0.50) immediately.

    Safe to run multiple times — skips insertion if seed rows already exist.

    Examples:

    \b
      # Local: seed and train before starting the AI service
      resopulse-ai seed-demo
      resopulse-ai serve
    """
    import logging
    logging.basicConfig(level=logging.INFO)

    from resopulse_ai.seed import seed_database
    from resopulse_ai.train import DATA_DIR, retrain_model

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
