// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

import { dark } from '@clerk/themes'

type ClerkPalette = {
  primary:       string
  neutral:       string
  bg:            string
  inputBg:       string
  text:          string
  textSecondary: string
  textOnPrimary: string
  shimmerPct:    number
  placeholder:   string
  dividerText:   string
  fieldLabel:    string
  btnBgPct:      number
  btnBorderPct:  number
}

export function makeClerkAppearance(palette: ClerkPalette, startKey: string) {
  const p = palette.primary
  const n = palette.neutral
  return {
    baseTheme: dark,
    variables: {
      colorBackground:             palette.bg,
      colorInputBackground:        palette.inputBg,
      colorInputText:              palette.text,
      colorText:                   palette.text,
      colorTextSecondary:          palette.textSecondary,
      colorTextOnPrimaryBackground: palette.textOnPrimary,
      colorPrimary:                p,
      colorSuccess:                '#4ade80',
      colorDanger:                 '#ff4d6d',
      colorNeutral:                n,
      colorShimmer:                `color-mix(in srgb, ${p} ${palette.shimmerPct}%, transparent)`,
      borderRadius:                '8px',
      fontFamily:                  "'Inter', system-ui, sans-serif",
      fontFamilyButtons:           "'Inter', system-ui, sans-serif",
      fontSize:                    '0.875rem',
      spacingUnit:                 '0.9rem',
    },
    elements: {
      rootBox:                      { width: '100%', maxWidth: '100%', minWidth: '0' },
      cardBox:                      { width: '100%', maxWidth: '100%', padding: '0.5rem' },
      card:                         { background: 'transparent', boxShadow: 'none', border: 'none', padding: '0', gap: '1.1rem', width: '100%' },
      main:                         { padding: '0 2px' },
      [startKey]:                   { padding: '0 0.25rem' },
      headerTitle:                  { display: 'none' },
      headerSubtitle:               { display: 'none' },
      header:                       { display: 'none' },
      socialButtonsBlockButton:     { border: `1px solid ${n}`, background: palette.inputBg, color: palette.text, borderRadius: '8px', padding: '0.65rem 1rem', transition: 'border-color 0.15s, background 0.15s' },
      socialButtonsBlockButtonText: { fontWeight: '500' },
      dividerLine:                  { background: n },
      dividerText:                  { color: palette.dividerText, fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase' },
      formFieldLabel:               { color: palette.fieldLabel, fontSize: '0.75rem', letterSpacing: '0.03em', textTransform: 'capitalize', paddingLeft: '2px' },
      formFieldInput:               { background: palette.inputBg, border: `1px solid ${n}`, color: palette.text, borderRadius: '8px', caretColor: p },
      formFieldInputPlaceholder:    { color: palette.placeholder },
      formButtonPrimary:            { background: `color-mix(in srgb, ${p} ${palette.btnBgPct}%, transparent)`, color: p, border: `1px solid color-mix(in srgb, ${p} ${palette.btnBorderPct}%, transparent)`, fontFamily: "'Inter', system-ui, sans-serif", letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: '600', borderRadius: '8px', boxShadow: 'none' },
      buttonArrowIcon:              { display: 'none' },
      footerActionLink:             { color: p },
      footerAction:                 { display: 'none' },
      identityPreviewText:          { color: palette.text },
      identityPreviewEditButton:    { color: p },
      alternativeMethodsBlockButton: { border: `1px solid ${n}`, background: palette.inputBg, color: palette.text, borderRadius: '8px' },
      otpCodeFieldInput:            { background: palette.inputBg, border: `1px solid ${n}`, color: p, borderRadius: '8px' },
    },
  }
}
