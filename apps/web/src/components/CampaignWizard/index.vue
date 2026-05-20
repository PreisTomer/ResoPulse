<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <div class="wizard-overlay" @click.self="$emit('close')">
    <div class="wizard" role="dialog" aria-labelledby="wizard-title">
      <header class="wizard__header">
        <h2 id="wizard-title" class="wizard__title">{{ $t('campaign.wizard.title') }}</h2>
        <p class="wizard__subtitle">{{ $t('campaign.wizard.subtitle') }}</p>
        <div class="wizard__steps">
          <span
            v-for="n in 3"
            :key="n"
            class="wizard__step-pip"
            :class="{
              'wizard__step-pip--active': step === n,
              'wizard__step-pip--done':   step > n,
            }"
          >{{ n }}</span>
        </div>
        <button class="wizard__close" :aria-label="$t('campaign.wizard.cancel')" @click="$emit('close')">{{ ICON.CLOSE }}</button>
      </header>

      <div class="wizard__body">

        <section v-if="step === 1" class="wizard__step">
          <h3 class="wizard__heading">{{ $t('campaign.wizard.step1Heading') }}</h3>
          <p class="wizard__help">{{ $t('campaign.wizard.step1Help') }}</p>
          <div class="wizard__option-grid">
            <button
              v-for="meta in molecules"
              :key="meta.id"
              class="wizard__molecule-card"
              :class="{ 'wizard__molecule-card--selected': moleculeType === meta.id }"
              :data-category="meta.category"
              @click="selectMolecule(meta.id)"
            >
              <span class="wizard__molecule-label">{{ meta.label }}</span>
              <span class="wizard__molecule-desc">{{ meta.description }}</span>
            </button>
          </div>
        </section>

        <section v-else-if="step === 2" class="wizard__step">
          <h3 class="wizard__heading">{{ $t('campaign.wizard.step2Heading') }}</h3>
          <p class="wizard__help">{{ $t('campaign.wizard.step2Help') }}</p>
          <input
            ref="nameInput"
            v-model="name"
            type="text"
            class="wizard__name-input"
            :placeholder="$t('campaign.wizard.step2Placeholder')"
            maxlength="80"
            @keyup.enter="canAdvance && advance()"
          />
          <span class="wizard__name-counter">{{ name.length }}/80</span>
        </section>

        <section v-else-if="step === 3" class="wizard__step">
          <h3 class="wizard__heading">{{ $t('campaign.wizard.step3Heading') }}</h3>
          <p class="wizard__help">{{ $t('campaign.wizard.step3Help') }}</p>
          <div class="wizard__module-list">
            <button
              v-for="opt in moduleOptions"
              :key="opt.value"
              class="wizard__module-card"
              :class="{ 'wizard__module-card--selected': startModule === opt.value }"
              :disabled="opt.disabled"
              @click="selectStartModule(opt.value)"
            >
              <span class="wizard__module-label">{{ opt.label }}</span>
              <span class="wizard__module-desc">{{ opt.description }}</span>
            </button>
          </div>
        </section>

      </div>

      <footer class="wizard__footer">
        <button class="wizard__btn wizard__btn--secondary" @click="back">
          {{ step === 1 ? $t('campaign.wizard.cancel') : $t('campaign.wizard.back') }}
        </button>
        <button
          class="wizard__btn wizard__btn--primary"
          :disabled="!canAdvance"
          @click="advance"
        >
          {{ step < 3 ? $t('campaign.wizard.next') : $t('campaign.wizard.create') }}
        </button>
      </footer>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { ROUTE } from '@/constants/routes'
import { ICON } from '@/constants/icons'
import { ALL_MOLECULE_TYPES, MOLECULE_TYPE, type MoleculeType } from '@/constants/moleculeTypes'

import { useProductionCampaignStore } from '@/stores/productionCampaignStore'

type StartModule = 'cell-engineering' | 'downstream'

export default defineComponent({
  name: 'CampaignWizard',
  emits: ['close'],
  data() {
    return {
      step:          1 as 1 | 2 | 3,
      moleculeType:  null as MoleculeType | null,
      name:          '',
      startModule:   'cell-engineering' as StartModule,
    }
  },
  computed: {
    ICON() { return ICON },
    molecules() { return ALL_MOLECULE_TYPES.filter(m => m.id !== MOLECULE_TYPE.OTHER).concat(ALL_MOLECULE_TYPES.filter(m => m.id === MOLECULE_TYPE.OTHER)) },
    canAdvance(): boolean {
      if (this.step === 1) return this.moleculeType !== null
      if (this.step === 2) return this.name.trim().length > 0
      return true
    },
    moduleOptions() {
      return [
        { value: 'cell-engineering' as StartModule, label: this.$t('campaign.wizard.moduleStartCellEng'),     description: this.$t('campaign.wizard.moduleStartCellEngDesc'),     disabled: false },
        { value: 'downstream' as StartModule,       label: this.$t('campaign.wizard.moduleStartDownstream'), description: this.$t('campaign.wizard.moduleStartDownstreamDesc'), disabled: false },
      ]
    },
  },
  methods: {
    selectMolecule(id: MoleculeType) {
      this.moleculeType = id
    },
    selectStartModule(m: StartModule) {
      this.startModule = m
    },
    advance() {
      if (!this.canAdvance) return
      if (this.step < 3) {
        this.step = (this.step + 1) as 1 | 2 | 3
        if (this.step === 2) {
          this.$nextTick(() => (this.$refs.nameInput as HTMLInputElement | undefined)?.focus())
        }
        return
      }
      this.create()
    },
    back() {
      if (this.step === 1) {
        this.$emit('close')
        return
      }
      this.step = (this.step - 1) as 1 | 2 | 3
    },
    create() {
      if (!this.moleculeType) return
      const store = useProductionCampaignStore()
      const campaign = store.createCampaign({ name: this.name.trim(), moleculeType: this.moleculeType, setActive: true })
      this.$emit('close')
      const target = this.startModule === 'downstream' ? ROUTE.DOWNSTREAM : ROUTE.CELL_ENGINEERING
      this.$router.push({ path: target, query: { campaign: campaign.id } })
    },
  },
})
</script>

<style lang="scss" scoped>
.wizard-overlay {
  position: fixed;
  inset: 0;
  background: color-mix(in srgb, black 60%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 1.5rem;
  animation: wizardFade 180ms ease-out;
}

.wizard {
  width: 100%;
  max-width: 680px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: 0 24px 64px color-mix(in srgb, black 50%, transparent);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  animation: wizardLift 220ms ease-out;

  &__header {
    padding: 1.5rem 1.75rem 1rem;
    border-bottom: 1px solid var(--color-border);
    position: relative;
  }

  &__title {
    margin: 0 0 0.25rem;
    font-size: 1.35rem;
    font-weight: 600;
    color: var(--color-text-heading);
  }

  &__subtitle {
    margin: 0 0 1rem;
    font-size: var(--fs-md);
    opacity: var(--op-partial);
  }

  &__steps {
    @include flex-row(0.5rem);
  }

  &__step-pip {
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

  &__close {
    position: absolute;
    top: 1rem;
    right: 1rem;
    background: transparent;
    border: none;
    color: var(--color-text-muted);
    font-size: 1.2rem;
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    border-radius: var(--radius);

    &:hover { background: color-mix(in srgb, var(--color-text) 6%, transparent); color: var(--color-text); }
  }

  &__body {
    padding: 1.5rem 1.75rem;
    overflow-y: auto;
    flex: 1;
  }

  &__step {
    @include flex-col(1rem);
  }

  &__heading {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 600;
    color: var(--color-text-heading);
  }

  &__help {
    margin: 0;
    font-size: var(--fs-md);
    opacity: var(--op-partial);
    line-height: 1.5;
  }

  &__option-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 0.6rem;
  }

  &__molecule-card {
    @include flex-col(0.25rem);
    text-align: left;
    padding: 0.85rem;
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

  &__molecule-label {
    font-size: var(--fs-md);
    font-weight: 600;
    color: var(--color-text);
  }

  &__molecule-desc {
    font-size: var(--fs-xs);
    opacity: var(--op-muted);
    line-height: 1.4;
  }

  &__name-input {
    width: 100%;
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

  &__name-counter {
    @include mono-upper(var(--fs-xxs));
    opacity: var(--op-muted);
    align-self: flex-end;
  }

  &__module-list {
    @include flex-col(0.6rem);
  }

  &__module-card {
    @include flex-col(0.3rem);
    text-align: left;
    padding: 1rem 1.1rem;
    background: var(--color-surface-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    cursor: pointer;
    transition: border-color var(--tr-fast), background var(--tr-fast);

    &:disabled {
      opacity: var(--op-ghost);
      cursor: not-allowed;
    }

    &:hover:not(:disabled) {
      border-color: color-mix(in srgb, var(--color-primary) 40%, var(--color-border));
    }

    &--selected {
      border-color: var(--color-primary);
      background: color-mix(in srgb, var(--color-primary) 8%, var(--color-surface-2));
    }
  }

  &__module-label {
    font-size: var(--fs-lg);
    font-weight: 600;
    color: var(--color-text-heading);
  }

  &__module-desc {
    font-size: var(--fs-md);
    opacity: var(--op-partial);
    line-height: 1.5;
  }

  &__footer {
    @include flex-between();
    padding: 1rem 1.75rem;
    border-top: 1px solid var(--color-border);
  }

  &__btn {
    @include mono-upper(var(--fs-sm));
    padding: 0.6rem 1.2rem;
    border-radius: var(--radius);
    cursor: pointer;
    border: 1px solid transparent;
    transition: background var(--tr-fast), border-color var(--tr-fast), opacity var(--tr-fast);

    &--secondary {
      background: transparent;
      border-color: var(--color-border);
      color: var(--color-text);

      &:hover { background: color-mix(in srgb, var(--color-text) 6%, transparent); }
    }

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
  }
}

@keyframes wizardFade {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes wizardLift {
  from { opacity: 0; transform: translateY(20px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
</style>
