import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import protocol from './locales/protocol.en.json'
import datasets from './locales/datasets.en.json'
import reports from './locales/reports.en.json'

export const i18n = createI18n({
  legacy: true,
  locale: 'en',
  fallbackLocale: 'en',
  messages: { en: { ...en, protocol, ...datasets, ...reports } },
})
