# Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.
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

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from .constants import (
    ALLOWED_BACKEND_URL_SCHEMES,
    DEFAULT_BACKEND_URL,
    DEFAULT_BAUD_RATE,
    DEFAULT_DEMO_CUVETTE_AREA_CM2,
    DEFAULT_DEMO_CUVETTE_GAP_MM,
    DEFAULT_DEMO_FREQ_MAX_HZ,
    DEFAULT_DEMO_FREQ_MIN_HZ,
    DEFAULT_DRIVER,
    DEFAULT_LOG_LEVEL,
    DEFAULT_MEAS_FREQ_HZ,
    DEFAULT_PB_HOST,
    DEFAULT_PB_TCP_PORT,
    DEFAULT_PB_TCP_TIMEOUT_S,
    DEFAULT_POLL_INTERVAL_S,
    DEFAULT_SERIAL_PORT,
    DEFAULT_VISA_RESOURCE,
    SETTINGS_ENV_FILE,
    SETTINGS_ENV_FILE_ENCODING,
    SETTINGS_ENV_PREFIX,
    SETTINGS_EXTRA_POLICY,
)
from .models import (
    ConnectionSettings,
    DemoSettings,
    DriverName,
    DriverSettings,
    LogLevel,
    LoggingSettings,
    MeasurementSettings,
    PulseBiosciencesSettings,
    SerialSettings,
    VisaSettings,
)


class Settings(BaseSettings):
    """Bridge settings loaded from CLI overrides, env vars, and .env."""

    model_config = SettingsConfigDict(
        env_prefix=SETTINGS_ENV_PREFIX,
        env_file=SETTINGS_ENV_FILE,
        env_file_encoding=SETTINGS_ENV_FILE_ENCODING,
        extra=SETTINGS_EXTRA_POLICY,
    )

    # ── Connection ─────────────────────────────────────────────────────────────
    backend_url: str = Field(
        default=DEFAULT_BACKEND_URL,
        description="Socket.IO backend URL (must include scheme, no trailing slash)",
    )

    # ── Driver ────────────────────────────────────────────────────────────────
    driver: DriverName = Field(
        default=DEFAULT_DRIVER,
        description="Instrument driver: demo | btx | visa_lcr | ascii_serial",
    )

    # ── Serial ────────────────────────────────────────────────────────────────
    serial_port: str = Field(
        default=DEFAULT_SERIAL_PORT,
        description="Serial port for btx and ascii_serial drivers",
    )
    baud_rate: int = Field(
        default=DEFAULT_BAUD_RATE,
        description="Serial baud rate",
    )

    # ── VISA ──────────────────────────────────────────────────────────────────
    visa_resource: str = Field(
        default=DEFAULT_VISA_RESOURCE,
        description="VISA resource string for visa_lcr driver",
    )

    # ── Measurement ───────────────────────────────────────────────────────────
    meas_freq_hz: float = Field(
        default=DEFAULT_MEAS_FREQ_HZ,
        ge=1.0,
        le=1_000_000_000.0,
        description="Commanded measurement frequency [Hz]",
    )
    poll_interval_s: float = Field(
        default=DEFAULT_POLL_INTERVAL_S,
        ge=0.05,
        le=60.0,
        description="Time between readings [seconds]",
    )

    # ── Demo driver ───────────────────────────────────────────────────────────
    demo_freq_min_hz: float = Field(
        default=DEFAULT_DEMO_FREQ_MIN_HZ,
        ge=1.0,
        description="Demo sweep lower bound [Hz]",
    )
    demo_freq_max_hz: float = Field(
        default=DEFAULT_DEMO_FREQ_MAX_HZ,
        le=1_000_000_000.0,
        description="Demo sweep upper bound [Hz]",
    )
    demo_cuvette_gap_mm: float = Field(
        default=DEFAULT_DEMO_CUVETTE_GAP_MM,
        ge=0.5,
        le=20.0,
        description="Demo cuvette electrode gap [mm]",
    )
    demo_cuvette_area_cm2: float = Field(
        default=DEFAULT_DEMO_CUVETTE_AREA_CM2,
        ge=0.01,
        le=10.0,
        description="Demo cuvette electrode cross-section [cm²]",
    )

    # ── Pulse Biosciences (NanoPulse / PulseSelect) ───────────────────────────
    pb_host: str = Field(
        default=DEFAULT_PB_HOST,
        description="IP address or hostname of the Pulse Biosciences instrument",
    )
    pb_tcp_port: int = Field(
        default=DEFAULT_PB_TCP_PORT,
        ge=1,
        le=65535,
        description="TCP port on the Pulse Biosciences instrument (default 20000)",
    )
    pb_tcp_timeout_s: float = Field(
        default=DEFAULT_PB_TCP_TIMEOUT_S,
        ge=1.0,
        le=30.0,
        description="TCP connect/read timeout [seconds] for Pulse Biosciences drivers",
    )

    # ── Logging ───────────────────────────────────────────────────────────────
    log_level: LogLevel = Field(
        default=DEFAULT_LOG_LEVEL,
        description="Loguru log level",
    )

    @field_validator("backend_url")
    @classmethod
    def validate_backend_url(cls, value: str) -> str:
        url = value.rstrip("/")
        if not url.startswith(ALLOWED_BACKEND_URL_SCHEMES):
            raise ValueError(
                f"BRIDGE_BACKEND_URL must start with http:// or https://, got: {value!r}"
            )
        return url

    @property
    def connection(self) -> ConnectionSettings:
        """Return connection settings grouped by concern."""
        return ConnectionSettings(backend_url=self.backend_url)

    @property
    def driver_config(self) -> DriverSettings:
        """Return driver selection grouped by concern."""
        return DriverSettings(name=self.driver)

    @property
    def serial(self) -> SerialSettings:
        """Return serial transport settings grouped by concern."""
        return SerialSettings(port=self.serial_port, baud_rate=self.baud_rate)

    @property
    def visa(self) -> VisaSettings:
        """Return VISA transport settings grouped by concern."""
        return VisaSettings(resource=self.visa_resource)

    @property
    def measurement(self) -> MeasurementSettings:
        """Return measurement settings grouped by concern."""
        return MeasurementSettings(
            freq_hz=self.meas_freq_hz,
            poll_interval_s=self.poll_interval_s,
        )

    @property
    def demo(self) -> DemoSettings:
        """Return demo driver settings grouped by concern."""
        return DemoSettings(
            freq_min_hz=self.demo_freq_min_hz,
            freq_max_hz=self.demo_freq_max_hz,
            cuvette_gap_mm=self.demo_cuvette_gap_mm,
            cuvette_area_cm2=self.demo_cuvette_area_cm2,
        )

    @property
    def pulse_biosciences(self) -> PulseBiosciencesSettings:
        """Return Pulse Biosciences settings grouped by concern."""
        return PulseBiosciencesSettings(
            host=self.pb_host,
            tcp_port=self.pb_tcp_port,
            tcp_timeout_s=self.pb_tcp_timeout_s,
        )

    @property
    def logging_config(self) -> LoggingSettings:
        """Return logging settings grouped by concern."""
        return LoggingSettings(level=self.log_level)


__all__ = [
    "ConnectionSettings",
    "DemoSettings",
    "DriverName",
    "DriverSettings",
    "LogLevel",
    "LoggingSettings",
    "MeasurementSettings",
    "PulseBiosciencesSettings",
    "SerialSettings",
    "Settings",
    "VisaSettings",
]
