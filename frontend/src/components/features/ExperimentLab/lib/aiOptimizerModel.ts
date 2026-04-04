// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import { THRESHOLDS } from '@/constants/physics'

type TFn = (key: string, params?: Record<string, unknown>) => string

export function formatAiConfidencePct(confidence: number): string {
  return `${(confidence * 100).toFixed(0)}%`
}

export function getAiConfidenceClass(confidence: number): string {
  if (confidence >= 0.7) return 'ai-tab__confidence--high'
  if (confidence >= 0.5) return 'ai-tab__confidence--medium'
  return 'ai-tab__confidence--low'
}

export function getAiTiClass(predictedTi: number): string {
  if (predictedTi >= THRESHOLDS.SEL_STRONG) return 'ai-tab__outcome-val--ti-strong'
  if (predictedTi >= THRESHOLDS.SEL_MARGINAL) return 'ai-tab__outcome-val--ti-marginal'
  return 'ai-tab__outcome-val--ti-weak'
}

export function formatAiDutyCycle(dc: number): string {
  if (dc >= 0.01) return `${(dc * 100).toFixed(1)}%`
  return dc.toExponential(1)
}

const FEATURE_LABELS: Record<string, string> = {
  freq_khz: 'Frequency',
  field_vcm: 'Field intensity',
  duty_cycle: 'Duty cycle',
  pulse_width_ns: 'Pulse width',
  target_tau_ns: 'Target tau',
  healthy_tau_ns: 'Healthy tau',
  target_fc_khz: 'Target fc',
  healthy_fc_khz: 'Healthy fc',
  target_radius_um: 'Target radius',
  sigma_e: 'Sigma e (medium)',
  orientation_deg: 'Orientation angle',
}

export function formatAiFeatureKey(key: string): string {
  return FEATURE_LABELS[key] ?? key
}

export function buildAiPanelSubtitle(t: TFn, isLoading: boolean, hasResult: boolean, confidence: number): string {
  if (isLoading) return t('ai.panelSubtitleLoading')
  if (hasResult) return t('ai.panelSubtitleResult', { conf: formatAiConfidencePct(confidence) })
  return t('ai.panelSubtitleReady')
}

export function buildAiStatusBadge(t: TFn, modelTrainingSamples: number): { label: string; className: string } {
  if (modelTrainingSamples === 0) {
    return { label: t('ai.serviceOfflineBadge'), className: 'ai-tab__status-badge--offline' }
  }
  if (modelTrainingSamples >= 20) {
    return { label: t('ai.modelReadyBadge'), className: 'ai-tab__status-badge--ready' }
  }
  return { label: t('ai.modelNotReadyBadge'), className: 'ai-tab__status-badge--pending' }
}

export function buildTrainingSamplesDisplay(t: TFn, modelTrainingSamples: number): string {
  if (modelTrainingSamples < 20) {
    return t('ai.trainingSamplesNeeded', { n: modelTrainingSamples })
  }
  return t('ai.trainingSamplesCount', { n: modelTrainingSamples })
}