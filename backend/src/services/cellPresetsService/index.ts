// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import { prisma } from '../../prisma'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CellPresetInput {
  role:                 string
  cellType:             string
  label:                string
  shortLabel:           string
  notes?:               string
  parameterConfidence?: string
  radius:               number
  membraneThickness:    number
  dielectricConstant:   number
  conductivity:         number
  thresholdVoltage:     number
  density:              number
  specificHeatCapacity: number
  resonantFreqGHz?:     number | null
  capsidQ?:             number | null
  resonantThresholdVcm?: number | null
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function listCellPresets(orgId: string) {
  return prisma.userCellPreset.findMany({
    where:   { orgId },
    orderBy: { createdAt: 'asc' },
  })
}

export async function getCellPreset(id: string, orgId: string) {
  return prisma.userCellPreset.findFirst({
    where: { id, orgId },
  })
}

export async function createCellPreset(orgId: string, createdBy: string, input: CellPresetInput) {
  return prisma.userCellPreset.create({
    data: {
      orgId,
      createdBy,
      role:                 input.role,
      cellType:             input.cellType,
      label:                input.label.trim(),
      shortLabel:           input.shortLabel.trim(),
      notes:                input.notes?.trim() ?? null,
      parameterConfidence:  input.parameterConfidence ?? 'literature',
      radius:               input.radius,
      membraneThickness:    input.membraneThickness,
      dielectricConstant:   input.dielectricConstant,
      conductivity:         input.conductivity,
      thresholdVoltage:     input.thresholdVoltage,
      density:              input.density,
      specificHeatCapacity: input.specificHeatCapacity,
      resonantFreqGHz:      input.resonantFreqGHz  ?? null,
      capsidQ:              input.capsidQ           ?? null,
      resonantThresholdVcm: input.resonantThresholdVcm ?? null,
    },
  })
}

export async function updateCellPreset(id: string, orgId: string, input: Partial<CellPresetInput>) {
  // Verify ownership before update
  const existing = await getCellPreset(id, orgId)
  if (!existing) return null

  return prisma.userCellPreset.update({
    where: { id },
    data:  {
      ...(input.role                 != null && { role:                 input.role }),
      ...(input.cellType             != null && { cellType:             input.cellType }),
      ...(input.label                != null && { label:                input.label.trim() }),
      ...(input.shortLabel           != null && { shortLabel:           input.shortLabel.trim() }),
      ...(input.notes                != null && { notes:                input.notes.trim() }),
      ...(input.parameterConfidence  != null && { parameterConfidence:  input.parameterConfidence }),
      ...(input.radius               != null && { radius:               input.radius }),
      ...(input.membraneThickness    != null && { membraneThickness:    input.membraneThickness }),
      ...(input.dielectricConstant   != null && { dielectricConstant:   input.dielectricConstant }),
      ...(input.conductivity         != null && { conductivity:         input.conductivity }),
      ...(input.thresholdVoltage     != null && { thresholdVoltage:     input.thresholdVoltage }),
      ...(input.density              != null && { density:              input.density }),
      ...(input.specificHeatCapacity != null && { specificHeatCapacity: input.specificHeatCapacity }),
      // Explicit null allowed to clear optional resonance fields
      resonantFreqGHz:      input.resonantFreqGHz      !== undefined ? (input.resonantFreqGHz      ?? null) : undefined,
      capsidQ:              input.capsidQ               !== undefined ? (input.capsidQ               ?? null) : undefined,
      resonantThresholdVcm: input.resonantThresholdVcm  !== undefined ? (input.resonantThresholdVcm  ?? null) : undefined,
    },
  })
}

export async function deleteCellPreset(id: string, orgId: string): Promise<boolean> {
  const existing = await getCellPreset(id, orgId)
  if (!existing) return false
  await prisma.userCellPreset.delete({ where: { id } })
  return true
}
