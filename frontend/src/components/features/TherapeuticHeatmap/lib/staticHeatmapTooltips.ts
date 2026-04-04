// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import {
  tipCanvas,
  tipOptLine,
  tipPLysis,
  tipRegime,
  tipSkinDepth,
  tipStats,
} from '@/tooltips/heatmapTooltips'

export const STATIC_HEATMAP_TOOLTIPS = {
  canvas: tipCanvas(),
  stats: tipStats(),
  optLine: tipOptLine(),
  pLysis: tipPLysis(),
  regime: tipRegime(),
  skinDepth: tipSkinDepth(),
} as const