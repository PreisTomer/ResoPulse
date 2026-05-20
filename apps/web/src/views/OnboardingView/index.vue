<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <div class="onboarding">
    <div class="onboarding__layout">

      <RouterLink :to="ROUTE.HOME" class="onboarding__brand">
        <img src="/logo.png" alt="SimBiotix" class="onboarding__brand-logo" />
        <span class="onboarding__brand-name">Sim<span class="onboarding__brand-accent">Biotix</span></span>
      </RouterLink>

      <div class="onboarding__steps-bar">
        <span
          v-for="n in totalSteps"
          :key="n"
          class="onboarding__pip"
          :class="{
            'onboarding__pip--active': step === n,
            'onboarding__pip--done':   step > n,
          }"
        >{{ n }}</span>
      </div>

      <!-- ── Step 1: Create organization ─────────────────────────────── -->
      <section v-if="step === 1" class="onboarding__card">
        <header class="onboarding__card-header">
          <span class="onboarding__card-eyebrow">{{ $t('onboarding.step1Label') }}</span>
          <h1 class="onboarding__card-title">{{ $t('onboarding.orgTitle') }}</h1>
          <p class="onboarding__card-desc">{{ $t('onboarding.orgDesc') }}</p>
        </header>

        <form class="onboarding__form" @submit.prevent="submitCreateOrg">
          <label class="onboarding__field">
            <span class="onboarding__field-label">{{ $t('onboarding.orgNameLabel') }}</span>
            <input
              v-model="orgName"
              type="text"
              class="onboarding__input"
              :placeholder="$t('onboarding.orgNamePlaceholder')"
              maxlength="60"
              required
            />
            <span v-if="nameError" class="onboarding__error">{{ nameError }}</span>
          </label>

          <label class="onboarding__field">
            <span class="onboarding__field-label">{{ $t('onboarding.orgSlugLabel') }} <span class="onboarding__optional">{{ $t('onboarding.optional') }}</span></span>
            <input
              v-model="orgSlug"
              type="text"
              class="onboarding__input"
              placeholder="acme-bio"
              maxlength="40"
              @input="onSlugInput"
            />
            <span v-if="slugError" class="onboarding__error">{{ slugError }}</span>
          </label>

          <span v-if="submitError" class="onboarding__error onboarding__error--block">{{ submitError }}</span>

          <button type="submit" class="onboarding__btn onboarding__btn--primary" :disabled="isSubmitting">
            {{ isSubmitting ? $t('onboarding.creating') : $t('onboarding.createOrg') }}
          </button>
        </form>
      </section>

      <!-- ── Step 2: Pick target molecule type ───────────────────────── -->
      <section v-else-if="step === 2" class="onboarding__card">
        <header class="onboarding__card-header">
          <span class="onboarding__card-eyebrow">{{ $t('onboarding.step2Label') }}</span>
          <h1 class="onboarding__card-title">{{ $t('onboarding.moleculeTitle') }}</h1>
          <p class="onboarding__card-desc">{{ $t('onboarding.moleculeDesc') }}</p>
        </header>

        <div class="onboarding__option-grid">
          <button
            v-for="meta in molecules"
            :key="meta.id"
            class="onboarding__option-card"
            :class="{ 'onboarding__option-card--selected': moleculeType === meta.id }"
            :data-category="meta.category"
            @click="selectMolecule(meta.id)"
          >
            <span class="onboarding__option-label">{{ meta.label }}</span>
            <span class="onboarding__option-desc">{{ meta.shortLabel }}</span>
          </button>
        </div>

        <div class="onboarding__actions">
          <button class="onboarding__btn onboarding__btn--ghost" @click="finishWithoutCampaign">{{ $t('onboarding.skipForNow') }}</button>
          <button class="onboarding__btn onboarding__btn--primary" :disabled="!moleculeType" @click="step = 3">{{ $t('onboarding.next') }}</button>
        </div>
      </section>

      <!-- ── Step 3: Pick biggest challenge ──────────────────────────── -->
      <section v-else-if="step === 3" class="onboarding__card">
        <header class="onboarding__card-header">
          <span class="onboarding__card-eyebrow">{{ $t('onboarding.step3Label') }}</span>
          <h1 class="onboarding__card-title">{{ $t('onboarding.challengeTitle') }}</h1>
          <p class="onboarding__card-desc">{{ $t('onboarding.challengeDesc') }}</p>
        </header>

        <div class="onboarding__challenge-list">
          <button
            v-for="opt in challenges"
            :key="opt.value"
            class="onboarding__challenge-card"
            :class="{ 'onboarding__challenge-card--selected': challenge === opt.value }"
            @click="challenge = opt.value"
          >
            <span class="onboarding__challenge-label">{{ $t(opt.labelKey) }}</span>
            <span class="onboarding__challenge-desc">{{ $t(opt.descKey) }}</span>
          </button>
        </div>

        <div class="onboarding__actions">
          <button class="onboarding__btn onboarding__btn--ghost" @click="step = 2">{{ $t('onboarding.back') }}</button>
          <button class="onboarding__btn onboarding__btn--primary" :disabled="!challenge" @click="finishWithCampaign">{{ $t('onboarding.finish') }}</button>
        </div>
      </section>

    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useClerk } from '@clerk/vue'

import { ROUTE } from '@/constants/routes'
import { ICON } from '@/constants/icons'
import {
  ALL_MOLECULE_TYPES, MOLECULE_TYPE,
  type MoleculeType,
} from '@/constants/moleculeTypes'

import { useAuthStore } from '@/stores/authStore'
import { useProductionCampaignStore } from '@/stores/productionCampaignStore'

type Challenge = 'cell-line' | 'transfection' | 'clone-screening' | 'downstream'

interface ChallengeOption {
  value:    Challenge
  labelKey: string
  descKey:  string
  routeTo:  string
}

const CHALLENGES: ChallengeOption[] = [
  { value: 'cell-line',        labelKey: 'onboarding.challengeCellLineLabel',        descKey: 'onboarding.challengeCellLineDesc',        routeTo: ROUTE.CELL_ENGINEERING },
  { value: 'transfection',     labelKey: 'onboarding.challengeTransfectionLabel',    descKey: 'onboarding.challengeTransfectionDesc',    routeTo: ROUTE.CELL_ENGINEERING },
  { value: 'clone-screening',  labelKey: 'onboarding.challengeCloneLabel',           descKey: 'onboarding.challengeCloneDesc',           routeTo: ROUTE.CLONE_UPSTREAM },
  { value: 'downstream',       labelKey: 'onboarding.challengeDownstreamLabel',      descKey: 'onboarding.challengeDownstreamDesc',      routeTo: ROUTE.DOWNSTREAM },
]

export default defineComponent({
  name: 'OnboardingView',
  setup() {
    const clerk     = useClerk()
    const authStore = useAuthStore()
    return { clerk, authStore }
  },
  data() {
    return {
      step:         1 as 1 | 2 | 3,
      totalSteps:   3,
      // Step 1
      orgName:      '',
      orgSlug:      '',
      nameError:    '',
      slugError:    '',
      submitError:  '',
      isSubmitting: false,
      // Step 2
      moleculeType: null as MoleculeType | null,
      // Step 3
      challenge:    null as Challenge | null,
    }
  },
  computed: {
    ROUTE() { return ROUTE },
    ICON()  { return ICON },
    molecules() {
      return ALL_MOLECULE_TYPES.filter(m => m.id !== MOLECULE_TYPE.OTHER)
    },
    challenges() {
      return CHALLENGES
    },
  },
  methods: {
    onSlugInput() {
      this.slugError = ''
      this.orgSlug = this.orgSlug.toLowerCase().replace(/[^a-z0-9-]/g, '-')
    },
    validateForm(): boolean {
      let valid = true
      if (!this.orgName.trim()) {
        this.nameError = this.$t('onboarding.errorNameRequired')
        valid = false
      }
      if (this.orgSlug && !/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(this.orgSlug)) {
        this.slugError = this.$t('onboarding.errorSlugFormat')
        valid = false
      }
      return valid
    },
    async submitCreateOrg() {
      if (!this.validateForm()) return
      this.isSubmitting = true
      this.submitError  = ''
      try {
        if (!this.clerk) throw new Error(this.$t('onboarding.errorNoClerk'))
        const org = await this.clerk.createOrganization({
          name: this.orgName.trim(),
          slug: this.orgSlug || undefined,
        })
        await this.clerk.setActive?.({ organization: org.id })
        this.step = 2
      } catch (err) {
        const msg = (err as { errors?: { message: string }[] })?.errors?.[0]?.message
        this.submitError = msg ?? this.$t('onboarding.errorGeneric')
      } finally {
        this.isSubmitting = false
      }
    },
    selectMolecule(id: MoleculeType) {
      this.moleculeType = id
    },
    finishWithoutCampaign() {
      this.authStore.completeOnboarding()
      this.$router.push(ROUTE.CAMPAIGNS)
    },
    finishWithCampaign() {
      if (!this.moleculeType || !this.challenge) return
      const campaignStore = useProductionCampaignStore()
      const opt = CHALLENGES.find(c => c.value === this.challenge)
      const campaign = campaignStore.createCampaign({
        name: `${this.orgName || 'My'} first campaign`,
        moleculeType: this.moleculeType,
        setActive: true,
      })
      this.authStore.completeOnboarding()
      this.$router.push({ path: opt?.routeTo ?? ROUTE.CAMPAIGNS, query: { campaign: campaign.id } })
    },
  },
})
</script>

<style lang="scss" scoped>
.onboarding {
  min-height: 100vh;
  background:
    radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--color-primary) 8%, transparent) 0%, transparent 50%),
    var(--color-bg);
  padding: 2rem 1.5rem 4rem;
  display: flex;
  justify-content: center;
}

.onboarding__layout {
  width: 100%;
  max-width: 620px;
  @include flex-col(1.5rem);
  align-items: stretch;
}

.onboarding__brand {
  @include flex-row(0.6rem);
  align-items: center;
  text-decoration: none;
  color: var(--color-text);
  align-self: center;

  &-logo {
    width: 30px;
    height: 30px;
  }

  &-name {
    font-weight: 700;
    font-size: 1.1rem;
  }

  &-accent {
    color: var(--color-primary);
  }
}

.onboarding__steps-bar {
  @include flex-row(0.5rem);
  justify-content: center;
}

.onboarding__pip {
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 50%;
  @include inline-flex-center;
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  font-weight: 600;
  background: color-mix(in srgb, var(--color-text) 8%, transparent);
  color: var(--color-text-muted);
  transition: background var(--tr-fast), color var(--tr-fast);

  &--active {
    background: var(--color-primary);
    color: var(--color-bg);
  }

  &--done {
    background: color-mix(in srgb, var(--color-ok) 25%, transparent);
    color: var(--color-ok);
  }
}

.onboarding__card {
  @include flex-col(1.5rem);
  padding: 2rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: 0 8px 32px color-mix(in srgb, black 35%, transparent);
  animation: onboardingCardFade 240ms ease-out;

  &-header {
    @include flex-col(0.4rem);
  }

  &-eyebrow {
    @include mono-upper(var(--fs-xs), 0.1em);
    color: var(--color-primary);
    opacity: var(--op-partial);
  }

  &-title {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--color-text-heading);
  }

  &-desc {
    margin: 0;
    opacity: var(--op-partial);
    line-height: 1.5;
    font-size: var(--fs-md);
  }
}

.onboarding__form {
  @include flex-col(1.25rem);
}

.onboarding__field {
  @include flex-col(0.4rem);
}

.onboarding__field-label {
  @include mono-upper(var(--fs-xs));
  opacity: var(--op-partial);
}

.onboarding__optional {
  opacity: var(--op-muted);
  margin-left: 0.4rem;
}

.onboarding__input {
  padding: 0.7rem 0.9rem;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  color: var(--color-text);
  font-size: var(--fs-lg);
  transition: border-color var(--tr-fast);

  &:focus {
    outline: none;
    border-color: var(--color-primary);
  }
}

.onboarding__error {
  font-size: var(--fs-sm);
  color: var(--color-danger);

  &--block {
    padding: 0.6rem 0.8rem;
    background: color-mix(in srgb, var(--color-danger) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-danger) 30%, transparent);
    border-radius: var(--radius);
  }
}

.onboarding__option-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 0.6rem;
}

.onboarding__option-card {
  @include flex-col(0.2rem);
  text-align: left;
  padding: 0.85rem 1rem;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  cursor: pointer;
  transition: border-color var(--tr-fast), background var(--tr-fast), transform var(--tr-fast);

  &:hover {
    border-color: color-mix(in srgb, var(--color-primary) 40%, var(--color-border));
    transform: translateY(-1px);
  }

  &--selected {
    border-color: var(--color-primary);
    background: color-mix(in srgb, var(--color-primary) 8%, var(--color-surface-2));
  }
}

.onboarding__option-label {
  font-size: var(--fs-md);
  font-weight: 600;
  color: var(--color-text);
}

.onboarding__option-desc {
  font-size: var(--fs-xs);
  opacity: var(--op-muted);
}

.onboarding__challenge-list {
  @include flex-col(0.6rem);
}

.onboarding__challenge-card {
  @include flex-col(0.3rem);
  text-align: left;
  padding: 1rem 1.1rem;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  cursor: pointer;
  transition: border-color var(--tr-fast), background var(--tr-fast);

  &:hover {
    border-color: color-mix(in srgb, var(--color-primary) 40%, var(--color-border));
  }

  &--selected {
    border-color: var(--color-primary);
    background: color-mix(in srgb, var(--color-primary) 8%, var(--color-surface-2));
  }
}

.onboarding__challenge-label {
  font-size: var(--fs-lg);
  font-weight: 600;
  color: var(--color-text-heading);
}

.onboarding__challenge-desc {
  font-size: var(--fs-md);
  opacity: var(--op-partial);
  line-height: 1.5;
}

.onboarding__actions {
  @include flex-between();
  margin-top: 0.5rem;
}

.onboarding__btn {
  @include mono-upper(var(--fs-sm));
  padding: 0.7rem 1.3rem;
  border-radius: var(--radius);
  cursor: pointer;
  border: 1px solid transparent;
  transition: background var(--tr-fast), border-color var(--tr-fast), opacity var(--tr-fast);

  &--primary {
    background: var(--color-primary);
    color: var(--color-bg);

    &:hover:not(:disabled) {
      background: color-mix(in srgb, var(--color-primary) 90%, white);
    }

    &:disabled {
      opacity: var(--op-ghost);
      cursor: not-allowed;
    }
  }

  &--ghost {
    background: transparent;
    border-color: var(--color-border);
    color: var(--color-text);

    &:hover {
      background: color-mix(in srgb, var(--color-text) 6%, transparent);
    }
  }
}

@keyframes onboardingCardFade {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
</style>
