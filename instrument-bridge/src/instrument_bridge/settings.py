"""
Application settings loaded from environment variables and an optional .env file.

Precedence (highest to lowest):
  1. CLI flags (applied via settings.model_copy(update={...}) in cli.py)
  2. Environment variables with the BRIDGE_ prefix
  3. Values in the .env file
  4. Field defaults defined here

The bridge fails loudly at startup if required settings are missing or out of
range — better a clear validation error before any hardware is touched than
silent misbehaviour mid-experiment.
"""

from typing import Literal
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


DriverName = Literal["demo", "btx", "visa_lcr", "ascii_serial", "nanopulse", "pulse_select"]
LogLevel    = Literal["TRACE", "DEBUG", "INFO", "WARNING", "ERROR"]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="BRIDGE_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── Connection ─────────────────────────────────────────────────────────────
    backend_url: str = Field(
        default="http://localhost:3001",
        description="Socket.IO backend URL (must include scheme, no trailing slash)",
    )

    # ── Driver ────────────────────────────────────────────────────────────────
    driver: DriverName = Field(
        default="demo",
        description="Instrument driver: demo | btx | visa_lcr | ascii_serial",
    )

    # ── Serial ────────────────────────────────────────────────────────────────
    serial_port: str = Field(
        default="COM3",
        description="Serial port for btx and ascii_serial drivers",
    )
    baud_rate: int = Field(
        default=9600,
        description="Serial baud rate",
    )

    # ── VISA ──────────────────────────────────────────────────────────────────
    visa_resource: str = Field(
        default="GPIB0::17::INSTR",
        description="VISA resource string for visa_lcr driver",
    )

    # ── Measurement ───────────────────────────────────────────────────────────
    meas_freq_hz: float = Field(
        default=1_000.0,
        ge=1.0,
        le=1_000_000_000.0,
        description="Commanded measurement frequency [Hz]",
    )
    poll_interval_s: float = Field(
        default=1.0,
        ge=0.05,
        le=60.0,
        description="Time between readings [seconds]",
    )

    # ── Demo driver ───────────────────────────────────────────────────────────
    demo_freq_min_hz: float = Field(
        default=100.0,
        ge=1.0,
        description="Demo sweep lower bound [Hz]",
    )
    demo_freq_max_hz: float = Field(
        default=10_000_000.0,
        le=1_000_000_000.0,
        description="Demo sweep upper bound [Hz]",
    )
    demo_cuvette_gap_mm: float = Field(
        default=4.0,
        ge=0.5,
        le=20.0,
        description="Demo cuvette electrode gap [mm]",
    )
    demo_cuvette_area_cm2: float = Field(
        default=0.5,
        ge=0.01,
        le=10.0,
        description="Demo cuvette electrode cross-section [cm²]",
    )

    # ── Pulse Biosciences (NanoPulse / PulseSelect) ───────────────────────────
    pb_host: str = Field(
        default="192.168.1.100",
        description="IP address or hostname of the Pulse Biosciences instrument",
    )
    pb_tcp_port: int = Field(
        default=20000,
        ge=1,
        le=65535,
        description="TCP port on the Pulse Biosciences instrument (default 20000)",
    )
    pb_tcp_timeout_s: float = Field(
        default=5.0,
        ge=1.0,
        le=30.0,
        description="TCP connect/read timeout [seconds] for Pulse Biosciences drivers",
    )

    # ── Logging ───────────────────────────────────────────────────────────────
    log_level: LogLevel = Field(
        default="INFO",
        description="Loguru log level",
    )

    @field_validator("backend_url")
    @classmethod
    def validate_backend_url(cls, value: str) -> str:
        url = value.rstrip("/")
        if not (url.startswith("http://") or url.startswith("https://")):
            raise ValueError(
                f"BRIDGE_BACKEND_URL must start with http:// or https://, got: {value!r}"
            )
        return url
