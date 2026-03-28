# Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.
"""Driver factory helpers for bridge commands."""

import sys

import click

from instrument_bridge.settings import Settings


def create_driver(settings: Settings):
    """Instantiate the correct driver from the configured driver name."""
    driver = settings.driver_config

    match driver.name:
        case "demo":
            from instrument_bridge.drivers.demo import DemoDriver

            return DemoDriver(settings)
        case "btx":
            from instrument_bridge.drivers.btx import BtxDriver

            return BtxDriver(settings)
        case "visa_lcr":
            from instrument_bridge.drivers.visa_lcr import VisaLcrDriver

            return VisaLcrDriver(settings)
        case "ascii_serial":
            from instrument_bridge.drivers.ascii_serial import AsciiSerialDriver

            return AsciiSerialDriver(settings)
        case "nanopulse":
            from instrument_bridge.drivers.pulse_biosciences import NanoPulseDriver

            return NanoPulseDriver(settings)
        case "pulse_select":
            from instrument_bridge.drivers.pulse_biosciences import PulseSelectDriver

            return PulseSelectDriver(settings)
        case _:
            click.echo(f"Unknown driver: {driver.name!r}", err=True)
            sys.exit(1)
