<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
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

            <div v-if="radiusBinWarn" class="ccm__radius-warn">{{ radiusBinWarn }}</div>

            <CcmSigmaProvenanceSection
              :form="(form as Record<string, unknown>)"
              @field-change="onFieldChange"
              @show-tip="showTip"
            />

            <CcmNuclearSection
              v-if="form.cellType === 'mammalian'"
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
import CcmSigmaProvenanceSection from './CcmSigmaProvenanceSection.vue'
import CcmNuclearSection from './CcmNuclearSection.vue'
import CcmResonanceSection from './CcmResonanceSection.vue'
import CcmDerivedPreview from './CcmDerivedPreview.vue'
import CcmFooter from './CcmFooter.vue'

type CellFormType        = 'mammalian' | 'bacteria' | 'virus'
type CellRole            = 'target' | 'healthy'
type ParameterConfidence = 'literature' | 'measured' | 'estimated'
type SigmaSource         = 'literature' | 'measured' | 'electrorotation' | 'impedance' | 'estimated'
type TipKey =
  | 'radius' | 'memThick' | 'epsR' | 'sigmaI' | 'sigmaMem' | 'vmThr' | 'density' | 'cp'
  | 'derivedFc' | 'cellType'
  | 'sigmaUncertaintyPct' | 'sigmaSource' | 'sigmaCitation' | 'conductivityMeasurementTempC' | 'conductivityMeasurementSigmaE'
  | 'resFreq' | 'capsidQ' | 'resThr' | 'resFreqUnc' | 'capsidQMin' | 'capsidQMax'
  | 'resFreq2' | 'capsidQ2' | 'resMode2Amp'
  | 'nuclearRadius' | 'nuclearMemThick' | 'nuclearEps' | 'nucleoplasmSigma' | 'nuclearVmThr'

// Soft radius-bin ranges used for auto-force on type switch (µm).
// Values outside the type bin are clamped to the type default.
const TYPE_RADIUS_BIN: Record<CellFormType, [number, number]> = {
  mammalian: [2,      50    ],
  bacteria:  [0.15,   5     ],
  virus:     [0.015,  0.2   ],
}

interface TypeDefaults {
  radius: number; membraneThickness: number; dielectricConstant: number
  conductivity: number; membraneConductivity: number
  thresholdVoltage: number; density: number; specificHeatCapacity: number
  // Mammalian nuclear envelope (Kotnik & Miklavcic 2006)
  nuclearRadius: number | null
  nuclearMembraneThickness: number | null
  nuclearMembraneEps: number | null
  nucleoplasmConductivity: number | null
  nuclearThresholdVoltage: number | null
  // Acoustic resonance
  resonantFreqGHz: number | null; capsidQ: number | null; resonantThresholdVcm: number | null
  resonantFreqUncertaintyPct: number | null
  capsidQMin: number | null
  capsidQMax: number | null
  resonantFreqGHz2: number | null
  capsidQ2: number | null
  resonantMode2Amplitude: number | null
}

const TYPE_DEFAULTS: Record<CellFormType, TypeDefaults> = {
  mammalian: {
    radius: 12, membraneThickness: 6, dielectricConstant: 8,
    conductivity: 0.7, membraneConductivity: 1e-7,
    thresholdVoltage: 0.85, density: 1050, specificHeatCapacity: 3500,
    nuclearRadius: 6, nuclearMembraneThickness: 15, nuclearMembraneEps: 10,
    nucleoplasmConductivity: 1.2, nuclearThresholdVoltage: 0.5,
    resonantFreqGHz: null, capsidQ: null, resonantThresholdVcm: null,
    resonantFreqUncertaintyPct: null, capsidQMin: null, capsidQMax: null,
    resonantFreqGHz2: null, capsidQ2: null, resonantMode2Amplitude: null,
  },
  bacteria: {
    radius: 1.0, membraneThickness: 8, dielectricConstant: 10,
    conductivity: 0.3, membraneConductivity: 1e-5,
    thresholdVoltage: 0.7, density: 1100, specificHeatCapacity: 3700,
    nuclearRadius: null, nuclearMembraneThickness: null, nuclearMembraneEps: null,
    nucleoplasmConductivity: null, nuclearThresholdVoltage: null,
    resonantFreqGHz: 10, capsidQ: 4, resonantThresholdVcm: 10000,
    resonantFreqUncertaintyPct: 27, capsidQMin: 3, capsidQMax: 5,
    resonantFreqGHz2: null, capsidQ2: null, resonantMode2Amplitude: null,
  },
  virus: {
    radius: 0.060, membraneThickness: 4, dielectricConstant: 22,
    conductivity: 0.2, membraneConductivity: 1e-7,
    thresholdVoltage: 0.4, density: 1200, specificHeatCapacity: 3000,
    nuclearRadius: null, nuclearMembraneThickness: null, nuclearMembraneEps: null,
    nucleoplasmConductivity: null, nuclearThresholdVoltage: null,
    resonantFreqGHz: 0.7, capsidQ: 8, resonantThresholdVcm: 800,
    resonantFreqUncertaintyPct: 40, capsidQMin: 6, capsidQMax: 12,
    resonantFreqGHz2: null, capsidQ2: null, resonantMode2Amplitude: null,
  },
}

const DEFAULT_FORM = () => ({
  role:                 'target' as CellRole,
  cellType:             'mammalian' as CellFormType,
  label:                '',
  shortLabel:           '',
  notes:                '',
  parameterConfidence:  'literature' as ParameterConfidence,
  sigmaUncertaintyPct:              null as number | null,
  sigmaSource:                      '' as SigmaSource | '',
  sigmaCitation:                    '',
  conductivityMeasurementTempC:     null as number | null,
  conductivityMeasurementSigmaE:    null as number | null,
  ...TYPE_DEFAULTS.mammalian,
})

export default defineComponent({
  name: 'CreateCellModal',

  components: {
    CcmHeader,
    CcmTipPanel,
    CcmIdentitySection,
    CcmParamsGrid,
    CcmSigmaProvenanceSection,
    CcmNuclearSection,
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
      form:          DEFAULT_FORM() as ReturnType<typeof DEFAULT_FORM>,
      activeTip:     null as TipKey | null,
      saving:        false,
      saveError:     '',
      radiusBinWarn: '' as string,
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
      if (this.form.cellType !== 'virus' && this.form.thresholdVoltage <= 0)
                                                errs.push('Vm threshold must be > 0.')
      if (this.form.density <= 0)               errs.push('Density must be > 0.')
      if (this.form.specificHeatCapacity <= 0)  errs.push('Specific heat must be > 0.')
      if (this.form.capsidQMin != null && this.form.capsidQMax != null &&
          this.form.capsidQMin > this.form.capsidQMax)
                                                errs.push('Q lower bound must be ≤ upper bound.')
      return errs
    },

    isValid(): boolean {
      return this.validationErrors.length === 0
    },
  },

  watch: {
    visible(val: boolean) {
      if (!val) return
      this.saving        = false
      this.saveError     = ''
      this.radiusBinWarn = ''
      if (this.editPreset) {
        const p = this.editPreset
        const ct: CellFormType = p.cellType as CellFormType
        this.form = {
          role:                       p.role as CellRole,
          cellType:                   ct,
          label:                      p.label,
          shortLabel:                 p.shortLabel,
          notes:                      p.notes,
          parameterConfidence:        (p.parameterConfidence as ParameterConfidence) ?? 'literature',
          sigmaUncertaintyPct:              p.sigmaUncertaintyPct              ?? null,
          sigmaSource:                      (p.sigmaSource as SigmaSource | undefined) ?? '',
          sigmaCitation:                    p.sigmaCitation                    ?? '',
          conductivityMeasurementTempC:     p.conductivityMeasurementTempC     ?? null,
          conductivityMeasurementSigmaE:    p.conductivityMeasurementSigmaE    ?? null,
          radius:                           p.radius,
          membraneThickness:          p.membraneThickness,
          dielectricConstant:         p.dielectricConstant,
          conductivity:               p.conductivity,
          membraneConductivity:       p.membraneConductivity        ?? TYPE_DEFAULTS[ct].membraneConductivity,
          thresholdVoltage:           p.thresholdVoltage,
          density:                    p.density,
          specificHeatCapacity:       p.specificHeatCapacity,
          nuclearRadius:              p.nuclearRadius              ?? null,
          nuclearMembraneThickness:   p.nuclearMembraneThickness   ?? null,
          nuclearMembraneEps:         p.nuclearMembraneEps         ?? null,
          nucleoplasmConductivity:    p.nucleoplasmConductivity    ?? null,
          nuclearThresholdVoltage:    p.nuclearThresholdVoltage    ?? null,
          resonantFreqGHz:            p.resonantFreqGHz            ?? null,
          capsidQ:                    p.capsidQ                    ?? null,
          resonantThresholdVcm:       p.resonantThresholdVcm       ?? null,
          resonantFreqUncertaintyPct: p.resonantFreqUncertaintyPct ?? null,
          capsidQMin:                 p.capsidQMin                 ?? null,
          capsidQMax:                 p.capsidQMax                 ?? null,
          resonantFreqGHz2:           p.resonantFreqGHz2           ?? null,
          capsidQ2:                   p.capsidQ2                   ?? null,
          resonantMode2Amplitude:     p.resonantMode2Amplitude     ?? null,
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
      const prevRadius = this.form.radius
      Object.assign(this.form, TYPE_DEFAULTS[ct], { cellType: ct, label, shortLabel, notes })
      const [binLo, binHi] = TYPE_RADIUS_BIN[ct]
      if (prevRadius < binLo || prevRadius > binHi) {
        this.radiusBinWarn = this.$t('userPresets.radiusBinWarn', {
          prev: prevRadius.toString(),
          forced: this.form.radius.toString(),
          type: ct,
        })
      } else {
        this.form.radius   = prevRadius
        this.radiusBinWarn = ''
      }
    },

    async onSave() {
      if (!this.isValid || this.saving) return
      const ct = this.form.cellType as CellFormType
      const isMammalian = ct === 'mammalian'
      const isResonant  = ct !== 'mammalian'
      const input: UserCellPresetInput = {
        role:                 this.form.role as CellRole,
        cellType:             ct,
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
        ...(this.form.membraneConductivity != null && { membraneConductivity: this.form.membraneConductivity }),
        ...(this.form.sigmaUncertaintyPct             != null && { sigmaUncertaintyPct:             this.form.sigmaUncertaintyPct }),
        ...(this.form.sigmaSource                     !== '' && { sigmaSource: this.form.sigmaSource as SigmaSource }),
        ...(this.form.sigmaCitation.trim()            !== '' && { sigmaCitation:                    this.form.sigmaCitation.trim() }),
        ...(this.form.conductivityMeasurementTempC  != null && { conductivityMeasurementTempC:  this.form.conductivityMeasurementTempC }),
        ...(this.form.conductivityMeasurementSigmaE != null && { conductivityMeasurementSigmaE: this.form.conductivityMeasurementSigmaE }),
        ...(isMammalian && this.form.nuclearRadius              != null && { nuclearRadius:              this.form.nuclearRadius }),
        ...(isMammalian && this.form.nuclearMembraneThickness   != null && { nuclearMembraneThickness:   this.form.nuclearMembraneThickness }),
        ...(isMammalian && this.form.nuclearMembraneEps         != null && { nuclearMembraneEps:         this.form.nuclearMembraneEps }),
        ...(isMammalian && this.form.nucleoplasmConductivity    != null && { nucleoplasmConductivity:    this.form.nucleoplasmConductivity }),
        ...(isMammalian && this.form.nuclearThresholdVoltage    != null && { nuclearThresholdVoltage:    this.form.nuclearThresholdVoltage }),
        ...(isResonant && this.form.resonantFreqGHz             != null && { resonantFreqGHz:            this.form.resonantFreqGHz }),
        ...(isResonant && this.form.capsidQ                     != null && { capsidQ:                    this.form.capsidQ }),
        ...(isResonant && this.form.resonantThresholdVcm        != null && { resonantThresholdVcm:       this.form.resonantThresholdVcm }),
        ...(isResonant && this.form.resonantFreqUncertaintyPct  != null && { resonantFreqUncertaintyPct: this.form.resonantFreqUncertaintyPct }),
        ...(isResonant && this.form.capsidQMin                  != null && { capsidQMin:                 this.form.capsidQMin }),
        ...(isResonant && this.form.capsidQMax                  != null && { capsidQMax:                 this.form.capsidQMax }),
        ...(isResonant && this.form.resonantFreqGHz2            != null && { resonantFreqGHz2:           this.form.resonantFreqGHz2 }),
        ...(isResonant && this.form.capsidQ2                    != null && { capsidQ2:                   this.form.capsidQ2 }),
        ...(isResonant && this.form.resonantMode2Amplitude      != null && { resonantMode2Amplitude:     this.form.resonantMode2Amplitude }),
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

  &__radius-warn {
    @include tinted-surface(amber);
    border-radius: var(--radius);
    padding:       0.4rem 0.6rem;
    font-size:     var(--fs-xs);
    color:         var(--color-amber);
  }
}
</style>
