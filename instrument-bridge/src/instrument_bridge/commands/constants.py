# Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.
"""Shared constants for CLI command modules."""

DRIVER_CHOICES = ["demo", "btx", "visa_lcr", "ascii_serial", "nanopulse", "pulse_select"]
BRIDGE_LOG_LEVEL_CHOICES = ["TRACE", "DEBUG", "INFO", "WARNING", "ERROR"]

AI_SERVICE_DEFAULT_HOST = "127.0.0.1"
AI_SERVICE_DEFAULT_PORT = 8000
AI_SERVICE_DEFAULT_LOG_LEVEL = "info"
AI_SERVICE_LOG_LEVEL_CHOICES = ["critical", "error", "warning", "info", "debug", "trace"]