// Copyright © 2026 Tomer Preis. All rights reserved.
// Unauthorized copying or distribution is prohibited.

// ── Canvas geometry ───────────────────────────────────────────────────────────
export const CANVAS_W = 280;
export const CANVAS_H = 194; // must be ≥ 2×(BASE_R+40)=190 to contain aura rings
export const OSC_W = 280;
export const OSC_H = 37; // ~15 % shorter than original 44

// ── Blob cell ─────────────────────────────────────────────────────────────────
export const BASE_R = 55; // blob base radius (SVG px), ~15 % smaller than 65
export const BLOB_POINTS = 16; // number of perimeter control points

// ── Lysis / shatter timing (ms) ───────────────────────────────────────────────
// LYSIS_DELAY_MS removed - replaced by store.lysisDelayMs (N_pulses × pulse_period, physically grounded)
export const LYSIS_DURATION_MS = 2800; // shatter animation length
export const FRAGMENT_INTERVAL_MS = 80; // ms between spawned fragments

// ── Physics model thresholds (canonical home: constants/physics.ts) ───────────
// Re-exported here so CellCard-domain files keep a single local import.
export { THRESHOLDS, DEFAULT_CAPSID_Q } from "@/constants/physics";
export type { ThresholdKey } from "@/constants/physics";

// ── Per-type colors (defined in theme/colors.ts - re-exported here for back-compat) ──
export { CELL_COLORS } from "@/theme/colors";

import { UNIT } from "@/constants/units";

// ── Editable biophysical parameter definitions ────────────────────────────────
interface EditableParamDef {
  labelKey: string; // i18n key — pass to $t() for display label
  tipKey: string; // i18n key — pass to $t() for tooltip
  key: string;
  step: number;
  min: number;
  max: number;
  unit: string;
}

// Editable params for mammalian cells (Schwan model)
export const EDITABLE_PARAMS: EditableParamDef[] = [
  {
    labelKey: "cells.params.radius",
    tipKey: "cells.paramTips.radius",
    key: "radius",
    step: 0.001,
    min: 0.001,
    max: 100,
    unit: UNIT.UM,
  },
  {
    labelKey: "cells.params.membraneThickness",
    tipKey: "cells.paramTips.membraneThickness",
    key: "membraneThickness",
    step: 0.5,
    min: 1,
    max: 50,
    unit: UNIT.NM,
  },
  {
    labelKey: "cells.params.dielectricConstant",
    tipKey: "cells.paramTips.dielectricConstant",
    key: "dielectricConstant",
    step: 0.1,
    min: 1,
    max: 100,
    unit: "",
  },
  {
    labelKey: "cells.params.conductivity",
    tipKey: "cells.paramTips.conductivity",
    key: "conductivity",
    step: 0.01,
    min: 0.001,
    max: 5,
    unit: UNIT.S_PER_M,
  },
  {
    labelKey: "cells.params.thresholdVoltage",
    tipKey: "cells.paramTips.thresholdVoltage",
    key: "thresholdVoltage",
    step: 0.05,
    min: 0.1,
    max: 10,
    unit: UNIT.V,
  },
];

// Editable params for bacteria/virus targets (acoustic capsid resonance model)
export const EDITABLE_PARAMS_ACOUSTIC: EditableParamDef[] = [
  {
    labelKey: "cells.params.radius",
    tipKey: "cells.paramTips.radius",
    key: "radius",
    step: 0.001,
    min: 0.001,
    max: 10,
    unit: UNIT.UM,
  },
  {
    labelKey: "cells.params.resonantFreqGHz",
    tipKey: "cells.paramTips.resonantFreqGHz",
    key: "resonantFreqGHz",
    step: 0.01,
    min: 0.001,
    max: 100,
    unit: UNIT.GHZ,
  },
  {
    labelKey: "cells.params.capsidQ",
    tipKey: "cells.paramTips.capsidQ",
    key: "capsidQ",
    step: 1,
    min: 1,
    max: 200,
    unit: "",
  },
  {
    labelKey: "cells.params.thresholdVoltage",
    tipKey: "cells.paramTips.thresholdVoltage",
    key: "thresholdVoltage",
    step: 0.05,
    min: 0.1,
    max: 10,
    unit: UNIT.V,
  },
];
