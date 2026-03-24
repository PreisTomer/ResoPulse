"""
Demo driver — synthetic cuvette impedance, no hardware required.

Generates physically plausible impedance data using the same Maxwell-Wagner
complex impedance formula as the frontend's computeCuvetteComplexImpedanceMag.
The frequency sweeps logarithmically across consecutive polls so the impedance
spectrum chart in the UI fills in progressively as the bridge runs.

Use this driver first to verify that the bridge reaches the backend and the
UI shows live readings before connecting real equipment.
"""

from instrument_bridge.drivers.base import InstrumentDriver
from instrument_bridge.models import ImpedanceReading
from instrument_bridge.settings import Settings
from instrument_bridge.utils.synthetic import (
    compute_cuvette_complex_impedance,
    derive_conductivity_from_z_real,
    log_sweep_frequency,
    add_gaussian_noise,
)

# Number of steps in one full logarithmic frequency sweep.
# At poll_interval_s = 1.0 s this gives a ~100-second sweep per cycle.
_SWEEP_STEPS = 100


class DemoDriver(InstrumentDriver):
    """
    Synthetic impedance source.

    Models a saline-filled BTX-style parallel-plate cuvette.  Each poll
    advances one step along a logarithmic frequency sweep, and Gaussian
    noise (±2%) is added to both Z_real and Z_imag to simulate instrument
    noise.  The conductivity field is always populated because the geometry
    is known.
    """

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._step = 0

    @property
    def instrument_name(self) -> str:
        return "Demo (synthetic cuvette — no hardware)"

    async def connect(self) -> None:
        # No I/O — always succeeds immediately
        self._step = 0

    async def disconnect(self) -> None:
        pass  # Nothing to close

    async def read_once(self) -> ImpedanceReading:
        s = self._settings

        freq_hz = log_sweep_frequency(
            step=self._step,
            total_steps=_SWEEP_STEPS,
            freq_min=s.demo_freq_min_hz,
            freq_max=s.demo_freq_max_hz,
        )
        self._step += 1

        z_real_clean, z_imag_clean = compute_cuvette_complex_impedance(
            freq_hz=freq_hz,
            gap_mm=s.demo_cuvette_gap_mm,
            cross_section_cm2=s.demo_cuvette_area_cm2,
        )

        z_real = add_gaussian_noise(z_real_clean, noise_fraction=0.02)
        z_imag = add_gaussian_noise(z_imag_clean, noise_fraction=0.02)

        # Clamp z_real to the server's minimum to avoid validation rejection
        z_real = max(z_real, 0.01)

        conductivity = derive_conductivity_from_z_real(
            z_real=z_real,
            gap_mm=s.demo_cuvette_gap_mm,
            cross_section_cm2=s.demo_cuvette_area_cm2,
        )

        return ImpedanceReading.build(
            z_real=z_real,
            z_imag=z_imag,
            freq_hz=freq_hz,
            conductivity=conductivity,
        )
