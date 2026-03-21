<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <teleport to="body">
    <transition name="modal-fade">
      <div v-if="visible" class="ccm-backdrop" @mousedown.self="onCancel">
        <div class="ccm" role="dialog" aria-modal="true">

          <CcmHeader @cancel="onCancel" />

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
import { defineComponent } from 'vue'
import { useUserPresetsStore } from '@/stores/userPresetsStore'
import type { UserCellPreset } from '@/stores/userPresetsStore'
import { useCellStore } from '@/stores/cellStore'
import { EPSILON_0, computeTau, computeFc } from '@/utils/physics'
import CcmHeader from './CcmHeader.vue'
import CcmTipPanel from './CcmTipPanel.vue'
import CcmIdentitySection from './CcmIdentitySection.vue'
import CcmParamsGrid from './CcmParamsGrid.vue'
import CcmResonanceSection from './CcmResonanceSection.vue'
import CcmDerivedPreview from './CcmDerivedPreview.vue'
import CcmFooter from './CcmFooter.vue'

// ── Types ──────────────────────────────────────────────────────────────────

type CellFormType = 'mammalian' | 'bacteria' | 'virus'
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
  cellType:             'mammalian' as CellFormType,
  label:                '',
  shortLabel:           '',
  notes:                '',
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
    visible: { type: Boolean, default: false },
  },

  emits: ['close', 'saved'],

  data() {
    return {
      form:      DEFAULT_FORM() as ReturnType<typeof DEFAULT_FORM>,
      activeTip: null as TipKey | null,
    }
  },

  computed: {
    presetsStore() { return useUserPresetsStore() },
    cellStore()    { return useCellStore() },

    /** Current medium σ_e from cellStore */
    sigmaE(): number {
      return this.cellStore.effectiveSigmaE
    },

    /** Approximate cell config object for physics helpers */
    cellLike() {
      return {
        radius:               this.form.radius,
        membraneThickness:    this.form.membraneThickness,
        dielectricConstant:   this.form.dielectricConstant,
        conductivity:         this.form.conductivity,
        thresholdVoltage:     this.form.thresholdVoltage,
        density:              this.form.density,
        specificHeatCapacity: this.form.specificHeatCapacity,
        // required by CellConfig but unused in Cm/tau/fc calc
        id: 'preview', type: 'target' as const, label: '', naturalFrequency: 0, amplitude: 0.5,
      }
    },

    /** Cm = ε_r·ε₀/d  in mF/m² */
    derivedCm(): string {
      const d_m = this.form.membraneThickness * 1e-9
      if (!d_m || !this.form.dielectricConstant) return ', '
      const cm = (this.form.dielectricConstant * EPSILON_0) / d_m * 1e3
      return `${cm.toFixed(2)} mF/m²`
    },

    /** τ in ns */
    derivedTau(): string {
      try {
        const tau = computeTau(this.cellLike, this.sigmaE)
        if (!isFinite(tau) || tau <= 0) return ', '
        return `${(tau * 1e9).toFixed(1)} ns`
      } catch { return ', ' }
    },

    /** fc in kHz or MHz */
    derivedFc(): string {
      try {
        const fc = computeFc(this.cellLike, this.sigmaE) // kHz
        if (!isFinite(fc) || fc <= 0) return ', '
        if (fc >= 1000) return `${(fc / 1000).toFixed(2)} MHz`
        return `${fc.toFixed(0)} kHz`
      } catch { return ', ' }
    },

    validationErrors(): string[] {
      const errs: string[] = []
      if (!this.form.label.trim())              errs.push('Cell name is required.')
      if (!this.form.shortLabel.trim())         errs.push('Short label is required.')
      if (this.form.radius <= 0)                errs.push('Radius must be > 0.')
      if (this.form.membraneThickness <= 0)     errs.push('Membrane thickness must be > 0.')
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
      if (val) this.form = DEFAULT_FORM()
    },
  },

  methods: {
    showTip(key: TipKey) {
      this.activeTip = key
    },

    onFieldChange({ key, value }: { key: string; value: number | string }) {
      (this.form as Record<string, unknown>)[key] = value
    },

    /** Switch cell type and reset physics fields to type-appropriate defaults
     *  while preserving the user's label / shortLabel / notes. */
    onCellTypeChange(ct: CellFormType) {
      const { label, shortLabel, notes } = this.form
      Object.assign(this.form, TYPE_DEFAULTS[ct], { cellType: ct, label, shortLabel, notes })
    },

    onSave() {
      if (!this.isValid) return
      const preset: Omit<UserCellPreset, 'id' | 'createdAt'> = {
        label:                this.form.label.trim(),
        shortLabel:           this.form.shortLabel.trim(),
        notes:                this.form.notes.trim(),
        radius:               this.form.radius,
        membraneThickness:    this.form.membraneThickness,
        dielectricConstant:   this.form.dielectricConstant,
        conductivity:         this.form.conductivity,
        thresholdVoltage:     this.form.thresholdVoltage,
        density:              this.form.density,
        specificHeatCapacity: this.form.specificHeatCapacity,
        // Resonance fields included only when bacteria/virus and user provided values
        ...(this.form.cellType !== 'mammalian' && this.form.resonantFreqGHz      != null && { resonantFreqGHz:      this.form.resonantFreqGHz }),
        ...(this.form.cellType !== 'mammalian' && this.form.capsidQ              != null && { capsidQ:              this.form.capsidQ }),
        ...(this.form.cellType !== 'mammalian' && this.form.resonantThresholdVcm != null && { resonantThresholdVcm: this.form.resonantThresholdVcm }),
      }
      this.presetsStore.add(preset)
      this.$emit('saved', preset)
      this.$emit('close')
    },

    onCancel() {
      this.$emit('close')
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
  background:      rgba(0, 0, 0, 0.72);
  display:         flex;
  align-items:     center;
  justify-content: center;
  padding:         1rem;
}

.ccm {
  background:     var(--color-surface);
  border:         1px solid var(--color-border, rgba(255,255,255,0.1));
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
