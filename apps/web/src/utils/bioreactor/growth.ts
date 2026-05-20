// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

// Bioreactor growth model — Module 2. Logistic VCD growth with a biphasic temperature shift
// (growth phase, then a production phase with reduced growth and elevated specific productivity).

export interface BioreactorInputs {
  seedingDensityE5:    number   // seeding viable cell density, x10^5 cells/mL
  maxVcdE6:            number   // carrying capacity, x10^6 cells/mL
  growthRatePerDay:    number   // exponential growth rate (per day) in the growth phase
  tempShiftDay:        number   // day the temperature shift to the production phase occurs
  durationDays:        number   // total culture duration
  specificProductivity:number   // qP, pg/cell/day in the growth phase
}

export interface DayPoint {
  day:        number
  vcdE6:      number   // viable cell density, x10^6 cells/mL
  titerGL:    number   // accumulated product titer, g/L
}

export interface BioreactorPrediction {
  curve:        DayPoint[]
  peakVcdE6:    number
  peakVcdDay:   number
  finalTiterGL: number
}

// After the temperature shift: growth slows, productivity rises (classic CHO fed-batch behaviour).
const POST_SHIFT_GROWTH_FACTOR = 0.25
const POST_SHIFT_QP_FACTOR     = 2.5
// pg/mL → g/L conversion (1 pg/mL = 1e-9 g/L).
const PG_PER_ML_TO_G_PER_L = 1e-9

export function predictBioreactor(inputs: BioreactorInputs): BioreactorPrediction {
  const K = inputs.maxVcdE6                      // carrying capacity (x10^6/mL)
  const v0 = inputs.seedingDensityE5 / 10        // seeding density in x10^6/mL
  const curve: DayPoint[] = []

  let titerGL = 0
  let peakVcdE6 = v0
  let peakVcdDay = 0

  for (let day = 0; day <= inputs.durationDays; day++) {
    const inProduction = day >= inputs.tempShiftDay
    const mu = inputs.growthRatePerDay * (inProduction ? POST_SHIFT_GROWTH_FACTOR : 1)

    // Logistic VCD using an effective rate integrated to this day.
    // Use closed-form logistic with a phase-blended growth rate for smoothness.
    const effectiveMu = blendedRate(inputs, day)
    const vcdE6 = logistic(K, v0, effectiveMu, day)

    // Daily titer increment: qP [pg/cell/day] x VCD [cells/mL] x 1 day.
    const qP = inputs.specificProductivity * (inProduction ? POST_SHIFT_QP_FACTOR : 1)
    const vcdCellsPerMl = vcdE6 * 1e6
    const dailyPgPerMl = qP * vcdCellsPerMl
    titerGL += dailyPgPerMl * PG_PER_ML_TO_G_PER_L

    if (vcdE6 > peakVcdE6) { peakVcdE6 = vcdE6; peakVcdDay = day }

    curve.push({ day, vcdE6: round(vcdE6, 2), titerGL: round(titerGL, 2) })
    void mu
  }

  return {
    curve,
    peakVcdE6:    round(peakVcdE6, 2),
    peakVcdDay,
    finalTiterGL: round(titerGL, 2),
  }
}

// Average growth rate from seeding to `day`, accounting for the post-shift slowdown.
function blendedRate(inputs: BioreactorInputs, day: number): number {
  if (day <= inputs.tempShiftDay) return inputs.growthRatePerDay
  const growthDays = inputs.tempShiftDay
  const prodDays = day - inputs.tempShiftDay
  const weighted = (inputs.growthRatePerDay * growthDays +
                    inputs.growthRatePerDay * POST_SHIFT_GROWTH_FACTOR * prodDays) / day
  return weighted
}

function logistic(K: number, v0: number, mu: number, t: number): number {
  if (v0 <= 0) return 0
  return K / (1 + ((K - v0) / v0) * Math.exp(-mu * t))
}

function round(x: number, dp: number): number {
  const f = Math.pow(10, dp)
  return Math.round(x * f) / f
}
