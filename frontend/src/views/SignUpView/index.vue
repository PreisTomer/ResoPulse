<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="auth-page">

    <div class="auth-page__bg" aria-hidden="true">
      <div class="auth-page__bg-grid"></div>
    </div>

    <div class="auth-page__layout">

      <!-- LEFT PANEL -->
      <aside class="auth-page__brand">
        <div class="auth-page__rings" aria-hidden="true">
          <svg class="auth-page__rings-svg" viewBox="0 0 600 600" fill="none">
            <circle class="auth-page__ring auth-page__ring--1" cx="300" cy="300" r="90"  stroke-width="1.2" fill="none"/>
            <circle class="auth-page__ring auth-page__ring--2" cx="300" cy="300" r="150" stroke-width="1"   fill="none"/>
            <circle class="auth-page__ring auth-page__ring--3" cx="300" cy="300" r="215" stroke-width="0.9" fill="none"/>
            <circle class="auth-page__ring auth-page__ring--4" cx="300" cy="300" r="282" stroke-width="0.7" fill="none"/>
            <circle class="auth-page__cell-outer"   cx="300" cy="300" r="52" stroke-width="1.5" fill="none"/>
            <circle class="auth-page__cell-inner"   cx="300" cy="300" r="28" stroke-width="1"   fill="none"/>
            <circle class="auth-page__cell-nucleus" cx="300" cy="300" r="10" stroke-width="0.8" fill="none"/>
          </svg>
        </div>

        <div class="auth-page__brand-identity">
          <RouterLink to="/" class="auth-page__logo-link">
            <img src="/logo.png" alt="ResoPulse" class="auth-page__logo-img" />
            <div class="auth-page__logo-text">
              <span class="auth-page__logo-name">Reso<span class="auth-page__logo-pulse">Pulse</span></span>
              <span class="auth-page__logo-tag">Virtual Cell Lab</span>
            </div>
          </RouterLink>
          <h1 class="auth-page__brand-headline">
            Start modelling<br>
            <span class="auth-page__brand-highlight">your first protocol.</span>
          </h1>
          <p class="auth-page__brand-sub">
            Free access to the full biophysics simulator.
            Invite your lab team and collaborate on protocol design.
          </p>
        </div>

        <ul class="auth-page__steps" aria-label="Getting started steps">
          <li v-for="(step, i) in onboardingSteps" :key="step" class="auth-page__step">
            <span class="auth-page__step-num">{{ i + 1 }}</span>
            <span class="auth-page__step-label">{{ step }}</span>
          </li>
        </ul>

        <p class="auth-page__footnote">
          Kotnik &amp; Miklavcic 2000 · Weaver &amp; Chizmadzhev 1996 · Pennes 1948
        </p>
      </aside>

      <!-- RIGHT PANEL -->
      <div class="auth-page__card-wrap">
        <div class="auth-page__card">
          <div class="auth-page__card-header">
            <span class="auth-page__card-eyebrow">New Account</span>
            <h2 class="auth-page__card-title">Create your lab account</h2>
            <p class="auth-page__card-desc">Set up in under a minute</p>
          </div>

          <SignUp
            :routing="'path'"
            :path="ROUTE.SIGN_UP"
            :sign-in-url="ROUTE.SIGN_IN"
            :after-sign-up-url="ROUTE.ONBOARDING"
            :appearance="clerkAppearance"
          />
        </div>

        <div class="auth-page__card-footer">
          <span class="auth-page__card-footer-text">Already have an account?</span>
          <RouterLink :to="ROUTE.SIGN_IN" class="auth-page__card-footer-link">Sign in</RouterLink>
        </div>
      </div>

    </div>

  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { SignUp } from '@clerk/vue'
import { dark } from '@clerk/themes'

import { ROUTE } from '@/constants/routes'

export default defineComponent({
  name: 'SignUpView',
  components: { SignUp },

  data() {
    return {
      onboardingSteps: [
        'Create your account with email, Google, or ORCID',
        'Set up your first Lab Workspace',
        'Invite team members with role-based access',
        'Start designing electroporation protocols',
      ],
    }
  },

  computed: {
    ROUTE() { return ROUTE },

    clerkAppearance() {
      return {
        baseTheme: dark,
        variables: {
          colorBackground:      '#0d1826',
          colorInputBackground: '#0a1520',
          colorInputText:       '#c8d8e8',
          colorText:            '#c8d8e8',
          colorTextSecondary:   '#5a7a9a',
          colorTextOnPrimaryBackground: '#060e1a',
          colorPrimary:         '#00d4ff',
          colorSuccess:         '#4ade80',
          colorDanger:          '#ff4d6d',
          colorNeutral:         '#1e3a5f',
          borderRadius:         '8px',
          fontFamily:           "'Inter', system-ui, sans-serif",
          fontFamilyButtons:    "'JetBrains Mono', 'Fira Code', monospace",
          fontSize:             '0.875rem',
        },
        elements: {
          rootBox:                 { width: '100%' },
          card:                    { background: 'transparent', boxShadow: 'none', border: 'none', padding: '0', gap: '1.1rem' },
          headerTitle:             { display: 'none' },
          headerSubtitle:          { display: 'none' },
          header:                  { display: 'none' },
          socialButtonsBlockButton: { border: '1px solid #1e3a5f', background: '#0a1520', color: '#c8d8e8', borderRadius: '8px' },
          dividerLine:             { background: '#1e3a5f' },
          dividerText:             { color: '#3a5a7a', fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase' },
          formFieldLabel:          { color: '#5a7a9a', fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace" },
          formFieldInput:          { background: '#0a1520', border: '1px solid #1e3a5f', color: '#c8d8e8', borderRadius: '8px' },
          formButtonPrimary:       { background: '#00d4ff', color: '#060e1a', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: '700', borderRadius: '8px' },
          footerActionLink:        { color: '#00d4ff' },
          footerAction:            { display: 'none' },
        },
      }
    },
  },
})
</script>

<style lang="scss" scoped>
/* ── Reuse the same auth-page layout styles as SignInView ── */
.auth-page {
  min-height: 100vh;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: stretch;

  &__bg {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 0;

    &-grid {
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(color-mix(in srgb, var(--color-accent) 4%, transparent) 1px, transparent 1px),
        linear-gradient(90deg, color-mix(in srgb, var(--color-accent) 4%, transparent) 1px, transparent 1px);
      background-size: 52px 52px;
      mask-image: radial-gradient(ellipse 80% 60% at 50% 50%, black 30%, transparent 100%);
    }
  }

  &__layout {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 1180px;
    margin: 0 auto;
    padding: 3rem 2rem;
    display: flex;
    align-items: center;
    gap: 4rem;

    @media (max-width: 900px) {
      flex-direction: column;
      gap: 2.5rem;
      padding: 2rem 1.25rem;
      align-items: stretch;
    }
  }

  &__brand {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2.5rem;
    position: relative;

    @media (max-width: 900px) { gap: 1.5rem; }
  }

  &__rings {
    position: absolute;
    inset: -80px;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    z-index: 0;
    opacity: var(--op-ghost);
    @media (max-width: 900px) { display: none; }

    &-svg { width: 100%; height: auto; max-width: 520px; }
  }

  &__ring {
    transform-box: fill-box;
    transform-origin: center;
    animation: auth-ring-pulse 4s ease-in-out infinite;

    &--1 { stroke: var(--color-accent);                                         animation-delay: 0s; }
    &--2 { stroke: color-mix(in srgb, var(--color-accent) 75%, transparent);   animation-delay: 0.7s; }
    &--3 { stroke: color-mix(in srgb, var(--color-accent) 50%, transparent);   animation-delay: 1.4s; }
    &--4 { stroke: color-mix(in srgb, var(--color-accent) 28%, transparent);   animation-delay: 2.1s; }
  }

  &__cell-outer  { stroke: color-mix(in srgb, var(--color-accent) 55%, transparent);   animation: auth-ring-pulse 3.5s ease-in-out infinite; }
  &__cell-inner  { stroke: color-mix(in srgb, var(--color-accent) 35%, transparent);   animation: auth-ring-pulse 3.5s ease-in-out infinite 0.5s; }
  &__cell-nucleus { stroke: color-mix(in srgb, var(--color-primary) 55%, transparent); animation: auth-ring-pulse 3s ease-in-out infinite 0.25s; }

  &__brand-identity {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  &__logo-link {
    display: inline-flex;
    align-items: center;
    gap: 0.7rem;
    text-decoration: none;
    width: fit-content;
  }

  &__logo-img {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    border: 1.5px solid var(--color-border);
    background: var(--color-bg);
    object-fit: cover;
    transform: scale(1.7);
    box-shadow: var(--glow-sm);
  }

  &__logo-text  { display: flex; flex-direction: column; gap: 2px; }

  &__logo-name {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--color-text-heading);
    letter-spacing: 0.03em;
    line-height: 1;
  }

  &__logo-pulse {
    color: var(--color-primary-deep);
    -webkit-text-stroke: 0.8px var(--color-primary);
    paint-order: stroke fill;
  }

  &__logo-tag {
    font-family: var(--font-mono);
    font-size: var(--fs-xxs);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-text-muted);
    opacity: var(--op-muted);
  }

  &__brand-headline {
    font-size: clamp(1.8rem, 3.5vw, 2.6rem);
    font-weight: 700;
    line-height: 1.2;
    color: var(--color-text-heading);
    letter-spacing: -0.02em;
  }

  &__brand-highlight {
    color: var(--color-accent);
    text-shadow: 0 0 8px color-mix(in srgb, var(--color-accent) 40%, transparent);
  }

  &__brand-sub {
    font-size: var(--fs-lg);
    color: var(--color-text-muted);
    line-height: 1.65;
    max-width: 40ch;
  }

  /* ── Onboarding steps ────────────────────────────────────────────── */
  &__steps {
    position: relative;
    z-index: 1;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
  }

  &__step {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    animation: auth-fade-up 0.5s ease-out both;

    @for $i from 1 through 4 {
      &:nth-child(#{$i}) { animation-delay: #{0.1 + $i * 0.09}s; }
    }

    &-num {
      font-family: var(--font-mono);
      font-size: var(--fs-xxs);
      font-weight: 700;
      color: var(--color-accent);
      background: color-mix(in srgb, var(--color-accent) 10%, transparent);
      border: 1px solid color-mix(in srgb, var(--color-accent) 25%, transparent);
      border-radius: 50%;
      width: 22px;
      height: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 1px;
    }

    &-label {
      font-size: var(--fs-sm);
      color: var(--color-text-muted);
      line-height: 1.5;
    }
  }

  &__footnote {
    position: relative;
    z-index: 1;
    font-family: var(--font-mono);
    font-size: var(--fs-xxs);
    letter-spacing: 0.05em;
    color: var(--color-text-muted);
    opacity: var(--op-ghost);
    @media (max-width: 900px) { display: none; }
  }

  /* ── Card ────────────────────────────────────────────────────────── */
  &__card-wrap {
    flex-shrink: 0;
    width: 420px;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    animation: auth-card-enter 0.55s cubic-bezier(0.16, 1, 0.3, 1) both 0.1s;

    @media (max-width: 900px) {
      width: 100%;
      max-width: 420px;
      align-self: center;
    }
  }

  &__card {
    padding: 2rem;
    border-radius: var(--radius-lg);
    border: 1px solid color-mix(in srgb, var(--color-accent) 30%, transparent);
    background: color-mix(in srgb, var(--color-surface) 88%, transparent);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    box-shadow:
      0 24px 48px color-mix(in srgb, #000 55%, transparent),
      inset 0 1px 0 color-mix(in srgb, white 4%, transparent);
    display: flex;
    flex-direction: column;
    gap: 1.5rem;

    &-header {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }

    &-eyebrow {
      font-family: var(--font-mono);
      font-size: var(--fs-xxs);
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--color-accent);
      opacity: var(--op-dim);
    }

    &-title {
      font-size: 1.35rem;
      font-weight: 700;
      color: var(--color-text-heading);
      letter-spacing: -0.01em;
    }

    &-desc {
      font-size: var(--fs-md);
      color: var(--color-text-muted);
    }

    &-footer {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;

      &-text {
        font-size: var(--fs-sm);
        color: var(--color-text-muted);
        opacity: var(--op-muted);
      }

      &-link {
        font-size: var(--fs-sm);
        color: var(--color-primary);
        text-decoration: none;
        font-weight: 600;
        transition: opacity var(--tr-fast);
        &:hover { opacity: var(--op-partial); text-decoration: none; }
      }
    }
  }
}

@keyframes auth-ring-pulse {
  0%, 100% { opacity: 0.12; }
  50%       { opacity: 0.55; }
}
@keyframes auth-fade-up {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes auth-card-enter {
  from { opacity: 0; transform: translateY(20px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0)    scale(1); }
}
</style>
