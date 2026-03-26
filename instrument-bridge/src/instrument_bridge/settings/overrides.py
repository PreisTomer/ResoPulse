# Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.
"""Helpers for translating CLI inputs into Settings override dictionaries."""

from typing import Optional


def build_run_overrides(
    driver: Optional[str],
    backend_url: Optional[str],
    port: Optional[str],
    visa_resource: Optional[str],
    poll: Optional[float],
    freq: Optional[float],
    pb_host: Optional[str],
    pb_tcp_port: Optional[int],
    log_level: Optional[str],
) -> dict[str, object]:
    """Build flat CLI overrides for the env-facing Settings model."""
    overrides: dict[str, object] = {}
    if driver:
        overrides["driver"] = driver
    if backend_url:
        overrides["backend_url"] = backend_url
    if port:
        overrides["serial_port"] = port
    if visa_resource:
        overrides["visa_resource"] = visa_resource
    if poll is not None:
        overrides["poll_interval_s"] = poll
    if freq is not None:
        overrides["meas_freq_hz"] = freq
    if pb_host:
        overrides["pb_host"] = pb_host
    if pb_tcp_port is not None:
        overrides["pb_tcp_port"] = pb_tcp_port
    if log_level:
        overrides["log_level"] = log_level.upper()
    return overrides