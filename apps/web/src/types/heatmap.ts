// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

export interface OutcomeItem {
  text:  string
  level: 'ok' | 'warn' | 'danger' | 'info'
}

export interface HoverInfo {
  freqLabel:  string
  fieldLabel: string
  zoneLabel:  string
  zoneColor:  string
  tDr:        string
  hDr:        string
  temp:       string
  pLysis:     string
  outcomes:   OutcomeItem[]
}
