"""
Smoke test for the ResoPulse instrument bridge.

Spins up a minimal Socket.IO server in-process, runs the demo driver
against it, captures 5 readings, validates each packet against the
same rules the real backend uses, then reports pass/fail.

Run with:
    uv run python smoke_test.py

No hardware and no running backend required. The test is self-contained.

Exit codes:
    0  All assertions passed
    1  One or more assertions failed
"""

import asyncio
import sys
import time

# Force UTF-8 output so Rich can render unicode characters (e.g. Ω) on
# Windows terminals that default to a legacy codepage (cp1250, cp1255, etc.)
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")
from dataclasses import dataclass, field

import socketio
from aiohttp import web
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich import box

# ── Config ─────────────────────────────────────────────────────────────────────

TEST_PORT          = 19876           # Ephemeral port, unlikely to conflict
PACKETS_EXPECTED   = 5              # Number of packets to collect
TIMEOUT_S          = 30.0           # Abort if not collected within this time

# Mirror of apps/api/src/socket.ts IMP_BOUNDS
Z_MIN    = 0.01
Z_MAX    = 1_000_000
FREQ_MIN = 1.0
FREQ_MAX = 1_000_000_000.0

console = Console()


# ── Result tracking ────────────────────────────────────────────────────────────

@dataclass
class TestResult:
    name: str
    passed: bool
    detail: str = ""


@dataclass
class TestRun:
    results: list[TestResult] = field(default_factory=list)
    packets_received: list[dict] = field(default_factory=list)

    def record(self, name: str, condition: bool, detail: str = "") -> None:
        self.results.append(TestResult(name=name, passed=condition, detail=detail))

    @property
    def all_passed(self) -> bool:
        return all(r.passed for r in self.results)


# ── Mock Socket.IO server ──────────────────────────────────────────────────────

def build_mock_server(run: TestRun, done_event: asyncio.Event) -> web.Application:
    """Build a minimal aiohttp + socketio server that collects impedanceReading events."""
    sio = socketio.AsyncServer(async_mode="aiohttp", cors_allowed_origins="*")
    app = web.Application()
    sio.attach(app)

    @sio.event
    async def connect(sid, environ):
        pass  # Accept all connections

    @sio.on("impedanceReading")
    async def on_impedance_reading(sid, data):
        run.packets_received.append(data)
        if len(run.packets_received) >= PACKETS_EXPECTED:
            done_event.set()

    return app


# ── Packet validators ──────────────────────────────────────────────────────────

def validate_packet(packet: dict, index: int, run: TestRun, ts_before: int) -> None:
    prefix = f"Packet {index + 1}"

    run.record(
        f"{prefix}: 'zReal' present and numeric",
        isinstance(packet.get("zReal"), (int, float)),
        f"zReal={packet.get('zReal')!r}",
    )
    run.record(
        f"{prefix}: zReal >= {Z_MIN} Ω",
        isinstance(packet.get("zReal"), (int, float)) and packet["zReal"] >= Z_MIN,
        f"zReal={packet.get('zReal'):.6g}" if isinstance(packet.get("zReal"), float) else "",
    )
    run.record(
        f"{prefix}: zReal <= {Z_MAX:,} Ω",
        isinstance(packet.get("zReal"), (int, float)) and packet["zReal"] <= Z_MAX,
        f"zReal={packet.get('zReal'):.6g}" if isinstance(packet.get("zReal"), float) else "",
    )
    run.record(
        f"{prefix}: 'zImag' present and numeric",
        isinstance(packet.get("zImag"), (int, float)),
        f"zImag={packet.get('zImag')!r}",
    )
    run.record(
        f"{prefix}: 'freqHz' in [{FREQ_MIN}, {FREQ_MAX:.0e}] Hz",
        isinstance(packet.get("freqHz"), (int, float))
        and FREQ_MIN <= packet["freqHz"] <= FREQ_MAX,
        f"freqHz={packet.get('freqHz')!r}",
    )
    run.record(
        f"{prefix}: 'timestamp' is a recent Unix ms",
        isinstance(packet.get("timestamp"), int)
        and packet["timestamp"] >= ts_before
        and packet["timestamp"] <= ts_before + 5000,
        f"timestamp={packet.get('timestamp')!r}",
    )

    # conductivity is optional — only validate if present
    if "conductivity" in packet:
        run.record(
            f"{prefix}: conductivity in [0, 100] S/m if present",
            isinstance(packet["conductivity"], (int, float))
            and 0.0 <= packet["conductivity"] <= 100.0,
            f"conductivity={packet.get('conductivity')!r}",
        )


# ── Main test orchestrator ─────────────────────────────────────────────────────

async def run_smoke_test() -> TestRun:
    run = TestRun()
    done_event = asyncio.Event()

    # ── Start mock server ──────────────────────────────────────────────────────
    app = build_mock_server(run, done_event)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "localhost", TEST_PORT)
    await site.start()

    # ── Start bridge demo driver ───────────────────────────────────────────────
    from instrument_bridge.settings import Settings
    from instrument_bridge.drivers.demo import DemoDriver
    from instrument_bridge.emitter import BridgeEmitter

    settings = Settings(
        backend_url=f"http://localhost:{TEST_PORT}",
        driver="demo",
        poll_interval_s=0.2,   # Fast polling to collect 5 packets quickly
        demo_freq_min_hz=1_000.0,
        demo_freq_max_hz=1_000_000.0,
        log_level="WARNING",   # Suppress emitter logs during the test
    )
    driver = DemoDriver(settings)
    emitter = BridgeEmitter(driver, settings)

    # Record the timestamp just before we start so we can validate packet timestamps
    ts_before = int(time.time() * 1000)

    # Run the emitter in the background until we have enough packets or timeout
    emitter_task = asyncio.create_task(emitter.run())

    try:
        await asyncio.wait_for(done_event.wait(), timeout=TIMEOUT_S)
    except asyncio.TimeoutError:
        run.record(
            f"Collected {PACKETS_EXPECTED} packets within {TIMEOUT_S}s",
            False,
            f"Only received {len(run.packets_received)} packets",
        )
    else:
        run.record(
            f"Collected {PACKETS_EXPECTED} packets within {TIMEOUT_S}s",
            True,
            f"{len(run.packets_received)} packets received",
        )

    emitter_task.cancel()
    try:
        await emitter_task
    except (asyncio.CancelledError, Exception):
        pass

    await runner.cleanup()

    # ── Validate collected packets ─────────────────────────────────────────────
    for i, packet in enumerate(run.packets_received[:PACKETS_EXPECTED]):
        validate_packet(packet, i, run, ts_before)

    return run


# ── Reporter ───────────────────────────────────────────────────────────────────

def print_report(run: TestRun) -> None:
    table = Table(box=box.ROUNDED, show_header=True, header_style="bold")
    table.add_column("Test", min_width=55)
    table.add_column("Result", min_width=8)
    table.add_column("Detail", style="dim")

    for r in run.results:
        icon   = "[green]PASS[/green]" if r.passed else "[red]FAIL[/red]"
        table.add_row(r.name, icon, r.detail)

    passed = sum(1 for r in run.results if r.passed)
    total  = len(run.results)
    summary_color = "green" if run.all_passed else "red"
    summary = f"[{summary_color}]{passed}/{total} assertions passed[/{summary_color}]"

    console.print()
    console.print(
        Panel(
            table,
            title="[bold]ResoPulse Bridge Smoke Test[/bold]",
            subtitle=summary,
            border_style=summary_color,
        )
    )

    if run.packets_received:
        console.print("\n[dim]Sample packet (first received):[/dim]")
        import json
        console.print(
            f"[cyan]{json.dumps(run.packets_received[0], indent=2)}[/cyan]"
        )
    console.print()


# ── Entry point ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    console.print(
        Panel(
            "Running demo driver against a local mock Socket.IO server.\n"
            "No hardware and no running backend required.",
            title="[bold]ResoPulse Bridge Smoke Test[/bold]",
            border_style="blue",
        )
    )

    run = asyncio.run(run_smoke_test())
    print_report(run)
    sys.exit(0 if run.all_passed else 1)
