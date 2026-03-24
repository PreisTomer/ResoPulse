"""
Physics functions for the demo driver's synthetic impedance generator.

The complex cuvette impedance formula used here is identical to the one
implemented in the frontend at frontend/src/utils/impedance.ts
(computeCuvetteComplexImpedanceMag), so demo readings land in the UI charts
as physically plausible values rather than arbitrary numbers.

Reference: Maxwell-Wagner relaxation model for a resistive-capacitive cell.
"""

import math
import random

# Permittivity of free space [F/m]
_EPSILON_0 = 8.854187817e-12

# Relative permittivity of water/saline at room temperature (dimensionless)
_EPSILON_R_SALINE = 80.0

# Nominal saline conductivity at 25 °C [S/m]
_SIGMA_E_SALINE = 1.5


def compute_cuvette_complex_impedance(
    freq_hz: float,
    gap_mm: float,
    cross_section_cm2: float,
    sigma_e: float = _SIGMA_E_SALINE,
    epsilon_r: float = _EPSILON_R_SALINE,
) -> tuple[float, float]:
    """
    Return (Z_real, Z_imag) [Ω] for a parallel-plate cuvette at a given frequency.

    Uses the full complex formula:
        Z(f) = (d / A) / (sigma_e + j * omega * epsilon_r * epsilon_0)

    At f << f_relax (~365 MHz for saline) Z_real dominates and matches the DC
    approximation d / (A * sigma_e).  At GHz range the capacitive reactance
    dominates and |Z| falls.

    Args:
        freq_hz:          Measurement frequency [Hz]
        gap_mm:           Electrode gap [mm]
        cross_section_cm2: Electrode area [cm²]
        sigma_e:          Medium conductivity [S/m]
        epsilon_r:        Medium relative permittivity

    Returns:
        (z_real, z_imag) both in Ω (z_imag is negative for a capacitive load)
    """
    gap_m = gap_mm * 1e-3
    area_m2 = cross_section_cm2 * 1e-4
    geometry_factor = gap_m / area_m2         # [m / m²] = [1/m]

    omega = 2.0 * math.pi * freq_hz
    epsilon = epsilon_r * _EPSILON_0          # absolute permittivity [F/m]

    # Z = geometry / (sigma + j * omega * epsilon)
    # Split into real and imaginary:
    #   denominator = sigma + j*omega*epsilon
    #   Z = geometry * conj(denom) / |denom|²
    denom_real = sigma_e
    denom_imag = omega * epsilon
    denom_mag_sq = denom_real**2 + denom_imag**2

    z_real = geometry_factor * denom_real / denom_mag_sq
    z_imag = -geometry_factor * denom_imag / denom_mag_sq  # negative = capacitive

    return z_real, z_imag


def log_sweep_frequency(step: int, total_steps: int, freq_min: float, freq_max: float) -> float:
    """
    Return the frequency [Hz] at position `step` in a logarithmic sweep.

    Args:
        step:        Current step index (0-based, wraps via modulo)
        total_steps: Total number of steps in one full sweep
        freq_min:    Lower bound [Hz]
        freq_max:    Upper bound [Hz]

    Returns:
        Frequency in Hz
    """
    if total_steps <= 1:
        return freq_min

    position = (step % total_steps) / (total_steps - 1)
    log_freq = math.log10(freq_min) + position * (math.log10(freq_max) - math.log10(freq_min))
    return 10.0**log_freq


def add_gaussian_noise(value: float, noise_fraction: float = 0.02) -> float:
    """
    Add Gaussian noise proportional to the value magnitude.

    Args:
        value:          The clean value
        noise_fraction: Noise standard deviation as a fraction of |value| (default 2%)

    Returns:
        Value with noise applied
    """
    sigma = abs(value) * noise_fraction
    return value + random.gauss(0.0, sigma)


def derive_conductivity_from_z_real(
    z_real: float,
    gap_mm: float,
    cross_section_cm2: float,
) -> float:
    """
    Derive medium conductivity [S/m] from the DC impedance and cuvette geometry.

    sigma_e = d / (A * Z_real)   (DC approximation, valid at f << f_relax)

    This is the same formula used in frontend/src/utils/impedance.ts
    (computeSigmaEFromImpedance) so the displayed conductivity is consistent.

    Args:
        z_real:            Measured or simulated real impedance [Ω]
        gap_mm:            Electrode gap [mm]
        cross_section_cm2: Electrode area [cm²]

    Returns:
        Medium conductivity [S/m]
    """
    gap_cm = gap_mm * 0.1
    return gap_cm / (cross_section_cm2 * z_real)
