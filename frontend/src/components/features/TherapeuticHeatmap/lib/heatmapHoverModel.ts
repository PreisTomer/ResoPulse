// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import { formatFreqKHz } from "@/utils/format";
import { tipHoverDynamic } from "@/tooltips/heatmapTooltips";

import { UNIT } from "@/constants/units";
import {
  HMAP_DR_DISPLAY_CAP,
  HMAP_ZONE,
  HMAP_ZONE_CSS,
} from "@/constants/heatmap";

import type { HmapZone } from "@/constants/heatmap";
import type { HoverInfo, OutcomeItem } from "@/types/heatmap";

function hoverZoneClass(zone: HmapZone): string {
  if (zone === HMAP_ZONE.THERAPEUTIC) return "tip-ok";
  if (zone === HMAP_ZONE.MARGINAL) return "tip-val";
  if (zone === HMAP_ZONE.ABLATIVE || zone === HMAP_ZONE.THERMAL)
    return "tip-warn";
  return "";
}

function formatFieldLabel(fieldVcm: number): string {
  return fieldVcm >= 1000
    ? `${(fieldVcm / 1000).toFixed(1)} ${UNIT.KV_PER_CM}`
    : `${fieldVcm.toFixed(0)} ${UNIT.V_PER_CM}`;
}

function formatDrPct(disruptionRatio: number): string {
  return `${(Math.min(disruptionRatio, HMAP_DR_DISPLAY_CAP) * 100).toFixed(1)}%`;
}

function formatTemp(tempC: number): string {
  return `${tempC.toFixed(1)} ${UNIT.DEG_C}`;
}

export function buildHeatmapHoverPresentation(input: {
  freqKHz: number;
  fieldVcm: number;
  zone: HmapZone;
  zoneLabel: string;
  tDr: number;
  hDr: number;
  tempC: number;
  pLysis: string;
  outcomes: OutcomeItem[];
}): {
  info: HoverInfo;
  tooltipHtml: string;
} {
  const {
    freqKHz,
    fieldVcm,
    zone,
    zoneLabel,
    tDr,
    hDr,
    tempC,
    pLysis,
    outcomes,
  } = input;

  const freqLabel = formatFreqKHz(freqKHz, 2);
  const fieldLabel = formatFieldLabel(fieldVcm);
  const tDrPct = formatDrPct(tDr);
  const hDrPct = formatDrPct(hDr);
  const tempStr = formatTemp(tempC);

  return {
    info: {
      freqLabel,
      fieldLabel,
      zoneLabel,
      zoneColor: HMAP_ZONE_CSS[zone],
      tDr: tDrPct,
      hDr: hDrPct,
      temp: tempStr,
      pLysis,
      outcomes,
    },
    tooltipHtml: tipHoverDynamic({
      freqLabel,
      fieldLabel,
      zoneLabel,
      zoneClass: hoverZoneClass(zone),
      tDrPct,
      hDrPct,
      tempStr,
      outcomeLines: outcomes.map((outcome) => outcome.text).join("\n"),
    }),
  };
}
