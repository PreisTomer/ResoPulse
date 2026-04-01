// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

// Tooltip builders for ExperimentView. Pure — no Vue dependency.

import { UNIT } from '@/constants/units'

export function tipSnapBar(opts: {
  lo: number
  hi: number
  param: 'field' | 'freq'
}): string {
  const { lo, hi, param } = opts
  const isField    = param === 'field'
  const unit       = isField ? UNIT.V_PER_CM : UNIT.KHZ
  const paramLabel = isField ? 'field intensity' : 'RF frequency'
  const center     = Math.round((lo + hi) / 2)
  return `<strong>⭐ Selectivity Window</strong>
The sweep analysis has found a parameter range where:
  DR_target ≥ 85%, target membrane is at lysis threshold
  DR_healthy &lt; 50%, healthy cells remain below Rev-EP onset

Window: <span class="tip-val">${lo.toFixed(0)} - ${hi.toFixed(0)} ${unit}</span>
Center: <span class="tip-val">${center} ${unit}</span>

Clicking this button sets the active ${paramLabel} to the
window center, which maximises the selectivity margin , 
the distance from both disruption boundaries simultaneously.
This is the operating point with the highest safety buffer
between target lysis and healthy cell injury.`
}

export function tipCellBadgeHealthy(opts: {
  label: string
  radius: number
  membraneThickness: number
  fcDisplay: string
}): string {
  const { label, radius, membraneThickness, fcDisplay } = opts
  return `<strong>Healthy Reference Cell</strong>
${label}
Radius: ${radius} µm · Membrane: ${membraneThickness} nm
Characteristic frequency fc ≈ ${fcDisplay}
At quasi-DC this cell's Vm is at its Schwan maximum.`
}

export function tipCellBadgeTarget(opts: {
  label: string
  radius: number
  membraneThickness: number
  fcDisplay: string
}): string {
  const { label, radius, membraneThickness, fcDisplay } = opts
  return `<strong>Target Cell</strong>
${label}
Radius: ${radius} µm · Membrane: ${membraneThickness} nm
Characteristic frequency fc ≈ ${fcDisplay}
Larger radius raises Vm and lowers the lysis field threshold.`
}
