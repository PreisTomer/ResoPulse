<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <teleport to="body">
    <transition name="modal-fade">
      <div v-if="visible" class="ccm-backdrop" @mousedown.self="onCancel">
        <div class="ccm" role="dialog" aria-modal="true">

          <CcmHeader :is-edit-mode="isEditMode" @cancel="onCancel" />

          <div class="ccm__body">
            <CcmIdentitySection
              :form="(form as Record<string, unknown>)"
              @field-change="onFieldChange"
              @show-tip="showTip"
              @cell-type-change="onCellTypeChange"
            />

            <CcmParamsGrid
              :form="(form as Record<string, unknown>)"
              @field-change="onFieldChange"
              @show-tip="showTip"
            />

            <CcmResonanceSection
              v-if="form.cellType !== 'mammalian'"
              :form="(form as Record<string, unknown>)"
              @field-change="onFieldChange"
              @show-tip="showTip"
            />

            <CcmDerivedPreview
              :derived-cm="derivedCm"
              :derived-tau="derivedTau"
              :derived-fc="derivedFc"
              @show-tip="showTip"
            />
          </div>

          <CcmFooter
            :can-save="isValid"
            :validation-errors="validationErrors"
            :saving="saving"
            :save-error="saveError"
            @save="onSave"
            @cancel="onCancel"
          />

        </div>
      </div>
    </transition>

    <CcmTipPanel :active-tip="activeTip" @close="activeTip = null" />
  </teleport>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import { mapStores } from 'pinia'

import { useUserPresetsStore } from '@/stores/userPresetsStore'
import type { UserCellPreset, UserCellPresetInput } from '@/stores/userPresetsStore'
import { useCellStore } from '@/stores/cellStore'

import { computeTau, computeFc } from '@/utils/physics'

import { EPSILON_0 } from '@/constants/physics'
import { UNIT } from '@/constants/units'
import { EMIT } from '@/constants/emitEvents'

import CcmHeader from './CcmHeader.vue'
import CcmTipPanel from './CcmTipPanel.vue'
import CcmIdentitySection from './CcmIdentitySection.vue'
import CcmParamsGrid from './CcmParamsGrid.vue'
import CcmResonanceSection from './CcmResonanceSection.vue'
import CcmDerivedPreview from './CcmDerivedPreview.vue'
import CcmFooter from './CcmFooter.vue'

// ── Types ──────────────────────────────────────────────────────────────────

type CellFormType        = 'mammalian' | 'bacteria' | 'virus'
type CellRole            = 'target' | 'healthy'
type ParameterConfidence = 'literature' | 'measured' | 'estimated'
type TipKey = 'radius' | 'memThick' | 'epsR' | 'sigmaI' | 'vmThr' | 'density' | 'cp' | 'derivedFc' | 'cellType' | 'resFreq' | 'capsidQ' | 'resThr'

// ── Per-type scientifically representative defaults ────────────────────────
// Mammalian: cancer-cell-typical (larger R, thinner membrane, lower Vth).
// Bacteria: E. coli-like gram-negative baseline.
// Virus: Influenza-like enveloped virus baseline.
interface TypeDefaults {
  radius: number; membraneThickness: number; dielectricConstant: number
  conductivity: number; thresholdVoltage: number; density: number; specificHeatCapacity: number
  resonantFreqGHz: number | null; capsidQ: number | null; resonantThresholdVcm: number | null
}

const TYPE_DEFAULTS: Record<CellFormType, TypeDefaults> = {
  mammalian: { radius: 12,    membraneThickness: 6,  dielectricConstant: 8,  conductivity: 0.7, thresholdVoltage: 0.85, density: 1050, specificHeatCapacity: 3500, resonantFreqGHz: null, capsidQ: null, resonantThresholdVcm: null },
  bacteria:  { radius: 1.0,   membraneThickness: 8,  dielectricConstant: 10, conductivity: 0.3, thresholdVoltage: 0.7,  density: 1100, specificHeatCapacity: 3700, resonantFreqGHz: 10,   capsidQ: 4,    resonantThresholdVcm: 10000 },
  virus:     { radius: 0.060, membraneThickness: 4,  dielectricConstant: 22, conductivity: 0.2, thresholdVoltage: 0.4,  density: 1200, specificHeatCapacity: 3000, resonantFreqGHz: 0.7,  capsidQ: 8,    resonantThresholdVcm: 800 },
}

const DEFAULT_FORM = () => ({
  role:                 'target' as CellRole,
  cellType:             'mammalian' as CellFormType,
  label:                '',
  shortLabel:           '',
  notes:                '',
  parameterConfidence:  'literature' as ParameterConfidence,
  ...TYPE_DEFAULTS.mammalian,
})

export default defineComponent({
  name: 'CreateCellModal',

  components: {
    CcmHeader,
    CcmTipPanel,
    CcmIdentitySection,
    CcmParamsGrid,
    CcmResonanceSection,
    CcmDerivedPreview,
    CcmFooter,
  },

  props: {
    visible:         { type: Boolean, default: false },
    editPreset:      { type: Object as PropType<UserCellPreset | null>, default: null },
    defaultCellType: { type: String as PropType<CellFormType | null>, default: null },
    defaultRole:     { type: String as PropType<CellRole | null>,     default: null },
  },

  emits: [EMIT.CLOSE, EMIT.SAVED],

  data() {
    return {
      form:      DEFAULT_FORM() as ReturnType<typeof DEFAULT_FORM>,
      activeTip: null as TipKey | null,
      saving:    false,
      saveError: '',
    }
  },

  computed: {
    ...mapStores(useUserPresetsStore, useCellStore),

    isEditMode(): boolean { return this.editPreset !== null },

    sigmaE(): number {
      return this.cellStore.effectiveSigmaE
    },

    cellLike() {
      return {
        radius:               this.form.radius,
        membraneThickness:    this.form.membraneThickness,
        dielectricConstant:   this.form.dielectricConstant,
        conductivity:         this.form.conductivity,
        thresholdVoltage:     this.form.thresholdVoltage,
        density:              this.form.density,
        specificHeatCapacity: this.form.specificHeatCapacity,
        id: 'preview', type: 'target' as const, label: '', naturalFrequency: 0, amplitude: 0.5,
      }
    },

    // Cm = ε_r·ε₀/d [mF/m²]
    derivedCm(): string {
      const d_m = this.form.membraneThickness * 1e-9
      if (!d_m || !this.form.dielectricConstant) return ', '
      const cm = (this.form.dielectricConstant * EPSILON_0) / d_m * 1e3
      return `${cm.toFixed(2)} ${UNIT.MF_PER_M2}`
    },

    derivedTau(): string {
      try {
        const tau = computeTau(this.cellLike, this.sigmaE)
        if (!isFinite(tau) || tau <= 0) return ', '
        return `${(tau * 1e9).toFixed(1)} ${UNIT.NS}`
      } catch { return ', ' }
    },

    derivedFc(): string {
      try {
        const fc = computeFc(this.cellLike, this.sigmaE) // kHz
        if (!isFinite(fc) || fc <= 0) return ', '
        if (fc >= 1000) return `${(fc / 1000).toFixed(2)} ${UNIT.MHZ}`
        return `${fc.toFixed(0)} ${UNIT.KHZ}`
      } catch { return ', ' }
    },

    validationErrors(): string[] {
      const errs: string[] = []
      if (!this.form.label.trim())              errs.push('Cell name is required.')
      if (!this.form.shortLabel.trim())         errs.push('Short label is required.')
      if (!this.form.notes.trim())              errs.push(this.$t('userPresets.sourceRequired'))
      if (this.form.radius <= 0)                errs.push('Radius must be > 0.')
      if (this.form.radius > 100)               errs.push('Radius must be ≤ 100 µm.')
      if (this.form.membraneThickness <= 0)     errs.push('Membrane thickness must be > 0.')
      if (this.form.membraneThickness > 200)    errs.push('Membrane thickness must be ≤ 200 nm.')
      if (this.form.membraneThickness >= this.form.radius * 1000)
                                                errs.push('Membrane thickness must be smaller than cell radius.')
      if (this.form.dielectricConstant <= 0)    errs.push('ε_r must be > 0.')
      if (this.form.conductivity <= 0)          errs.push('σ_i must be > 0.')
      if (this.form.thresholdVoltage <= 0)      errs.push('Vm threshold must be > 0.')
      if (this.form.density <= 0)               errs.push('Density must be > 0.')
      if (this.form.specificHeatCapacity <= 0)  errs.push('Specific heat must be > 0.')
      return errs
    },

    isValid(): boolean {
      return this.validationErrors.length === 0
    },
  },

  watch: {
    visible(val: boolean) {
      if (!val) return
      this.saving    = false
      this.saveError = ''
      if (this.editPreset) {
        const p = this.editPreset
        const ct: CellFormType = p.cellType as CellFormType
        this.form = {
          role:                 p.role as CellRole,
          cellType:             ct,
          label:                p.label,
          shortLabel:           p.shortLabel,
          notes:                p.notes,
          parameterConfidence:  (p.parameterConfidence as ParameterConfidence) ?? 'literature',
          radius:               p.radius,
          membraneThickness:    p.membraneThickness,
          dielectricConstant:   p.dielectricConstant,
          conductivity:         p.conductivity,
          thresholdVoltage:     p.thresholdVoltage,
          density:              p.density,
          specificHeatCapacity: p.specificHeatCapacity,
          resonantFreqGHz:      p.resonantFreqGHz      ?? null,
          capsidQ:              p.capsidQ              ?? null,
          resonantThresholdVcm: p.resonantThresholdVcm ?? null,
        }
      } else {
        const base = DEFAULT_FORM()
        const ct   = (this.defaultCellType ?? 'mammalian') as CellFormType
        const role = (this.defaultRole     ?? 'target')    as CellRole
        this.form  = { ...base, ...TYPE_DEFAULTS[ct], cellType: ct, role }
      }
    },
  },

  methods: {
    showTip(key: TipKey) {
      this.activeTip = key
    },

    onFieldChange({ key, value }: { key: string; value: number | string }) {
      (this.form as Record<string, unknown>)[key] = value
    },

    onCellTypeChange(ct: CellFormType) {
      const { label, shortLabel, notes } = this.form
      Object.assign(this.form, TYPE_DEFAULTS[ct], { cellType: ct, label, shortLabel, notes })
    },

    async onSave() {
      if (!this.isValid || this.saving) return
      const input: UserCellPresetInput = {
        role:                 this.form.role as CellRole,
        cellType:             this.form.cellType as CellFormType,
        label:                this.form.label.trim(),
        shortLabel:           this.form.shortLabel.trim(),
        notes:                this.form.notes.trim(),
        parameterConfidence:  this.form.parameterConfidence as ParameterConfidence,
        radius:               this.form.radius,
        membraneThickness:    this.form.membraneThickness,
        dielectricConstant:   this.form.dielectricConstant,
        conductivity:         this.form.conductivity,
        thresholdVoltage:     this.form.thresholdVoltage,
        density:              this.form.density,
        specificHeatCapacity: this.form.specificHeatCapacity,
        // Resonance fields only for bacteria/virus
        ...(this.form.cellType !== 'mammalian' && this.form.resonantFreqGHz      != null && { resonantFreqGHz:      this.form.resonantFreqGHz }),
        ...(this.form.cellType !== 'mammalian' && this.form.capsidQ              != null && { capsidQ:              this.form.capsidQ }),
        ...(this.form.cellType !== 'mammalian' && this.form.resonantThresholdVcm != null && { resonantThresholdVcm: this.form.resonantThresholdVcm }),
      }

      this.saving    = true
      this.saveError = ''
      try {
        if (this.isEditMode && this.editPreset) {
          const ok = await this.userPresetsStore.update(this.editPreset.id, input)
          if (!ok) { this.saveError = this.$t('userPresets.saveErrorMsg'); return }
        } else {
          const result = await this.userPresetsStore.add(input)
          if (!result) { this.saveError = this.$t('userPresets.saveErrorMsg'); return }
        }
        this.$emit(EMIT.SAVED, input)
        this.$emit(EMIT.CLOSE)
      } catch {
        this.saveError = this.$t('userPresets.saveErrorMsg')
      } finally {
        this.saving = false
      }
    },

    onCancel() {
      this.$emit(EMIT.CLOSE)
    },
  },
})
</script>

<style lang="scss" scoped>
.modal-fade-enter-active,
.modal-fade-leave-active { transition: opacity 0.18s ease; }
.modal-fade-enter-from,
.modal-fade-leave-to     { opacity: 0; }

.ccm-backdrop {
  position:        fixed;
  inset:           0;
  z-index:         9000;
  background:      color-mix(in srgb, black 72%, transparent);
  display:         flex;
  align-items:     center;
  justify-content: center;
  padding:         1rem;
}

.ccm {
  background:     var(--color-surface);
  border:         1px solid var(--color-border);
  border-radius:  10px;
  width:          min(640px, 100%);
  max-height:     90vh;
  overflow-y:     auto;
  display:        flex;
  flex-direction: column;

  &__body {
    padding:        1rem 1.25rem;
    display:        flex;
    flex-direction: column;
    gap:            0.9rem;
  }
}
</style>
