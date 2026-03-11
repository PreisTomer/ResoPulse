import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import protocol from './locales/protocol.en.json'
import datasets from './locales/datasets.en.json'
import reports from './locales/reports.en.json'
import chart from './locales/chart.en.json'
import selectivity from './locales/selectivity.en.json'
import population from './locales/population.en.json'
import sweep from './locales/sweep.en.json'
import log from './locales/log.en.json'
import instrument from './locales/instrument.en.json'

export const i18n = createI18n({
  legacy: true,
  locale: 'en',
  fallbackLocale: 'en',
  messages: {
    en: {
      ...en,
      protocol,
      ...datasets,
      ...reports,
      ...chart,
      ...selectivity,
      ...population,
      ...sweep,
      ...log,
      ...instrument,
    },
  },
})
