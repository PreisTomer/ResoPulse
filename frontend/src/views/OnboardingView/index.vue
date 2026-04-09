<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="onboarding">

    <div class="onboarding__bg" aria-hidden="true">
      <div class="onboarding__bg-grid"></div>
      <canvas ref="waveCanvas" class="onboarding__bg-canvas"></canvas>
    </div>

    <div class="onboarding__layout">

      <!-- Progress indicator -->
      <div class="onboarding__progress">
        <span class="onboarding__progress-step" :class="{ 'onboarding__progress-step--active': step >= 1 }">Account</span>
        <span class="onboarding__progress-connector"></span>
        <span class="onboarding__progress-step" :class="{ 'onboarding__progress-step--active': step >= 2 }">Lab Setup</span>
        <span class="onboarding__progress-connector"></span>
        <span class="onboarding__progress-step" :class="{ 'onboarding__progress-step--active': step >= 3 }">Ready</span>
      </div>

      <!-- Step 2: Create organisation -->
      <div v-if="isCreatingOrg" class="onboarding__card">
        <div class="onboarding__card-icon" aria-hidden="true">🧪</div>
        <div class="onboarding__card-header">
          <span class="onboarding__card-eyebrow">Step 2 of 2</span>
          <h1 class="onboarding__card-title">Create your Lab Workspace</h1>
          <p class="onboarding__card-desc">
            A workspace groups your team and their experiment sessions.
            You can invite colleagues after setup.
          </p>
        </div>

        <form class="onboarding__form" @submit.prevent="submitCreateOrg">
          <div class="onboarding__field">
            <label class="onboarding__field-label" for="org-name">Lab / Team name</label>
            <input
              id="org-name"
              v-model="orgName"
              type="text"
              class="onboarding__field-input"
              :class="{ 'onboarding__field-input--error': nameError }"
              placeholder="e.g. Smith Lab, Bioelectrics Group"
              maxlength="64"
              autocomplete="organization"
              @input="nameError = ''"
            />
            <span v-if="nameError" class="onboarding__field-error">{{ nameError }}</span>
          </div>

          <div class="onboarding__field">
            <label class="onboarding__field-label" for="org-slug">Workspace URL slug</label>
            <div class="onboarding__slug-row">
              <span class="onboarding__slug-prefix">resopulse.app/</span>
              <input
                id="org-slug"
                v-model="orgSlug"
                type="text"
                class="onboarding__field-input onboarding__field-input--slug"
                :class="{ 'onboarding__field-input--error': slugError }"
                placeholder="smith-lab"
                maxlength="48"
                pattern="[a-z0-9\-]+"
                @input="onSlugInput"
              />
            </div>
            <span v-if="slugError" class="onboarding__field-error">{{ slugError }}</span>
          </div>

          <button
            type="submit"
            class="onboarding__btn onboarding__btn--primary"
            :disabled="isSubmitting"
          >
            <span v-if="isSubmitting" class="onboarding__btn-spinner" aria-hidden="true"></span>
            {{ isSubmitting ? 'Creating workspace...' : 'Create Lab Workspace' }}
          </button>

          <p v-if="submitError" class="onboarding__submit-error">{{ submitError }}</p>
        </form>

        <div class="onboarding__role-info">
          <span class="onboarding__role-info-title">Role assigned to you:</span>
          <span class="onboarding__role-badge">Owner</span>
          <span class="onboarding__role-info-desc">Full access. Invite team members after setup.</span>
        </div>
      </div>

      <!-- Step 3: Done — brief success screen before redirect -->
      <div v-else class="onboarding__card onboarding__card--success">
        <div class="onboarding__success-rings" aria-hidden="true">
          <svg viewBox="0 0 200 200" fill="none" class="onboarding__success-svg">
            <circle class="onboarding__success-ring--1" cx="100" cy="100" r="40"  stroke-width="1.5" fill="none"/>
            <circle class="onboarding__success-ring--2" cx="100" cy="100" r="65"  stroke-width="1"   fill="none"/>
            <circle class="onboarding__success-ring--3" cx="100" cy="100" r="90"  stroke-width="0.8" fill="none"/>
            <text x="100" y="107" text-anchor="middle" class="onboarding__success-icon">✓</text>
          </svg>
        </div>
        <h1 class="onboarding__card-title onboarding__card-title--success">Lab workspace ready</h1>
        <p class="onboarding__card-desc">Redirecting you to the app...</p>
        <div class="onboarding__redirect-bar">
          <div class="onboarding__redirect-bar-fill"></div>
        </div>
      </div>

    </div>

  </div>
</template>

<script lang="ts">
import { defineComponent, ref, markRaw } from 'vue'
import { useClerk } from '@clerk/vue'

import { ROUTE } from '@/constants/routes'
import { useAuthStore } from '@/stores/authStore'

const REDIRECT_DELAY_MS = 2200

// Sine wave config — cyan/primary dominant, subtle (card sits in foreground)
interface WaveState {
  freq:      number
  amp:       number
  yRatio:    number
  speed:     number
  opacity:   number
  isPrimary: boolean
  phase:     number
}

const WAVE_INIT: Omit<WaveState, 'phase'>[] = [
  { freq: 0.007, amp: 40, yRatio: 0.18, speed: 0.007, opacity: 0.09, isPrimary: true  },
  { freq: 0.012, amp: 25, yRatio: 0.45, speed: 0.011, opacity: 0.07, isPrimary: false },
  { freq: 0.009, amp: 35, yRatio: 0.72, speed: 0.008, opacity: 0.08, isPrimary: true  },
  { freq: 0.015, amp: 18, yRatio: 0.90, speed: 0.014, opacity: 0.06, isPrimary: false },
]

export default defineComponent({
  name: 'OnboardingView',

  setup() {
    const clerk      = useClerk()
    const authStore  = useAuthStore()
    const waveCanvas = ref<HTMLCanvasElement | null>(null)
    return { clerk, authStore, waveCanvas }
  },

  data() {
    return {
      step:          2 as 1 | 2 | 3,
      animFrameId:   null as ReturnType<typeof requestAnimationFrame> | null,
      waves:         markRaw(WAVE_INIT.map(w => ({ ...w, phase: Math.random() * Math.PI * 2 }))),
      orgName:       '',
      orgSlug:       '',
      nameError:     '',
      slugError:     '',
      submitError:   '',
      isSubmitting:  false,
      isCreatingOrg: true,
    }
  },

  methods: {
    onSlugInput(): void {
      this.slugError = ''
      // Auto-sanitise: lowercase, hyphens only
      this.orgSlug = this.orgSlug.toLowerCase().replace(/[^a-z0-9-]/g, '-')
    },

    validateForm(): boolean {
      let valid = true
      if (!this.orgName.trim()) {
        this.nameError = 'Lab name is required.'
        valid = false
      }
      if (this.orgSlug && !/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(this.orgSlug)) {
        this.slugError = 'Slug must be lowercase letters, numbers, and hyphens only.'
        valid = false
      }
      return valid
    },

    async submitCreateOrg(): Promise<void> {
      if (!this.validateForm()) return

      this.isSubmitting = true
      this.submitError  = ''

      try {
        if (!this.clerk) throw new Error('Clerk is not initialised.')
        const org = await this.clerk.createOrganization({
          name: this.orgName.trim(),
          slug: this.orgSlug || undefined,
        })
        // Activate the new org so the session JWT is refreshed before we navigate.
        await this.clerk.setActive?.({ organization: org.id })
        this.authStore.completeOnboarding()
        this.isCreatingOrg = false
        this.step          = 3
        // By the time the timer fires, App.vue's useAuth() watcher will have
        // updated authStore.hasOrg = true, so the guard lets the navigation through.
        setTimeout(() => { this.$router.push(ROUTE.HOME) }, REDIRECT_DELAY_MS)
      } catch (err) {
        const msg = (err as { errors?: { message: string }[] })?.errors?.[0]?.message
        this.submitError = msg ?? 'Could not create workspace. Please try again.'
      } finally {
        this.isSubmitting = false
      }
    },

    startWaveLoop(): void {
      const canvas = this.waveCanvas
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const tick = () => {
        const w = canvas.offsetWidth
        const h = canvas.offsetHeight
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width  = w
          canvas.height = h
        }
        ctx.clearRect(0, 0, w, h)
        this.drawWaves(ctx, w, h)
        this.animFrameId = requestAnimationFrame(tick)
      }

      this.animFrameId = requestAnimationFrame(tick)
    },

    drawWaves(ctx: CanvasRenderingContext2D, w: number, h: number): void {
      for (const wave of this.waves) {
        ctx.beginPath()
        for (let x = 0; x <= w; x += 2) {
          const y = wave.yRatio * h + Math.sin(x * wave.freq + wave.phase) * wave.amp
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
        }
        // C.primary = #00d4ff → rgb(0,212,255) | C.accent = #00ff9d → rgb(0,255,157)
        const rgb = wave.isPrimary ? '0, 212, 255' : '0, 255, 157'
        ctx.strokeStyle = `rgba(${rgb}, ${wave.opacity})`
        ctx.lineWidth   = 1.5
        ctx.stroke()
        wave.phase += wave.speed
      }
    },
  },

  mounted() {
    this.startWaveLoop()
  },

  beforeUnmount() {
    if (this.animFrameId !== null) cancelAnimationFrame(this.animFrameId)
  },
})
</script>

<style lang="scss" scoped>
.onboarding {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;

  /* ── Background ──────────────────────────────────────────────────── */
  &__bg {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 0;

    &-grid {
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(color-mix(in srgb, var(--color-primary) 4%, transparent) 1px, transparent 1px),
        linear-gradient(90deg, color-mix(in srgb, var(--color-primary) 4%, transparent) 1px, transparent 1px);
      background-size: 52px 52px;
      mask-image: radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 100%);
    }

    &-canvas {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      opacity: 0.6;
      mask-image: linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%);
    }
  }

  /* ── Layout ──────────────────────────────────────────────────────── */
  &__layout {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 520px;
    padding: 2rem 1.5rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2rem;
  }

  /* ── Progress bar ────────────────────────────────────────────────── */
  &__progress {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    animation: onboard-fade-in 0.4s ease-out both;
  }

  &__progress-step {
    font-family: var(--font-mono);
    font-size: var(--fs-xxs);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-text-muted);
    opacity: var(--op-muted);
    transition: color var(--tr-normal), opacity var(--tr-normal);

    &--active {
      color: var(--color-primary);
      opacity: 1;
    }
  }

  &__progress-connector {
    width: 32px;
    height: 1px;
    background: var(--color-border);
  }

  /* ── Card ────────────────────────────────────────────────────────── */
  &__card {
    width: 100%;
    padding: 2.25rem 2rem;
    border-radius: var(--radius-lg);
    border: 1px solid var(--color-primary-border);
    background: color-mix(in srgb, var(--color-surface) 90%, transparent);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    box-shadow: 0 24px 48px color-mix(in srgb, #000 55%, transparent);
    display: flex;
    flex-direction: column;
    gap: 1.75rem;
    animation: onboard-card-enter 0.5s cubic-bezier(0.16, 1, 0.3, 1) both 0.05s;

    &--success {
      align-items: center;
      text-align: center;
      border-color: var(--color-ok-border);
    }

    &-icon {
      font-size: 2rem;
      line-height: 1;
    }

    &-header {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    &-eyebrow {
      font-family: var(--font-mono);
      font-size: var(--fs-xxs);
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--color-primary);
      opacity: var(--op-dim);
    }

    &-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--color-text-heading);
      letter-spacing: -0.015em;

      &--success { color: var(--color-ok); }
    }

    &-desc {
      font-size: var(--fs-md);
      color: var(--color-text-muted);
      line-height: 1.6;
    }
  }

  /* ── Form ────────────────────────────────────────────────────────── */
  &__form {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;

    &-label {
      font-family: var(--font-mono);
      font-size: var(--fs-xxs);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--color-text-muted);
    }

    &-input {
      background: var(--color-surface-2);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      padding: 0.65rem 0.85rem;
      font-family: var(--font-sans);
      font-size: var(--fs-lg);
      color: var(--color-text);
      transition: border-color var(--tr-fast), box-shadow var(--tr-fast);
      width: 100%;
      outline: none;

      &::placeholder { color: var(--color-text-muted); opacity: var(--op-muted); }
      &:focus { border-color: var(--color-primary-border); box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 8%, transparent); }
      &--error { border-color: var(--color-danger-border); }
      &--slug  { flex: 1; border-left: none; border-radius: 0 var(--radius) var(--radius) 0; padding-left: 0.55rem; }
    }

    &-error {
      font-size: var(--fs-xs);
      color: var(--color-danger-light);
    }
  }

  &__slug-row {
    display: flex;
    align-items: stretch;
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    overflow: hidden;

    &:focus-within { border-color: var(--color-primary-border); box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 8%, transparent); }
  }

  &__slug-prefix {
    padding: 0.65rem 0.75rem;
    background: var(--color-surface);
    border-right: 1px solid var(--color-border);
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    color: var(--color-text-muted);
    white-space: nowrap;
    display: flex;
    align-items: center;
  }

  /* ── Submit button ───────────────────────────────────────────────── */
  &__btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    border-radius: var(--radius);
    font-family: var(--font-mono);
    font-size: var(--fs-sm);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    cursor: pointer;
    border: none;
    transition: opacity var(--tr-fast), box-shadow var(--tr-fast);
    margin-top: 0.25rem;

    &--primary {
      background: var(--color-primary);
      color: var(--color-btn-dark);
      &:hover:not(:disabled) { box-shadow: var(--glow-md); }
      &:disabled { opacity: var(--op-ghost); cursor: not-allowed; }
    }

    &-spinner {
      width: 14px;
      height: 14px;
      border: 2px solid color-mix(in srgb, var(--color-btn-dark) 30%, transparent);
      border-top-color: var(--color-btn-dark);
      border-radius: 50%;
      animation: onboard-spin 0.7s linear infinite;
    }
  }

  &__submit-error {
    font-size: var(--fs-sm);
    color: var(--color-danger-light);
    text-align: center;
  }

  /* ── Role info strip ─────────────────────────────────────────────── */
  &__role-info {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.7rem 0.9rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    background: var(--color-surface-2);
    flex-wrap: wrap;

    &-title {
      font-size: var(--fs-xs);
      color: var(--color-text-muted);
      font-family: var(--font-mono);
    }

    &-desc {
      font-size: var(--fs-xs);
      color: var(--color-text-muted);
      opacity: var(--op-muted);
      flex: 1;
      min-width: 12ch;
    }
  }

  &__role-badge {
    font-family: var(--font-mono);
    font-size: var(--fs-xxs);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 0.1rem 0.45rem;
    border-radius: 4px;
    background: color-mix(in srgb, var(--color-primary) 12%, transparent);
    border: 1px solid var(--color-primary-border);
    color: var(--color-primary);
  }

  /* ── Success state ───────────────────────────────────────────────── */
  &__success-rings {
    width: 120px;
    height: 120px;
  }

  &__success-svg { width: 100%; height: auto; }

  &__success-ring {
    transform-box: fill-box;
    transform-origin: center;

    &--1 { stroke: var(--color-ok);                                        animation: success-ring 2s ease-in-out infinite; }
    &--2 { stroke: color-mix(in srgb, var(--color-ok) 60%, transparent);   animation: success-ring 2s ease-in-out infinite 0.35s; }
    &--3 { stroke: color-mix(in srgb, var(--color-ok) 35%, transparent);   animation: success-ring 2s ease-in-out infinite 0.7s; }
  }

  &__success-icon {
    font-size: 28px;
    fill: var(--color-ok);
    font-family: var(--font-sans);
  }

  &__redirect-bar {
    width: 100%;
    height: 3px;
    background: var(--color-border);
    border-radius: 2px;
    overflow: hidden;
    margin-top: 0.5rem;

    &-fill {
      height: 100%;
      background: var(--color-ok);
      border-radius: 2px;
      animation: redirect-fill 2.2s linear forwards;
    }
  }
}

@keyframes onboard-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes onboard-card-enter {
  from { opacity: 0; transform: translateY(16px) scale(0.99); }
  to   { opacity: 1; transform: translateY(0)    scale(1); }
}
@keyframes onboard-spin {
  to { transform: rotate(360deg); }
}
@keyframes success-ring {
  0%, 100% { opacity: 0.25; }
  50%       { opacity: 0.85; }
}
@keyframes redirect-fill {
  from { width: 0%; }
  to   { width: 100%; }
}
</style>
