// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import { createI18n } from 'vue-i18n'

// ── Domain locale files ────────────────────────────────────────────────────────
import nav              from '../locales/nav.en.json'
import auth             from '../locales/auth.en.json'
import account          from '../locales/account.en.json'
import billing          from '../locales/billing.en.json'
import cells            from '../locales/cells.en.json'
import slider           from '../locales/slider.en.json'
import experiment       from '../locales/experiment.en.json'
import savedExperiments from '../locales/savedExperiments.en.json'
import ai               from '../locales/ai.en.json'
import resonance        from '../locales/resonance.en.json'
import chart            from '../locales/chart.en.json'
import heatmap          from '../locales/heatmap.en.json'
import sweep            from '../locales/sweep.en.json'
import selectivity      from '../locales/selectivity.en.json'
import population       from '../locales/population.en.json'
import log              from '../locales/log.en.json'
import instrument       from '../locales/instrument.en.json'
import protocol         from '../locales/protocol.en.json'
import datasets         from '../locales/datasets.en.json'
import reports          from '../locales/reports.en.json'
import home             from '../locales/home.en.json'
import userPresets      from '../locales/userPresets.en.json'
import validate         from '../locales/validate.en.json'

export const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  warnHtmlMessage: false,
  messages: {
    en: {
      ...nav,
      ...auth,
      ...account,
      ...billing,
      ...cells,
      ...slider,
      ...experiment,
      ...savedExperiments,
      ...ai,
      ...resonance,
      ...chart,
      ...heatmap,
      ...sweep,
      ...selectivity,
      ...population,
      ...log,
      ...instrument,
      protocol,
      ...datasets,
      ...reports,
      ...home,
      ...userPresets,
      ...validate,
    },
  },
})
