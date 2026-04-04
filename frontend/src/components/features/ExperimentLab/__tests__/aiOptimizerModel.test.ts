// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import { describe, expect, it } from 'vitest'

import {
  buildAiPanelSubtitle,
  buildAiStatusBadge,
  buildTrainingSamplesDisplay,
  formatAiConfidencePct,
  formatAiDutyCycle,
  formatAiFeatureKey,
  getAiConfidenceClass,
  getAiTiClass,
} from '../lib/aiOptimizerModel'

describe('aiOptimizerModel helpers', () => {
  const t = (key: string, params?: Record<string, unknown>) => `${key}:${JSON.stringify(params ?? {})}`

  it('formats confidence and selects the confidence class', () => {
    expect(formatAiConfidencePct(0.734)).toBe('73%')
    expect(getAiConfidenceClass(0.8)).toBe('ai-tab__confidence--high')
    expect(getAiConfidenceClass(0.6)).toBe('ai-tab__confidence--medium')
    expect(getAiConfidenceClass(0.2)).toBe('ai-tab__confidence--low')
  })

  it('formats AI duty cycle, TI classes, and feature labels', () => {
    expect(formatAiDutyCycle(0.125)).toBe('12.5%')
    expect(formatAiDutyCycle(0.005)).toBe('5.0e-3')
    expect(getAiTiClass(2)).toBe('ai-tab__outcome-val--ti-strong')
    expect(getAiTiClass(1.2)).toBe('ai-tab__outcome-val--ti-marginal')
    expect(getAiTiClass(0.7)).toBe('ai-tab__outcome-val--ti-weak')
    expect(formatAiFeatureKey('freq_khz')).toBe('Frequency')
    expect(formatAiFeatureKey('custom_metric')).toBe('custom_metric')
  })

  it('builds AI subtitle, status badge, and training sample display text', () => {
    expect(buildAiPanelSubtitle(t, true, false, 0.5)).toBe('ai.panelSubtitleLoading:{}')
    expect(buildAiPanelSubtitle(t, false, true, 0.63)).toBe('ai.panelSubtitleResult:{"conf":"63%"}')
    expect(buildAiStatusBadge(t, 0)).toEqual({ label: 'ai.serviceOfflineBadge:{}', className: 'ai-tab__status-badge--offline' })
    expect(buildAiStatusBadge(t, 25)).toEqual({ label: 'ai.modelReadyBadge:{}', className: 'ai-tab__status-badge--ready' })
    expect(buildTrainingSamplesDisplay(t, 4)).toBe('ai.trainingSamplesNeeded:{"n":4}')
    expect(buildTrainingSamplesDisplay(t, 22)).toBe('ai.trainingSamplesCount:{"n":22}')
  })
})