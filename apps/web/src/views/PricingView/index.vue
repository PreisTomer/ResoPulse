<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="pricing">

    <!-- ── Fixed ambient background (hex cells + waves) ─────────────────────── -->
    <div class="pricing__bg" aria-hidden="true">
      <!-- Ghostly hex cell canvas — covers full viewport -->
      <canvas ref="hexCanvas" class="pricing__hex-canvas"></canvas>

      <!--
        Wave paths are mathematically seamless: each path repeats an exact integer
        number of periods over 1440px, so animating translateX(-50%) snaps back to
        the identical visual — zero seam. Amplitudes are deliberately varied:
        wave-1 = 48px (dramatic), wave-2 = 28px (subtle), wave-3 = 15px (wispy),
        wave-4 = 40px (inverted phase, medium-large).
      -->

      <!-- Wave 1: wide cyan, amplitude 48, period 720, 4 reps -->
      <svg class="pricing__wave pricing__wave--1" viewBox="0 0 2880 120" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M0,60 C120,12 240,12 360,60 C480,108 600,108 720,60 C840,12 960,12 1080,60 C1200,108 1320,108 1440,60 C1560,12 1680,12 1800,60 C1920,108 2040,108 2160,60 C2280,12 2400,12 2520,60 C2640,108 2760,108 2880,60"/>
      </svg>

      <!-- Wave 2: medium purple, amplitude 28, period 480, 6 reps -->
      <svg class="pricing__wave pricing__wave--2" viewBox="0 0 2880 120" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M0,60 C80,32 160,32 240,60 C320,88 400,88 480,60 C560,32 640,32 720,60 C800,88 880,88 960,60 C1040,32 1120,32 1200,60 C1280,88 1360,88 1440,60 C1520,32 1600,32 1680,60 C1760,88 1840,88 1920,60 C2000,32 2080,32 2160,60 C2240,88 2320,88 2400,60 C2480,32 2560,32 2640,60 C2720,88 2800,88 2880,60"/>
      </svg>

      <!-- Wave 3: narrow cyan, amplitude 15, period 360, 8 reps (wispy) -->
      <svg class="pricing__wave pricing__wave--3" viewBox="0 0 2880 120" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M0,60 C60,45 120,45 180,60 C240,75 300,75 360,60 C420,45 480,45 540,60 C600,75 660,75 720,60 C780,45 840,45 900,60 C960,75 1020,75 1080,60 C1140,45 1200,45 1260,60 C1320,75 1380,75 1440,60 C1500,45 1560,45 1620,60 C1680,75 1740,75 1800,60 C1860,45 1920,45 1980,60 C2040,75 2100,75 2160,60 C2220,45 2280,45 2340,60 C2400,75 2460,75 2520,60 C2580,45 2640,45 2700,60 C2760,75 2820,75 2880,60"/>
      </svg>

      <!-- Wave 4: wide purple inverted phase, amplitude 40, period 720, 4 reps -->
      <svg class="pricing__wave pricing__wave--4" viewBox="0 0 2880 120" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M0,60 C120,100 240,100 360,60 C480,20 600,20 720,60 C840,100 960,100 1080,60 C1200,20 1320,20 1440,60 C1560,100 1680,100 1800,60 C1920,20 2040,20 2160,60 C2280,100 2400,100 2520,60 C2640,20 2760,20 2880,60"/>
      </svg>
    </div>

    <!-- ── Hero ─────────────────────────────────────────────────────────────── -->
    <section class="pricing__hero">
      <div class="pricing__hero-inner">
        <div class="pricing__hero-tag">{{ $t('pricing.heroTag') }}</div>
        <h1 class="pricing__hero-headline">{{ $t('pricing.heroHeadline') }}</h1>
        <p class="pricing__hero-sub">{{ $t('pricing.heroSub') }}</p>
        <div class="pricing__hero-actions">
          <RouterLink :to="ROUTE.SIGN_UP" class="pricing__hero-cta pricing__hero-cta--primary">
            {{ $t('pricing.heroCtaPrimary') }}
          </RouterLink>
          <a class="pricing__hero-cta pricing__hero-cta--secondary" href="#credits">
            {{ $t('pricing.heroCtaSecondary') }}
          </a>
        </div>
      </div>
    </section>

    <!-- ── Value props ───────────────────────────────────────────────────────── -->
    <section class="pricing__values">
      <div class="pricing__values-grid">
        <div class="pricing__value-card pricing__value-card--cyan pricing__value-card--lead">
          <div class="pricing__value-icon" aria-hidden="true">
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="20" cy="20" r="14" stroke="currentColor" stroke-width="1.2" opacity="0.25"/>
              <path d="M20 6 A14 14 0 0 1 33 22" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/>
              <path d="M33 22 L35 18 L30 20" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="20" cy="20" r="3" fill="currentColor"/>
              <circle cx="11" cy="11" r="1.5" fill="currentColor" opacity="0.6"/>
              <circle cx="29" cy="12" r="1.5" fill="currentColor" opacity="0.6"/>
              <circle cx="12" cy="29" r="1.5" fill="currentColor" opacity="0.6"/>
              <circle cx="30" cy="30" r="1.5" fill="currentColor" opacity="0.6"/>
            </svg>
          </div>
          <h3 class="pricing__value-title">{{ $t('pricing.valueLoopTitle') }}</h3>
          <p class="pricing__value-desc">{{ $t('pricing.valueLoopDesc') }}</p>
        </div>

        <div class="pricing__value-card pricing__value-card--cyan">
          <div class="pricing__value-icon" aria-hidden="true">
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="20" cy="20" r="18" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
              <path d="M6 20 Q10 8 14 20 Q18 32 22 20 Q26 8 30 20 Q34 32 34 20" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/>
              <circle cx="20" cy="20" r="3" fill="currentColor"/>
            </svg>
          </div>
          <h3 class="pricing__value-title">{{ $t('pricing.valuePhysicsTitle') }}</h3>
          <p class="pricing__value-desc">{{ $t('pricing.valuePhysicsDesc') }}</p>
        </div>

        <div class="pricing__value-card pricing__value-card--purple">
          <div class="pricing__value-icon" aria-hidden="true">
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="6" y="10" width="28" height="22" rx="3" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
              <path d="M12 20h16M12 25h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
              <path d="M20 6v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/>
              <circle cx="20" cy="6" r="2" fill="currentColor" opacity="0.7"/>
            </svg>
          </div>
          <h3 class="pricing__value-title">{{ $t('pricing.valueStorageTitle') }}</h3>
          <p class="pricing__value-desc">{{ $t('pricing.valueStorageDesc') }}</p>
        </div>

        <div class="pricing__value-card pricing__value-card--cyan">
          <div class="pricing__value-icon" aria-hidden="true">
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 6L8 20h9l-3 14 18-16h-9L20 6z" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linejoin="round"/>
              <circle cx="20" cy="20" r="18" stroke="currentColor" stroke-width="1" opacity="0.2"/>
            </svg>
          </div>
          <h3 class="pricing__value-title">{{ $t('pricing.valueAiTitle') }}</h3>
          <p class="pricing__value-desc">{{ $t('pricing.valueAiDesc') }}</p>
        </div>
      </div>
    </section>

    <!-- ── Plans ─────────────────────────────────────────────────────────────── -->
    <section class="pricing__plans">
      <div class="pricing__plans-orb" aria-hidden="true"></div>

      <div class="pricing__section-head">
        <h2 class="pricing__section-title">{{ $t('pricing.plansHeadline') }}</h2>
        <p class="pricing__section-sub">{{ $t('pricing.plansSub') }}</p>
      </div>

      <div class="pricing__plans-grid">
        <div
          v-for="(plan, index) in PLANS"
          :key="plan.id"
          class="pricing__plan"
          :class="{
            'pricing__plan--featured': plan.featured,
            'pricing__plan--current':  plan.id === currentPlan,
          }"
          :style="{ animationDelay: (index * 0.08) + 's' }"
        >
          <div v-if="plan.featured" class="pricing__plan-badge">{{ $t('pricing.badgePopular') }}</div>

          <div class="pricing__plan-top">
            <div class="pricing__plan-name">{{ $t(plan.nameKey) }}</div>
            <div class="pricing__plan-price">
              <span class="pricing__plan-amount">{{ $t(plan.priceKey) }}</span>
              <span v-if="plan.id !== 'enterprise'" class="pricing__plan-period">{{ $t('pricing.periodMonth') }}</span>
            </div>
            <div class="pricing__plan-quota">{{ $t(plan.quotaKey) }}</div>
            <div class="pricing__plan-seats">{{ $t(plan.seatsKey) }}</div>
          </div>

          <ul class="pricing__plan-features">
            <li v-for="feat in plan.features" :key="feat" class="pricing__plan-feature">
              <span class="pricing__plan-check" aria-hidden="true">{{ ICON.CHECK }}</span>
              {{ feat }}
            </li>
          </ul>

          <button
            class="pricing__plan-cta"
            :class="{
              'pricing__plan-cta--featured': plan.featured,
              'pricing__plan-cta--current':  plan.id === currentPlan,
            }"
            :disabled="plan.id === currentPlan"
            @click="handlePlanCta(plan.id)"
          >
            {{ plan.id === currentPlan ? $t('upgrade.ctaFree') : $t(plan.ctaKey) }}
          </button>
        </div>
      </div>
    </section>

    <!-- ── Credit cost breakdown ─────────────────────────────────────────────── -->
    <section id="credits" class="pricing__credits">
      <div class="pricing__section-head">
        <h2 class="pricing__section-title">{{ $t('pricing.costsHeadline') }}</h2>
        <p class="pricing__section-sub">{{ $t('pricing.costsSub') }}</p>
      </div>

      <div class="pricing__credits-table">
        <div v-for="row in COST_ROWS" :key="row.labelKey" class="pricing__credits-row">
          <span class="pricing__credits-op">{{ $t(row.labelKey) }}</span>
          <span class="pricing__credits-cost">{{ row.cost }} {{ row.cost === 1 ? 'credit' : 'credits' }}</span>
        </div>
      </div>
    </section>

    <!-- ── FAQ ──────────────────────────────────────────────────────────────── -->
    <section class="pricing__faq">
      <div class="pricing__section-head">
        <h2 class="pricing__section-title">{{ $t('pricing.faqHeadline') }}</h2>
      </div>

      <div class="pricing__faq-list">
        <div
          v-for="(item, i) in FAQ_ITEMS"
          :key="i"
          class="pricing__faq-item"
          :class="{ 'pricing__faq-item--open': openFaq === i }"
          @click="openFaq = openFaq === i ? null : i"
        >
          <div class="pricing__faq-q">
            <span>{{ $t(item.qKey) }}</span>
            <span class="pricing__faq-chevron" :class="{ 'pricing__faq-chevron--open': openFaq === i }">{{ ICON.EXPAND }}</span>
          </div>
          <div v-if="openFaq === i" class="pricing__faq-a">{{ $t(item.aKey) }}</div>
        </div>
      </div>
    </section>

    <!-- ── Bottom CTA ────────────────────────────────────────────────────────── -->
    <section class="pricing__bottom-cta">
      <div class="pricing__bottom-cta-grid" aria-hidden="true"></div>
      <div class="pricing__bottom-cta-inner">
        <h2 class="pricing__bottom-cta-headline">{{ $t('pricing.ctaHeadline') }}</h2>
        <p class="pricing__bottom-cta-sub">{{ $t('pricing.ctaSub') }}</p>
        <div class="pricing__bottom-cta-actions">
          <RouterLink :to="ROUTE.SIGN_UP" class="pricing__bottom-cta-btn">
            {{ $t('pricing.ctaBtn') }}
          </RouterLink>
          <a :href="`mailto:${CONTACT_EMAIL}`" class="pricing__bottom-cta-link">
            {{ $t('pricing.ctaContact') }}
          </a>
        </div>
      </div>
    </section>

  </div>
</template>

<script lang="ts">
import { defineComponent, markRaw } from 'vue'
import { mapStores } from 'pinia'

import { useTokenStore } from '@/stores/tokenStore'

import { ROUTE } from '@/constants/routes'
import { ICON } from '@/constants/icons'

// Ghostly hex config: larger radius, slower animation, lower opacity than sign-up's foreground version.

const HEX_RADIUS       = 28
const HEX_INNER_RATIO  = 0.72
const HEX_OPEN_SPEED   = 0.012   // vs 0.022 on sign-up
const HEX_FADE_SPEED   = 0.004   // vs 0.008 on sign-up
const HEX_IDLE_MIN     = 400
const HEX_IDLE_MAX     = 2800
const HEX_GLOW_DUR_MIN = 80
const HEX_GLOW_DUR_MAX = 200

interface HexCell {
  x:     number
  y:     number
  glow:  number
  state: 'idle' | 'opening' | 'fading'
  timer: number
}

// ── Plan / cost data ──────────────────────────────────────────────────────────

const CONTACT_EMAIL = 'preis.tomer@gmail.com'

const PLANS = [
  {
    id: 'free', nameKey: 'pricing.planFree', priceKey: 'pricing.priceFree',
    quotaKey: 'pricing.quotaFree', seatsKey: 'pricing.seatsFree', ctaKey: 'pricing.ctaFree',
    featured: false,
    features: ['200 research credits / month', 'Full physics engine', 'Protocol library', 'Experiment log'],
  },
  {
    id: 'pro', nameKey: 'pricing.planPro', priceKey: 'pricing.pricePro',
    quotaKey: 'pricing.quotaPro', seatsKey: 'pricing.seatsPro', ctaKey: 'pricing.ctaPro',
    featured: true,
    features: ['2,500 research credits / month', 'Everything in Free', 'AI protocol optimizer', 'Full CSV + report export', 'Priority credit refresh'],
  },
  {
    id: 'team', nameKey: 'pricing.planTeam', priceKey: 'pricing.priceTeam',
    quotaKey: 'pricing.quotaTeam', seatsKey: 'pricing.seatsTeam', ctaKey: 'pricing.ctaTeam',
    featured: false,
    features: ['10,000 shared credits / month', 'Everything in Pro', 'Up to 5 workspace seats', 'Shared experiment library'],
  },
  {
    id: 'enterprise', nameKey: 'pricing.planEnterprise', priceKey: 'pricing.priceEnterprise',
    quotaKey: 'pricing.quotaEnterprise', seatsKey: 'pricing.seatsEnterprise', ctaKey: 'pricing.ctaEnterprise',
    featured: false,
    features: ['Unlimited credits', 'Everything in Team', 'Unlimited seats', 'Custom integrations', 'Dedicated support'],
  },
]

const COST_ROWS = [
  { labelKey: 'pricing.costCellCard',  cost: 1  },
  { labelKey: 'pricing.costOutcome',   cost: 1  },
  { labelKey: 'pricing.costSave',      cost: 2  },
  { labelKey: 'pricing.costHeatmap',   cost: 8  },
  { labelKey: 'pricing.costAi',        cost: 5  },
  { labelKey: 'pricing.costSweep',     cost: 12 },
  { labelKey: 'pricing.costReport',    cost: 15 },
  { labelKey: 'pricing.costImpedance', cost: 25 },
  { labelKey: 'pricing.costAcoustic',  cost: 40 },
]

const FAQ_ITEMS = [
  { qKey: 'pricing.faqQ1', aKey: 'pricing.faqA1' },
  { qKey: 'pricing.faqQ2', aKey: 'pricing.faqA2' },
  { qKey: 'pricing.faqQ3', aKey: 'pricing.faqA3' },
  { qKey: 'pricing.faqQ4', aKey: 'pricing.faqA4' },
  { qKey: 'pricing.faqQ5', aKey: 'pricing.faqA5' },
]

export default defineComponent({
  name: 'PricingView',

  data() {
    return {
      openFaq:    null as number | null,
      hexFrameId: null as ReturnType<typeof requestAnimationFrame> | null,
      hexCells:   markRaw([] as HexCell[]),
    }
  },

  computed: {
    ...mapStores(useTokenStore),

    ROUTE()         { return ROUTE         },
    ICON()          { return ICON          },
    PLANS()         { return PLANS         },
    COST_ROWS()     { return COST_ROWS     },
    FAQ_ITEMS()     { return FAQ_ITEMS     },
    CONTACT_EMAIL() { return CONTACT_EMAIL },

    currentPlan(): string {
      return this.tokenStore.isLoaded ? this.tokenStore.plan : ''
    },
  },

  mounted() {
    this.buildHexGrid()
    this.startHexLoop()
  },

  beforeUnmount() {
    if (this.hexFrameId !== null) cancelAnimationFrame(this.hexFrameId)
  },

  methods: {

    // ── Hex grid ─────────────────────────────────────────────────────────────

    buildHexGrid(): void {
      const canvas = this.$refs['hexCanvas'] as HTMLCanvasElement | null
      if (!canvas) return
      const w    = canvas.width  = canvas.offsetWidth
      const h    = canvas.height = canvas.offsetHeight
      const r    = HEX_RADIUS
      const hexH = r * Math.sqrt(3)
      const cols = Math.ceil(w / (r * 1.5)) + 2
      const rows = Math.ceil(h / hexH) + 2

      this.hexCells = markRaw(
        Array.from({ length: cols * rows }, (_, idx) => {
          const col = Math.floor(idx / rows)
          const row = idx % rows
          return {
            x:     col * r * 1.5 - r,
            y:     row * hexH + (col % 2 === 1 ? hexH / 2 : 0) - hexH / 2,
            glow:  0,
            state: 'idle' as const,
            timer: Math.random() * HEX_IDLE_MAX,
          }
        })
      )
    },

    startHexLoop(): void {
      const canvas = this.$refs['hexCanvas'] as HTMLCanvasElement | null
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const tick = () => {
        const w = canvas.offsetWidth
        const h = canvas.offsetHeight
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width  = w
          canvas.height = h
          this.buildHexGrid()
        }
        ctx.clearRect(0, 0, w, h)
        this.drawHexFrame(ctx)
        this.hexFrameId = requestAnimationFrame(tick)
      }
      this.hexFrameId = requestAnimationFrame(tick)
    },

    drawHexFrame(ctx: CanvasRenderingContext2D): void {
      for (const cell of this.hexCells) {
        this.tickHexCell(cell)
        this.drawHexCell(ctx, cell)
      }
    },

    /** Advance a single cell's state machine by one frame. */
    tickHexCell(cell: HexCell): void {
      cell.timer--
      if (cell.state === 'idle' && cell.timer <= 0) {
        cell.state = 'opening'
        cell.glow  = 0
        cell.timer = HEX_GLOW_DUR_MIN + Math.random() * (HEX_GLOW_DUR_MAX - HEX_GLOW_DUR_MIN)
        return
      }
      if (cell.state === 'opening') {
        cell.glow = Math.min(cell.glow + HEX_OPEN_SPEED, 1)
        if (cell.timer <= 0) cell.state = 'fading'
        return
      }
      if (cell.state === 'fading') {
        cell.glow = Math.max(cell.glow - HEX_FADE_SPEED, 0)
        if (cell.glow <= 0) {
          cell.state = 'idle'
          cell.timer = HEX_IDLE_MIN + Math.random() * (HEX_IDLE_MAX - HEX_IDLE_MIN)
        }
      }
    },

    /**
     * Draws one hex cell. The border is always present (very faint ghost grid).
     * Inner fill, pore dot, and glow ring only appear when the cell is active.
     */
    drawHexCell(ctx: CanvasRenderingContext2D, cell: HexCell): void {
      const r = HEX_RADIUS
      const g = cell.glow

      // Always-on ghost border — so faint it reads as texture, not pattern
      this.traceHex(ctx, cell.x, cell.y, r - 1)
      ctx.strokeStyle = `rgba(167,139,250,${0.014 + g * 0.065})`
      ctx.lineWidth   = 0.6
      ctx.stroke()

      if (g <= 0) return

      // Inner fill glow
      this.traceHex(ctx, cell.x, cell.y, r * HEX_INNER_RATIO)
      ctx.fillStyle = `rgba(167,139,250,${g * 0.038})`
      ctx.fill()

      // Central pore dot
      ctx.beginPath()
      ctx.arc(cell.x, cell.y, 1.8 * g, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(210,190,255,${g * 0.55})`
      ctx.fill()

      // Expanding glow ring
      ctx.beginPath()
      ctx.arc(cell.x, cell.y, r * 0.32 + g * 3.5, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(167,139,250,${g * 0.11})`
      ctx.lineWidth   = 0.7
      ctx.stroke()
    },

    /** Traces a flat-top regular hexagon centred at (cx, cy) with circumradius r. */
    traceHex(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
      ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const a  = (Math.PI / 3) * i - Math.PI / 6
        const px = cx + r * Math.cos(a)
        const py = cy + r * Math.sin(a)
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
      }
      ctx.closePath()
    },

    // ── Plan CTA ─────────────────────────────────────────────────────────────

    handlePlanCta(planId: string): void {
      if (planId === 'enterprise') {
        window.open(`mailto:${CONTACT_EMAIL}?subject=ResoPulse Enterprise Inquiry`, '_blank')
        return
      }
      window.open(`mailto:${CONTACT_EMAIL}?subject=ResoPulse ${planId} Upgrade`, '_blank')
    },
  },
})
</script>

<style lang="scss" scoped>
.pricing {
  min-height: 100vh;

  /* ── Fixed ambient background ───────────────────────────────────────── */
  &__bg {
    position: fixed;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    overflow: hidden;
  }

  &__hex-canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }

  &__wave {
    position: absolute;
    left: 0;
    width: 200%;
    will-change: transform;

    path { fill: none; vector-effect: non-scaling-stroke; }

    // Wide cyan — large amplitude 48px, dramatic oscillation at 12%
    &--1 {
      top: 12%;
      height: 120px;
      path { stroke: color-mix(in srgb, var(--color-primary) 24%, transparent); stroke-width: 1.8; }
      animation: wave-scroll 10s linear infinite;
    }

    // Medium purple — smaller amplitude 28px, graceful at 38%
    &--2 {
      top: 38%;
      height: 100px;
      path { stroke: color-mix(in srgb, var(--color-purple) 22%, transparent); stroke-width: 1.5; }
      animation: wave-scroll 16s linear infinite reverse;
    }

    // Narrow cyan — wispy amplitude 15px, tight crests at 61%
    &--3 {
      top: 61%;
      height: 80px;
      path { stroke: color-mix(in srgb, var(--color-primary) 13%, transparent); stroke-width: 1.1; }
      animation: wave-scroll 24s linear infinite;
    }

    // Wide purple inverted phase — medium-large amplitude 40px at 83%
    &--4 {
      top: 83%;
      height: 110px;
      path { stroke: color-mix(in srgb, var(--color-purple) 16%, transparent); stroke-width: 1.6; }
      animation: wave-scroll 30s linear infinite reverse;
    }
  }

  /* ── All sections sit above the fixed bg ────────────────────────────── */
  &__hero,
  &__values,
  &__plans,
  &__credits,
  &__faq,
  &__bottom-cta {
    position: relative;
    z-index: 1;
  }

  /* ── Hero ─────────────────────────────────────────────────────────── */
  &__hero {
    padding: 7rem 1.5rem 5.5rem;
    text-align: center;
    background:
      radial-gradient(ellipse 80% 60% at 15% 0%, color-mix(in srgb, var(--color-primary) 12%, transparent), transparent 60%),
      radial-gradient(ellipse 60% 50% at 85% 0%, color-mix(in srgb, var(--color-purple) 10%, transparent), transparent 55%);

    @media (max-width: 768px) { padding: 5rem 1rem 3.5rem; }
  }

  &__hero-inner {
    max-width: 720px;
    margin: 0 auto;
    animation: pricing-fade-up 0.7s ease both;
  }

  &__hero-tag {
    @include mono-upper(var(--fs-xxs), 0.12em);
    display: inline-block;
    padding: 0.3rem 0.85rem;
    border: 1px solid var(--color-purple-border);
    border-radius: 20px;
    color: var(--color-purple-light);
    background: var(--color-purple-surface);
    margin-bottom: 1.5rem;
  }

  &__hero-headline {
    font-size: clamp(1.9rem, 5vw, 3.3rem);
    font-weight: 800;
    line-height: 1.15;
    letter-spacing: -0.025em;
    margin: 0 0 1.25rem;
    background: linear-gradient(125deg, var(--color-text-heading) 0%, var(--color-primary) 40%, var(--color-purple-light) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  &__hero-sub {
    font-size: clamp(var(--fs-lg), 2vw, 1rem);
    color: var(--color-text-muted);
    line-height: 1.7;
    max-width: 580px;
    margin: 0 auto 2.5rem;
  }

  &__hero-actions {
    @include flex-row(0.9rem);
    justify-content: center;
    flex-wrap: wrap;
  }

  &__hero-cta {
    @include mono-upper(var(--fs-sm), 0.06em);
    padding: 0.7rem 1.6rem;
    border-radius: var(--radius);
    text-decoration: none;
    transition: filter var(--tr-fast), box-shadow var(--tr-fast), border-color var(--tr-fast);
    white-space: nowrap;

    &--primary {
      background: linear-gradient(135deg, var(--color-primary), color-mix(in srgb, var(--color-purple) 40%, var(--color-primary)));
      border: 1px solid transparent;
      color: var(--color-bg);
      font-weight: 700;

      &:hover {
        filter: brightness(1.15);
        box-shadow: 0 0 28px color-mix(in srgb, var(--color-purple) 30%, transparent), var(--glow-sm);
      }
    }

    &--secondary {
      background: transparent;
      border: 1px solid var(--color-border);
      color: var(--color-text-muted);

      &:hover { border-color: var(--color-purple-border); color: var(--color-purple-light); }
    }
  }

  /* ── Value props ──────────────────────────────────────────────────── */
  &__values {
    padding: 4rem 1.5rem;
    max-width: 1100px;
    margin: 0 auto;

    @media (max-width: 768px) { padding: 2.5rem 1rem; }
  }

  &__value-card--lead {
    position: relative;

    &::before {
      content: '';
      position: absolute;
      inset: -1px;
      border-radius: inherit;
      pointer-events: none;
      box-shadow: 0 0 24px color-mix(in srgb, var(--color-primary) 30%, transparent);
      opacity: 0.7;
    }
  }

  &__values-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1.25rem;

    @media (max-width: 1200px) { grid-template-columns: repeat(2, 1fr); }
    @media (max-width: 640px)  { grid-template-columns: 1fr; gap: 1rem; }
  }

  &__value-card {
    @include surface-card(var(--radius-lg), 1.75rem);
    border: 1px solid var(--color-border);
    @include flex-col(0.9rem);
    background: color-mix(in srgb, var(--color-surface) 80%, transparent);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    transition: border-color var(--tr-normal), box-shadow var(--tr-normal), transform var(--tr-normal);

    &:hover { transform: translateY(-3px); }

    &--cyan:hover {
      border-color: var(--color-primary-border);
      box-shadow: 0 4px 28px color-mix(in srgb, var(--color-primary) 10%, transparent);
    }

    &--purple:hover {
      border-color: var(--color-purple-border);
      box-shadow: 0 4px 28px color-mix(in srgb, var(--color-purple) 14%, transparent);
    }
  }

  &__value-icon {
    width: 44px;
    height: 44px;
    flex-shrink: 0;

    .pricing__value-card--cyan &   { color: var(--color-primary); }
    .pricing__value-card--purple & { color: var(--color-purple-light); }
  }

  &__value-title {
    font-size: var(--fs-xl);
    font-weight: 700;
    color: var(--color-text-heading);
    margin: 0;
  }

  &__value-desc {
    font-size: var(--fs-md);
    color: var(--color-text-muted);
    line-height: 1.65;
    margin: 0;
  }

  /* ── Shared section header ────────────────────────────────────────── */
  &__section-head {
    text-align: center;
    max-width: 600px;
    margin: 0 auto 2.5rem;
    @include flex-col(0.5rem);
    align-items: center;
  }

  &__section-title {
    font-size: clamp(1.3rem, 3vw, 1.9rem);
    font-weight: 700;
    color: var(--color-text-heading);
    margin: 0;
    letter-spacing: -0.01em;
  }

  &__section-sub {
    font-size: var(--fs-md);
    color: var(--color-text-muted);
    margin: 0;
    line-height: 1.6;
  }

  /* ── Plans ────────────────────────────────────────────────────────── */
  &__plans {
    padding: 3rem 1.5rem 4.5rem;
    max-width: 1100px;
    margin: 0 auto;

    @media (max-width: 768px) { padding: 2rem 1rem 3rem; }
  }

  &__plans-orb {
    position: absolute;
    top: -80px;
    right: -120px;
    width: 520px;
    height: 520px;
    background: radial-gradient(ellipse, color-mix(in srgb, var(--color-purple) 9%, transparent) 0%, transparent 70%);
    pointer-events: none;
    z-index: 0;

    @media (max-width: 768px) { display: none; }
  }

  &__plans-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
    align-items: stretch;
    position: relative;
    z-index: 1;

    @media (max-width: 1000px) { grid-template-columns: repeat(2, 1fr); }
    @media (max-width: 520px)  { grid-template-columns: 1fr; }
  }

  &__plan {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
    @include surface-card(var(--radius-lg), 1.5rem);
    background: color-mix(in srgb, var(--color-surface) 85%, transparent);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid var(--color-border);
    animation: pricing-card-enter 0.5s ease both;
    transition: border-color var(--tr-normal), box-shadow var(--tr-normal), transform var(--tr-normal);

    &:hover {
      border-color: var(--color-primary-border);
      transform: translateY(-3px);
    }

    &--featured {
      background: linear-gradient(160deg,
        color-mix(in srgb, var(--color-primary) 6%, var(--color-surface)) 0%,
        color-mix(in srgb, var(--color-purple) 9%, var(--color-surface)) 100%
      );
      border-color: var(--color-purple-border);
      animation: pricing-card-enter 0.5s ease both, glow-pulse 3.5s ease-in-out infinite;

      &:hover { transform: translateY(-5px); border-color: var(--color-purple-border); }
    }

    &--current { border-color: var(--color-primary-border); }
  }

  &__plan-badge {
    position: absolute;
    top: -12px;
    left: 50%;
    transform: translateX(-50%);
    @include mono-upper(0.58rem, 0.1em);
    padding: 0.15rem 0.75rem;
    background: linear-gradient(90deg, var(--color-primary), var(--color-purple-light));
    color: var(--color-bg);
    border-radius: 20px;
    white-space: nowrap;
    font-weight: 700;
  }

  &__plan-top {
    @include flex-col(0.35rem);
    flex-shrink: 0;
  }

  &__plan-name {
    @include mono-upper(var(--fs-xs), 0.09em);
    color: var(--color-text-muted);
    font-weight: 700;
  }

  &__plan-price {
    @include flex-row(0.3rem);
    align-items: baseline;
    margin-top: 0.3rem;
  }

  &__plan-amount {
    font-size: 2.1rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--color-text-heading);
    line-height: 1;

    .pricing__plan--featured & {
      background: linear-gradient(135deg, var(--color-primary), var(--color-purple-light));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
  }

  &__plan-period {
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    color: var(--color-text-muted);
  }

  &__plan-quota {
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    color: var(--color-primary);

    .pricing__plan--featured & { color: var(--color-purple-light); }
  }

  &__plan-seats {
    font-family: var(--font-mono);
    font-size: var(--fs-xxs);
    color: var(--color-text-muted);
    opacity: var(--op-dim);
  }

  &__plan-features {
    list-style: none;
    margin: 0;
    padding: 0;
    @include flex-col(0.45rem);
    border-top: 1px solid var(--color-border);
    padding-top: 0.9rem;
    flex: 1;
  }

  &__plan-feature {
    @include flex-row(0.45rem);
    font-size: var(--fs-sm);
    color: var(--color-text-muted);
    align-items: flex-start;
  }

  &__plan-check {
    color: var(--color-primary);
    flex-shrink: 0;
    font-size: 0.7rem;
    margin-top: 0.12rem;

    .pricing__plan--featured & { color: var(--color-purple-light); }
  }

  &__plan-cta {
    @include mono-upper(var(--fs-xxs), 0.07em);
    width: 100%;
    padding: 0.55rem 0.75rem;
    border-radius: var(--radius);
    border: 1px solid var(--color-primary-border);
    background: var(--color-primary-surface);
    color: var(--color-primary);
    cursor: pointer;
    transition: background var(--tr-fast), box-shadow var(--tr-fast), filter var(--tr-fast);
    margin-top: auto;
    flex-shrink: 0;

    &:hover:not(:disabled) {
      background: var(--color-primary-dim);
      box-shadow: var(--glow-sm);
    }

    &--featured {
      background: linear-gradient(135deg, var(--color-primary), var(--color-purple-light));
      color: var(--color-bg);
      border-color: transparent;
      font-weight: 700;

      &:hover:not(:disabled) {
        filter: brightness(1.12);
        box-shadow: 0 0 20px color-mix(in srgb, var(--color-purple) 30%, transparent), var(--glow-sm);
      }
    }

    &--current {
      background: transparent;
      border-color: var(--color-border);
      color: var(--color-text-muted);
      cursor: default;
    }

    &:disabled { opacity: var(--op-dim); cursor: default; }
  }

  /* ── Credits table ────────────────────────────────────────────────── */
  &__credits {
    padding: 4rem 1.5rem;
    background: color-mix(in srgb, var(--color-purple) 3%, var(--color-surface));
    border-top: 1px solid var(--color-border);
    border-bottom: 1px solid var(--color-border);

    @media (max-width: 768px) { padding: 2.5rem 1rem; }
  }

  &__credits-table {
    max-width: 640px;
    margin: 0 auto;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    background: color-mix(in srgb, var(--color-surface) 90%, transparent);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  }

  &__credits-row {
    @include flex-between();
    padding: 0.7rem 1.25rem;
    border-bottom: 1px solid var(--color-border);

    &:last-child { border-bottom: none; }

    &:nth-child(even) {
      background: color-mix(in srgb, var(--color-purple) 5%, transparent);
    }
  }

  &__credits-op {
    font-size: var(--fs-sm);
    color: var(--color-text-muted);
  }

  &__credits-cost {
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    color: var(--color-purple-light);
    font-weight: 600;
  }

  /* ── FAQ ──────────────────────────────────────────────────────────── */
  &__faq {
    padding: 3.5rem 1.5rem 4rem;
    max-width: 720px;
    margin: 0 auto;

    @media (max-width: 768px) { padding: 2rem 1rem; }
  }

  &__faq-list {
    @include flex-col(0);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    background: color-mix(in srgb, var(--color-surface) 82%, transparent);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  }

  &__faq-item {
    border-bottom: 1px solid var(--color-border);
    cursor: pointer;
    transition: background var(--tr-fast);

    &:last-child { border-bottom: none; }
    &:hover { background: color-mix(in srgb, var(--color-purple) 5%, transparent); }
    &--open { background: color-mix(in srgb, var(--color-purple) 7%, var(--color-surface)); }
  }

  &__faq-q {
    @include flex-between();
    padding: 1rem 1.25rem;
    font-size: var(--fs-md);
    font-weight: 600;
    color: var(--color-text-heading);
    gap: 1rem;
  }

  &__faq-chevron {
    font-size: var(--fs-md);
    color: var(--color-text-muted);
    flex-shrink: 0;
    transition: transform var(--tr-fast), color var(--tr-fast);

    &--open { transform: rotate(180deg); color: var(--color-purple-light); }
  }

  &__faq-a {
    padding: 0 1.25rem 1rem;
    font-size: var(--fs-sm);
    color: var(--color-text-muted);
    line-height: 1.7;
  }

  /* ── Bottom CTA ───────────────────────────────────────────────────── */
  &__bottom-cta {
    position: relative;
    padding: 5.5rem 1.5rem 6.5rem;
    text-align: center;
    overflow: hidden;
    background:
      radial-gradient(ellipse 90% 90% at 50% 110%, color-mix(in srgb, var(--color-purple) 18%, transparent), transparent 65%),
      radial-gradient(ellipse 60% 50% at 50% 100%, color-mix(in srgb, var(--color-primary) 6%, transparent), transparent 60%);
    border-top: 1px solid color-mix(in srgb, var(--color-purple) 25%, var(--color-border));

    @media (max-width: 768px) { padding: 3.5rem 1rem 4.5rem; }
  }

  // Hex dot grid — mirrors the sign-up page background texture
  &__bottom-cta-grid {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(color-mix(in srgb, var(--color-purple) 7%, transparent) 1px, transparent 1px),
      linear-gradient(90deg, color-mix(in srgb, var(--color-purple) 7%, transparent) 1px, transparent 1px);
    background-size: 48px 48px;
    mask-image: radial-gradient(ellipse 80% 75% at 50% 100%, black 10%, transparent 75%);
    -webkit-mask-image: radial-gradient(ellipse 80% 75% at 50% 100%, black 10%, transparent 75%);
    pointer-events: none;
  }

  &__bottom-cta-inner {
    position: relative;
    z-index: 1;
    max-width: 560px;
    margin: 0 auto;
    @include flex-col(1.25rem);
    align-items: center;
  }

  &__bottom-cta-headline {
    font-size: clamp(1.5rem, 3.5vw, 2.3rem);
    font-weight: 800;
    letter-spacing: -0.02em;
    margin: 0;
    background: linear-gradient(125deg, var(--color-text-heading) 0%, var(--color-purple-light) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  &__bottom-cta-sub {
    font-size: var(--fs-md);
    color: var(--color-text-muted);
    line-height: 1.65;
    margin: 0;
  }

  &__bottom-cta-actions {
    @include flex-col(0.75rem);
    align-items: center;
  }

  &__bottom-cta-btn {
    @include mono-upper(var(--fs-sm), 0.07em);
    padding: 0.8rem 2.5rem;
    background: linear-gradient(135deg, var(--color-primary), var(--color-purple-light));
    border: 1px solid transparent;
    border-radius: var(--radius);
    color: var(--color-bg);
    text-decoration: none;
    font-weight: 700;
    transition: filter var(--tr-fast), box-shadow var(--tr-fast);

    &:hover {
      filter: brightness(1.12);
      box-shadow: 0 0 30px color-mix(in srgb, var(--color-purple) 35%, transparent), var(--glow-sm);
    }
  }

  &__bottom-cta-link {
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    color: var(--color-text-muted);
    text-decoration: none;
    opacity: var(--op-dim);
    transition: opacity var(--tr-fast), color var(--tr-fast);

    &:hover { opacity: 1; color: var(--color-purple-light); }
  }
}
</style>
