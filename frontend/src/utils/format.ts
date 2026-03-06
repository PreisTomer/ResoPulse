/**
 * Shared display formatters used across FrequencySlider, CellCard, SelectivityPanel, etc.
 */

/**
 * Format a frequency value [kHz] to a human-readable string.
 * kHz range: rounded to integer (slider values are always integers in kHz)
 * MHz/GHz range: fixed to `decimals` decimal places (default 2).
 */
export function formatFreqKHz(khz: number, decimals = 2): string {
  if (khz >= 1_000_000) return `${(khz / 1_000_000).toFixed(decimals)} GHz`
  if (khz >= 1_000)     return `${(khz / 1_000).toFixed(decimals)} MHz`
  return `${Math.round(khz)} kHz`
}

/**
 * Format a field intensity [V/cm] to a human-readable string.
 * Values ≥ 10 000 V/cm are displayed in kV/cm (1 decimal place).
 */
export function formatFieldVcm(vcm: number): string {
  return vcm >= 10_000 ? `${(vcm / 1_000).toFixed(1)} kV/cm` : `${vcm} V/cm`
}
