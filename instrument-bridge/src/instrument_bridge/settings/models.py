# Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.
"""Grouped settings models and type aliases for the bridge configuration."""

from typing import Literal

from pydantic import BaseModel


DriverName = Literal["demo", "btx", "visa_lcr", "ascii_serial", "nanopulse", "pulse_select"]
LogLevel = Literal["TRACE", "DEBUG", "INFO", "WARNING", "ERROR"]


class ConnectionSettings(BaseModel):
    """Backend connection settings."""

    backend_url: str


class DriverSettings(BaseModel):
    """Instrument driver selection."""

    name: DriverName


class SerialSettings(BaseModel):
    """Serial transport settings."""

    port: str
    baud_rate: int


class VisaSettings(BaseModel):
    """VISA transport settings."""

    resource: str


class MeasurementSettings(BaseModel):
    """Measurement cadence and commanded frequency settings."""

    freq_hz: float
    poll_interval_s: float


class DemoSettings(BaseModel):
    """Synthetic demo driver configuration."""

    freq_min_hz: float
    freq_max_hz: float
    cuvette_gap_mm: float
    cuvette_area_cm2: float


class PulseBiosciencesSettings(BaseModel):
    """Pulse Biosciences network transport settings."""

    host: str
    tcp_port: int
    tcp_timeout_s: float


class LoggingSettings(BaseModel):
    """Application logging configuration."""

    level: LogLevel