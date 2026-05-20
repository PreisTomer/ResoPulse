// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

import { createI18n } from 'vue-i18n'

import campaign         from '../locales/campaign.en.json'
import cellEngineering  from '../locales/cellEngineering.en.json'
import downstream       from '../locales/downstream.en.json'
import library          from '../locales/library.en.json'
import methods          from '../locales/methods.en.json'
import labRuns          from '../locales/labRuns.en.json'
import instrumentHub    from '../locales/instrumentHub.en.json'
import cloneUpstream    from '../locales/cloneUpstream.en.json'
import advisor          from '../locales/advisor.en.json'
import nav              from '../locales/nav.en.json'
import auth             from '../locales/auth.en.json'
import account          from '../locales/account.en.json'
import log              from '../locales/log.en.json'
import reports          from '../locales/reports.en.json'
import home             from '../locales/home.en.json'

export const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  warnHtmlMessage: false,
  messages: {
    en: {
      ...campaign,
      ...cellEngineering,
      ...downstream,
      ...library,
      ...methods,
      ...labRuns,
      ...instrumentHub,
      ...cloneUpstream,
      ...advisor,
      ...nav,
      ...auth,
      ...account,
      ...log,
      ...reports,
      ...home,
    },
  },
})
