<template>
  <teleport to="body">
    <transition name="modal-fade">
      <div v-if="visible" class="ccm-backdrop" @mousedown.self="onCancel">
        <div class="ccm" role="dialog" aria-modal="true">

          <!-- Header -->
          <div class="ccm__header">
            <span class="ccm__title">{{ $t('userPresets.modalTitle') }}</span>
            <button class="ccm__close" @click="onCancel">✕</button>
          </div>
          <p class="ccm__sub">{{ $t('userPresets.modalSub') }}</p>

          <!-- Body -->
          <div class="ccm__body">

            <!-- ── Identity row ──────────────────────────────────────── -->
            <div class="ccm__row ccm__row--double">
              <div class="ccm__field">
                <label class="ccm__label">{{ $t('userPresets.fieldLabel') }} *</label>
                <input v-model="form.label" class="ccm__input" type="text"
                  placeholder="e.g. HeLa cervical carcinoma" maxlength="60" />
              </div>
              <div class="ccm__field">
                <label class="ccm__label">{{ $t('userPresets.fieldShortLabel') }} *</label>
                <input v-model="form.shortLabel" class="ccm__input" type="text"
                  placeholder="e.g. HeLa" maxlength="12" />
              </div>
            </div>

            <!-- ── Cell type selector ───────────────────────────────── -->
            <div class="ccm__field">
              <label class="ccm__label">
                {{ $t('userPresets.cellTypeLabel') }}
                <button class="ccm__tip-btn" @click="showTip('cellType')">?</button>
              </label>
              <div class="ccm__type-pills">
                <button
                  v-for="ct in (['mammalian', 'bacteria', 'virus'] as const)"
                  :key="ct"
                  type="button"
                  class="ccm__type-pill"
                  :class="{ 'ccm__type-pill--active': form.cellType === ct }"
                  @click="onCellTypeChange(ct)"
                >{{ $t(`userPresets.cellType${ct.charAt(0).toUpperCase() + ct.slice(1)}`) }}</button>
              </div>
            </div>

            <!-- ── Notes / citation ─────────────────────────────────── -->
            <div class="ccm__field">
              <label class="ccm__label">{{ $t('userPresets.fieldNotes') }}</label>
              <input v-model="form.notes" class="ccm__input" type="text"
                placeholder="e.g. Teissie & Rols (1993) Biophys J 65(1):409" maxlength="200" />
            </div>

            <!-- ── Parameter grid ───────────────────────────────────── -->
            <div class="ccm__params-grid">

              <!-- Radius -->
              <div class="ccm__field">
                <label class="ccm__label">
                  {{ $t('userPresets.fieldRadius') }}
                  <span class="ccm__unit">µm</span>
                  <button class="ccm__tip-btn" @click="showTip('radius')">?</button>
                </label>
                <input v-model.number="form.radius" class="ccm__input" type="number"
                  step="0.001" min="0.001" max="100" />
                <span class="ccm__sub-hint">{{ $t('userPresets.fieldRadiusSub') }}</span>
              </div>

              <!-- Membrane thickness -->
              <div class="ccm__field">
                <label class="ccm__label">
                  {{ $t('userPresets.fieldMemThick') }}
                  <span class="ccm__unit">nm</span>
                  <button class="ccm__tip-btn" @click="showTip('memThick')">?</button>
                </label>
                <input v-model.number="form.membraneThickness" class="ccm__input" type="number"
                  step="0.1" min="1" max="200" />
                <span class="ccm__sub-hint">{{ $t('userPresets.fieldMemThickSub') }}</span>
              </div>

              <!-- Dielectric constant -->
              <div class="ccm__field">
                <label class="ccm__label">
                  {{ $t('userPresets.fieldEpsR') }}
                  <button class="ccm__tip-btn" @click="showTip('epsR')">?</button>
                </label>
                <input v-model.number="form.dielectricConstant" class="ccm__input" type="number"
                  step="0.5" min="1" max="80" />
                <span class="ccm__sub-hint">{{ $t('userPresets.fieldEpsRSub') }}</span>
              </div>

              <!-- Intracellular conductivity -->
              <div class="ccm__field">
                <label class="ccm__label">
                  {{ $t('userPresets.fieldSigmaI') }}
                  <span class="ccm__unit">S/m</span>
                  <button class="ccm__tip-btn" @click="showTip('sigmaI')">?</button>
                </label>
                <input v-model.number="form.conductivity" class="ccm__input" type="number"
                  step="0.01" min="0.001" max="10" />
                <span class="ccm__sub-hint">{{ $t('userPresets.fieldSigmaISub') }}</span>
              </div>

              <!-- Lysis threshold -->
              <div class="ccm__field">
                <label class="ccm__label">
                  {{ $t('userPresets.fieldVmThr') }}
                  <span class="ccm__unit">V</span>
                  <button class="ccm__tip-btn" @click="showTip('vmThr')">?</button>
                </label>
                <input v-model.number="form.thresholdVoltage" class="ccm__input" type="number"
                  step="0.05" min="0.05" max="10" />
                <span class="ccm__sub-hint">{{ $t('userPresets.fieldVmThrSub') }}</span>
              </div>

              <!-- Density -->
              <div class="ccm__field">
                <label class="ccm__label">
                  {{ $t('userPresets.fieldDensity') }}
                  <span class="ccm__unit">kg/m³</span>
                  <button class="ccm__tip-btn" @click="showTip('density')">?</button>
                </label>
                <input v-model.number="form.density" class="ccm__input" type="number"
                  step="10" min="500" max="2000" />
                <span class="ccm__sub-hint">{{ $t('userPresets.fieldDensitySub') }}</span>
              </div>

              <!-- Specific heat capacity -->
              <div class="ccm__field">
                <label class="ccm__label">
                  {{ $t('userPresets.fieldCp') }}
                  <span class="ccm__unit">J/(kg·K)</span>
                  <button class="ccm__tip-btn" @click="showTip('cp')">?</button>
                </label>
                <input v-model.number="form.specificHeatCapacity" class="ccm__input" type="number"
                  step="50" min="500" max="5000" />
                <span class="ccm__sub-hint">{{ $t('userPresets.fieldCpSub') }}</span>
              </div>

            </div>

            <!-- ── Resonance fields (bacteria / virus only) ─────────── -->
            <div v-if="form.cellType !== 'mammalian'" class="ccm__resonance-section">
              <div class="ccm__resonance-title">
                {{ $t('userPresets.resonanceSectionTitle') }}
                <span class="ccm__resonance-sub">{{ $t('userPresets.resonanceSectionSub') }}</span>
              </div>
              <div class="ccm__params-grid">

                <!-- Resonant frequency -->
                <div class="ccm__field">
                  <label class="ccm__label">
                    {{ $t('userPresets.fieldResFreq') }}
                    <span class="ccm__unit">GHz</span>
                    <button class="ccm__tip-btn" @click="showTip('resFreq')">?</button>
                  </label>
                  <input v-model.number="form.resonantFreqGHz" class="ccm__input" type="number"
                    step="0.01" min="0.001" max="1000" />
                  <span class="ccm__sub-hint">{{ $t('userPresets.fieldResFreqSub') }}</span>
                </div>

                <!-- Quality factor -->
                <div class="ccm__field">
                  <label class="ccm__label">
                    {{ $t('userPresets.fieldCapsidQ') }}
                    <button class="ccm__tip-btn" @click="showTip('capsidQ')">?</button>
                  </label>
                  <input v-model.number="form.capsidQ" class="ccm__input" type="number"
                    step="1" min="1" max="100" />
                  <span class="ccm__sub-hint">{{ $t('userPresets.fieldCapsidQSub') }}</span>
                </div>

                <!-- Resonance threshold -->
                <div class="ccm__field">
                  <label class="ccm__label">
                    {{ $t('userPresets.fieldResThr') }}
                    <span class="ccm__unit">V/cm</span>
                    <button class="ccm__tip-btn" @click="showTip('resThr')">?</button>
                  </label>
                  <input v-model.number="form.resonantThresholdVcm" class="ccm__input" type="number"
                    step="100" min="10" max="100000" />
                  <span class="ccm__sub-hint">{{ $t('userPresets.fieldResThrSub') }}</span>
                </div>

              </div>
            </div>

            <!-- ── Derived preview ───────────────────────────────────── -->
            <div class="ccm__derived">
              <div class="ccm__derived-item">
                <span class="ccm__derived-label">{{ $t('userPresets.derivedCm') }}</span>
                <span class="ccm__derived-val">{{ derivedCm }}</span>
              </div>
              <div class="ccm__derived-item">
                <span class="ccm__derived-label">{{ $t('userPresets.derivedTau') }}</span>
                <span class="ccm__derived-val">{{ derivedTau }}</span>
              </div>
              <div class="ccm__derived-item ccm__derived-item--fc">
                <span class="ccm__derived-label">
                  {{ $t('userPresets.derivedFc') }}
                  <button class="ccm__tip-btn" @click="showTip('derivedFc')">?</button>
                </span>
                <span class="ccm__derived-val ccm__derived-val--highlight">{{ derivedFc }}</span>
              </div>
            </div>

            <!-- ── Validation errors ─────────────────────────────────── -->
            <div v-if="validationErrors.length" class="ccm__errors">
              <span v-for="err in validationErrors" :key="err" class="ccm__error-item">{{ err }}</span>
            </div>

          </div>

          <!-- Footer -->
          <div class="ccm__footer">
            <button class="ccm__btn ccm__btn--cancel" @click="onCancel">
              {{ $t('userPresets.cancelBtn') }}
            </button>
            <button class="ccm__btn ccm__btn--save" :disabled="!isValid" @click="onSave">
              {{ $t('userPresets.saveBtn') }}
            </button>
          </div>

        </div>
      </div>
    </transition>

    <!-- Tooltip overlay -->
    <transition name="tip-fade">
      <div v-if="activeTip" class="ccm-tip-overlay" @click="activeTip = null">
        <div class="ccm-tip-box" @click.stop>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <span v-html="activeTipHtml" />
          <button class="ccm-tip-box__close" @click="activeTip = null">✕</button>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useUserPresetsStore } from '@/stores/userPresetsStore'
import type { UserCellPreset } from '@/stores/userPresetsStore'
import { useCellStore } from '@/stores/cellStore'
import { EPSILON_0 } from '@/utils/physics'
import { computeTau, computeFc } from '@/utils/physics'

// ── Default form values ────────────────────────────────────────────────────

type CellFormType = 'mammalian' | 'bacteria' | 'virus'

// Per-type scientifically representative defaults.
// Mammalian: cancer-cell-typical (larger R, thinner membrane, lower Vth than healthy reference).
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
  cellType:            'mammalian' as CellFormType,
  label:               '',
  shortLabel:          '',
  notes:               '',
  ...TYPE_DEFAULTS.mammalian,
})

type TipKey = 'radius' | 'memThick' | 'epsR' | 'sigmaI' | 'vmThr' | 'density' | 'cp' | 'derivedFc' | 'cellType' | 'resFreq' | 'capsidQ' | 'resThr'

const TIP_I18N_MAP: Record<TipKey, string> = {
  radius:    'userPresets.tipRadius',
  memThick:  'userPresets.tipMemThick',
  epsR:      'userPresets.tipEpsR',
  sigmaI:    'userPresets.tipSigmaI',
  vmThr:     'userPresets.tipVmThr',
  density:   'userPresets.tipDensity',
  cp:        'userPresets.tipCp',
  derivedFc: 'userPresets.tipDerivedFc',
  cellType:  'userPresets.tipCellType',
  resFreq:   'userPresets.tipResFreq',
  capsidQ:   'userPresets.tipCapsidQ',
  resThr:    'userPresets.tipResThr',
}

export default defineComponent({
  name: 'CreateCellModal',

  props: {
    visible: { type: Boolean, default: false },
  },

  emits: ['close', 'saved'],

  data() {
    return {
      form: DEFAULT_FORM() as ReturnType<typeof DEFAULT_FORM>,
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
        radius:             this.form.radius,
        membraneThickness:  this.form.membraneThickness,
        dielectricConstant: this.form.dielectricConstant,
        conductivity:       this.form.conductivity,
        thresholdVoltage:   this.form.thresholdVoltage,
        density:            this.form.density,
        specificHeatCapacity: this.form.specificHeatCapacity,
        // required by CellConfig but unused in Cm/tau/fc calc
        id: 'preview', type: 'target' as const, label: '', naturalFrequency: 0, amplitude: 0.5,
      }
    },

    /** Cm = ε_r·ε₀/d  in mF/m² */
    derivedCm(): string {
      const d_m  = this.form.membraneThickness * 1e-9
      if (!d_m || !this.form.dielectricConstant) return '—'
      const cm = (this.form.dielectricConstant * EPSILON_0) / d_m * 1e3
      return `${cm.toFixed(2)} mF/m²`
    },

    /** τ in ns */
    derivedTau(): string {
      try {
        const tau = computeTau(this.cellLike, this.sigmaE)
        if (!isFinite(tau) || tau <= 0) return '—'
        return `${(tau * 1e9).toFixed(1)} ns`
      } catch { return '—' }
    },

    /** fc in kHz or MHz */
    derivedFc(): string {
      try {
        const fc = computeFc(this.cellLike, this.sigmaE) // kHz
        if (!isFinite(fc) || fc <= 0) return '—'
        if (fc >= 1000) return `${(fc / 1000).toFixed(2)} MHz`
        return `${fc.toFixed(0)} kHz`
      } catch { return '—' }
    },

    validationErrors(): string[] {
      const errs: string[] = []
      if (!this.form.label.trim())       errs.push('Cell name is required.')
      if (!this.form.shortLabel.trim())  errs.push('Short label is required.')
      if (this.form.radius <= 0)         errs.push('Radius must be > 0.')
      if (this.form.membraneThickness <= 0) errs.push('Membrane thickness must be > 0.')
      if (this.form.dielectricConstant <= 0) errs.push('ε_r must be > 0.')
      if (this.form.conductivity <= 0)   errs.push('σ_i must be > 0.')
      if (this.form.thresholdVoltage <= 0) errs.push('Vm threshold must be > 0.')
      if (this.form.density <= 0)        errs.push('Density must be > 0.')
      if (this.form.specificHeatCapacity <= 0) errs.push('Specific heat must be > 0.')
      return errs
    },

    isValid(): boolean {
      return this.validationErrors.length === 0
    },

    activeTipHtml(): string {
      if (!this.activeTip) return ''
      const key = TIP_I18N_MAP[this.activeTip]
      return this.$t(key)
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

    /** Switch cell type and reset physics fields to type-appropriate defaults
     *  while preserving the user's label / shortLabel / notes. */
    onCellTypeChange(ct: CellFormType) {
      const { label, shortLabel, notes } = this.form
      Object.assign(this.form, TYPE_DEFAULTS[ct], { cellType: ct, label, shortLabel, notes })
    },

    onSave() {
      if (!this.isValid) return
      const preset: Omit<UserCellPreset, 'id' | 'createdAt'> = {
        label:               this.form.label.trim(),
        shortLabel:          this.form.shortLabel.trim(),
        notes:               this.form.notes.trim(),
        radius:              this.form.radius,
        membraneThickness:   this.form.membraneThickness,
        dielectricConstant:  this.form.dielectricConstant,
        conductivity:        this.form.conductivity,
        thresholdVoltage:    this.form.thresholdVoltage,
        density:             this.form.density,
        specificHeatCapacity: this.form.specificHeatCapacity,
        // Resonance fields — only included when bacteria/virus and user provided values
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
@use '../../styles/mixins' as *;

.modal-fade-enter-active,
.modal-fade-leave-active { transition: opacity 0.18s ease; }
.modal-fade-enter-from,
.modal-fade-leave-to     { opacity: 0; }

.tip-fade-enter-active,
.tip-fade-leave-active { transition: opacity 0.15s ease; }
.tip-fade-enter-from,
.tip-fade-leave-to     { opacity: 0; }

.ccm-backdrop {
  position:   fixed;
  inset:      0;
  z-index:    9000;
  background: rgba(0, 0, 0, 0.72);
  display:    flex;
  align-items: center;
  justify-content: center;
  padding:    1rem;
}

.ccm {
  background: var(--color-surface, #0e1428);
  border:     1px solid var(--color-border, rgba(255,255,255,0.1));
  border-radius: 10px;
  width:       min(640px, 100%);
  max-height:  90vh;
  overflow-y:  auto;
  display:     flex;
  flex-direction: column;

  &__header {
    @include flex-between();
    padding:        1rem 1.25rem 0.5rem;
    border-bottom:  1px solid var(--color-border, rgba(255,255,255,0.1));
  }

  &__title {
    font-size:   1.05rem;
    font-weight: 600;
    color:       var(--color-primary, #00d4ff);
    letter-spacing: 0.02em;
  }

  &__close {
    background: transparent;
    border:     none;
    color:      var(--color-text-muted, #8899aa);
    font-size:  1rem;
    cursor:     pointer;
    padding:    0.2rem 0.4rem;
    line-height: 1;

    &:hover { color: var(--color-text, #e0eaff); }
  }

  &__sub {
    padding:    0.5rem 1.25rem 0;
    font-size:  0.78rem;
    color:      var(--color-text-muted, #8899aa);
    margin:     0;
  }

  &__body {
    padding:    1rem 1.25rem;
    display:    flex;
    flex-direction: column;
    gap:        0.9rem;
  }

  &__row {
    display: flex;
    gap:     0.75rem;

    &--double > .ccm__field { flex: 1; }
  }

  &__field {
    display:       flex;
    flex-direction: column;
    gap:           0.25rem;
  }

  &__label {
    font-size:   0.73rem;
    font-weight: 600;
    color:       var(--color-text-muted, #8899aa);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    display:     flex;
    align-items: center;
    gap:         0.35rem;
  }

  &__unit {
    font-weight: 400;
    font-size:   0.68rem;
    opacity:     0.75;
    text-transform: none;
  }

  &__input {
    background:   var(--color-bg, #0a0f1e);
    border:       1px solid var(--color-border, rgba(255,255,255,0.12));
    border-radius: 5px;
    color:        var(--color-text, #e0eaff);
    font-size:    0.88rem;
    padding:      0.38rem 0.6rem;
    width:        100%;
    box-sizing:   border-box;
    outline:      none;
    transition:   border-color 0.15s;

    &:focus { border-color: var(--color-primary, #00d4ff); }
    &::placeholder { color: rgba(136,153,170,0.45); }

    // number input arrows
    -moz-appearance: textfield;
    appearance: textfield;
    &::-webkit-inner-spin-button,
    &::-webkit-outer-spin-button { -webkit-appearance: none; appearance: none; }
  }

  &__sub-hint {
    font-size: 0.67rem;
    color:     var(--color-text-muted, #8899aa);
    opacity:   0.7;
  }

  &__params-grid {
    display:               grid;
    grid-template-columns: 1fr 1fr;
    gap:                   0.75rem 1rem;
  }

  &__tip-btn {
    @include inline-flex-center();
    width:         14px;
    height:        14px;
    border-radius: 50%;
    border:        1px solid rgba(136,153,170,0.45);
    background:    transparent;
    color:         rgba(136,153,170,0.75);
    font-size:     0.6rem;
    font-weight:   700;
    cursor:        pointer;
    padding:       0;
    line-height:   1;
    flex-shrink:   0;

    &:hover {
      border-color: var(--color-primary, #00d4ff);
      color:        var(--color-primary, #00d4ff);
    }
  }

  &__derived {
    display:        flex;
    gap:            0.75rem;
    background:     rgba(0,212,255,0.06);
    border:         1px solid rgba(0,212,255,0.15);
    border-radius:  6px;
    padding:        0.6rem 0.9rem;
    flex-wrap:      wrap;
  }

  &__derived-item {
    display:       flex;
    flex-direction: column;
    gap:           0.15rem;
    flex:          1;
    min-width:     120px;

    &--fc { flex: 1.2; }
  }

  &__derived-label {
    font-size:   0.68rem;
    color:       var(--color-text-muted, #8899aa);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    display:     flex;
    align-items: center;
    gap:         0.3rem;
  }

  &__derived-val {
    font-size:   0.92rem;
    font-weight: 600;
    color:       var(--color-text, #e0eaff);
    font-family: 'Courier New', monospace;

    &--highlight { color: var(--color-primary, #00d4ff); }
  }

  &__errors {
    display:       flex;
    flex-direction: column;
    gap:           0.2rem;
  }

  &__error-item {
    font-size:   0.75rem;
    color:       var(--color-danger, #ff4d6d);
  }

  &__footer {
    display:         flex;
    justify-content: flex-end;
    gap:             0.75rem;
    padding:         0.85rem 1.25rem;
    border-top:      1px solid var(--color-border, rgba(255,255,255,0.1));
  }

  &__btn {
    padding:       0.45rem 1.2rem;
    border-radius: 5px;
    border:        1px solid transparent;
    font-size:     0.84rem;
    font-weight:   600;
    cursor:        pointer;
    transition:    background 0.15s, opacity 0.15s;

    &--cancel {
      background: transparent;
      border-color: rgba(255,255,255,0.15);
      color:       var(--color-text-muted, #8899aa);

      &:hover { background: rgba(255,255,255,0.05); }
    }

    &--save {
      background: var(--color-primary, #00d4ff);
      color:      #000;

      &:hover:not(:disabled) { background: #33deff; }
      &:disabled { opacity: 0.4; cursor: not-allowed; }
    }
  }

  /* ── Cell type pill selector ─────────────────────────────────── */
  &__type-pills {
    display: flex;
    gap: 0.5rem;
  }

  &__type-pill {
    flex: 1;
    padding: 0.4rem 0.6rem;
    border-radius: 5px;
    border: 1px solid var(--color-border, rgba(255,255,255,0.12));
    background: transparent;
    color: var(--color-text-muted, #8899aa);
    font-size: 0.78rem;
    cursor: pointer;
    text-align: center;
    transition: border-color 0.15s, color 0.15s, background 0.15s;

    &:hover { border-color: rgba(0,212,255,0.4); color: var(--color-text, #e0eaff); }

    &--active {
      border-color: var(--color-primary, #00d4ff);
      color: var(--color-primary, #00d4ff);
      background: rgba(0,212,255,0.08);
    }
  }

  /* ── Resonance section (bacteria/virus) ──────────────────────── */
  &__resonance-section {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    padding: 0.75rem 0.9rem;
    border-radius: 6px;
    border: 1px solid rgba(167,139,250,0.25);
    background: rgba(167,139,250,0.05);
  }

  &__resonance-title {
    font-size: 0.73rem;
    font-weight: 600;
    color: #a78bfa;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  &__resonance-sub {
    font-size: 0.67rem;
    font-weight: 400;
    color: var(--color-text-muted, #8899aa);
    text-transform: none;
    letter-spacing: 0;
  }
}

// ── Tooltip overlay ──────────────────────────────────────────────────────
.ccm-tip-overlay {
  position:   fixed;
  inset:      0;
  z-index:    9100;
  background: rgba(0,0,0,0.5);
  display:    flex;
  align-items: center;
  justify-content: center;
  padding:    1rem;
}

.ccm-tip-box {
  background: var(--color-surface, #0e1428);
  border:     1px solid var(--color-border, rgba(255,255,255,0.1));
  border-radius: 8px;
  padding:    1rem 1.25rem;
  max-width:  520px;
  font-size:  0.82rem;
  color:      var(--color-text, #e0eaff);
  line-height: 1.55;
  white-space: pre-wrap;
  position:   relative;

  strong { color: var(--color-primary, #00d4ff); }

  &__close {
    position:   absolute;
    top:        0.5rem;
    right:      0.6rem;
    background: transparent;
    border:     none;
    color:      var(--color-text-muted, #8899aa);
    cursor:     pointer;
    font-size:  0.85rem;
    padding:    0;

    &:hover { color: var(--color-text, #e0eaff); }
  }
}
</style>
