# Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.
"""Rich startup summary rendering for bridge commands."""

from rich import box
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from instrument_bridge.settings import Settings

console = Console()


def print_startup_summary(settings: Settings) -> None:
	"""Render the bridge startup summary panel."""
	connection = settings.connection
	driver = settings.driver_config
	measurement = settings.measurement
	serial = settings.serial
	visa = settings.visa
	demo = settings.demo
	pulse_biosciences = settings.pulse_biosciences

	table = Table(box=box.ROUNDED, show_header=False, padding=(0, 1))
	table.add_column(style="bold cyan", min_width=20)
	table.add_column()

	table.add_row("Driver", driver.name)
	table.add_row("Backend URL", connection.backend_url)
	table.add_row("Poll interval", f"{measurement.poll_interval_s:.2f} s")

	match driver.name:
		case "btx" | "ascii_serial":
			table.add_row("Serial port", serial.port)
			table.add_row("Baud rate", str(serial.baud_rate))
		case "visa_lcr":
			table.add_row("VISA resource", visa.resource)
			table.add_row("Meas. frequency", f"{measurement.freq_hz:.0f} Hz")
		case "demo":
			table.add_row(
				"Sweep range",
				f"{demo.freq_min_hz:.0f} – {demo.freq_max_hz:.0f} Hz",
			)
			table.add_row(
				"Cuvette geometry",
				f"{demo.cuvette_gap_mm} mm gap, "
				f"{demo.cuvette_area_cm2} cm² area",
			)
		case "nanopulse" | "pulse_select":
			table.add_row("Instrument host", pulse_biosciences.host)
			table.add_row("TCP port", str(pulse_biosciences.tcp_port))
			table.add_row("TCP timeout", f"{pulse_biosciences.tcp_timeout_s:.1f} s")

	console.print(
		Panel(table, title="[bold]ResoPulse Instrument Bridge — Starting[/bold]", border_style="blue")
	)
	console.print(
		"[dim]Open the ResoPulse UI → Experiment view → Load Monitor → enable Hardware Mode.[/dim]\n"
		"[dim]Press Ctrl-C to stop the bridge cleanly.[/dim]\n"
	)
