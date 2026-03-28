# Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.
"""AI service command registration for the instrument bridge CLI."""

import click
from rich.console import Console

from instrument_bridge.commands.constants import (
    AI_SERVICE_DEFAULT_HOST,
    AI_SERVICE_DEFAULT_LOG_LEVEL,
    AI_SERVICE_DEFAULT_PORT,
    AI_SERVICE_LOG_LEVEL_CHOICES,
)

console = Console()


def register_ai_service_command(main: click.Group) -> None:
    """Attach the ai-service command to the root Click group."""

    @main.command("ai-service")
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
