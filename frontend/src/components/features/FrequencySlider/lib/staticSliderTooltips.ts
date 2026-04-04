// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import { tipMediumKeys, tipScopeNote, tipShellModel, tipSingleShell } from '@/tooltips/sliderTooltips'

export const STATIC_SLIDER_TOOLTIPS = {
  mediumKeys: tipMediumKeys(),
  scopeNote: tipScopeNote(),
  shellModel: tipShellModel(),
  singleShell: tipSingleShell(),
} as const