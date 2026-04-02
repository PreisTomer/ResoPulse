<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="bsm__pane">
    <div class="bsm__pane-header">
      <div class="bsm__pane-title">{{ $t('instrument.bridgeModal.serial.title') }}</div>
      <div class="bsm__pane-sub">{{ $t('instrument.bridgeModal.serial.sub') }}</div>
    </div>
    <div class="bsm__steps">
      <div class="bsm__step">
        <div class="bsm__step-num">1</div>
        <div class="bsm__step-content">
          <div class="bsm__step-label">{{ $t('instrument.bridgeModal.serial.s1Label') }}</div>
          <div class="bsm__step-note">{{ $t('instrument.bridgeModal.serial.s1Note') }}</div>
        </div>
      </div>
      <div class="bsm__step">
        <div class="bsm__step-num">2</div>
        <div class="bsm__step-content">
          <div class="bsm__step-label">{{ $t('instrument.bridgeModal.serial.s2Label') }}</div>
          <div class="bsm__step-note">{{ $t('instrument.bridgeModal.serial.s2Note') }}</div>
          <div class="bsm__code">
            <pre class="bsm__pre">{{ CMD.PROBE }}</pre>
            <button class="bsm__copy-btn" :class="{ 'bsm__copy-btn--copied': copiedKey === CMD.PROBE }" @click="$emit(EMIT.COPY, CMD.PROBE)" type="button">
              {{ copiedKey === CMD.PROBE ? ICON.CHECK : $t('instrument.bridgeModal.copy') }}
            </button>
          </div>
        </div>
      </div>
      <div class="bsm__step">
        <div class="bsm__step-num">3</div>
        <div class="bsm__step-content">
          <div class="bsm__step-label">{{ $t('instrument.bridgeModal.serial.s3Label') }}</div>
          <div class="bsm__step-note">{{ $t('instrument.bridgeModal.serial.s3Note') }}</div>
          <div class="bsm__code">
            <pre class="bsm__pre">{{ CMD.INSTALL_SERIAL }}</pre>
            <button class="bsm__copy-btn" :class="{ 'bsm__copy-btn--copied': copiedKey === CMD.INSTALL_SERIAL }" @click="$emit(EMIT.COPY, CMD.INSTALL_SERIAL)" type="button">
              {{ copiedKey === CMD.INSTALL_SERIAL ? ICON.CHECK : $t('instrument.bridgeModal.copy') }}
            </button>
          </div>
        </div>
      </div>
      <div class="bsm__step">
        <div class="bsm__step-num">4</div>
        <div class="bsm__step-content">
          <div class="bsm__step-label">{{ $t('instrument.bridgeModal.serial.s4Label') }}</div>
          <div class="bsm__step-note">{{ $t('instrument.bridgeModal.serial.s4Note') }}</div>
          <div class="bsm__code">
            <pre class="bsm__pre">{{ CMD.RUN_SERIAL }}</pre>
            <button class="bsm__copy-btn" :class="{ 'bsm__copy-btn--copied': copiedKey === CMD.RUN_SERIAL }" @click="$emit(EMIT.COPY, CMD.RUN_SERIAL)" type="button">
              {{ copiedKey === CMD.RUN_SERIAL ? ICON.CHECK : $t('instrument.bridgeModal.copy') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import { CMD } from './bsmCommands'
import { ICON } from '@/constants/icons'
import { EMIT } from '@/constants/emitEvents'

export default defineComponent({
  name: 'BsmTabSerial',

  props: {
    copiedKey: { type: String as PropType<string | null>, default: null },
  },

  emits: [EMIT.COPY],

  computed: {
    CMD:  () => CMD,
    ICON: () => ICON,
    EMIT: () => EMIT,
  },
})
</script>

<style lang="scss" scoped>
.bsm {
  &__pane {
    @include flex-col(1.1rem);
  }

  &__pane-header {
    @include flex-col(0.25rem);
  }

  &__pane-title {
    font-size:   var(--fs-lg);
    font-weight: 600;
    color:       var(--color-text);
  }

  &__pane-sub {
    font-size:   var(--fs-sm);
    color:       var(--color-text-muted);
    line-height: 1.5;
  }

  &__steps {
    @include flex-col(0);
  }

  &__step {
    @include flex-row(0.85rem);
    align-items:   flex-start;
    padding:       0.75rem 0;
    border-bottom: 1px solid color-mix(in srgb, var(--color-border) 50%, transparent);

    &:last-child { border-bottom: none; }
  }

  &__step-num {
    @include inline-flex-center();
    width:         1.6rem;
    height:        1.6rem;
    border-radius: 50%;
    background:    var(--color-surface-2);
    border:        1px solid var(--color-border);
    font-family:   var(--font-mono);
    font-size:     var(--fs-xs);
    color:         var(--color-text-muted);
    flex-shrink:   0;
    margin-top:    0.05rem;
  }

  &__step-content {
    @include flex-col(0.45rem);
    flex:      1;
    min-width: 0;
  }

  &__step-label {
    font-size:   var(--fs-md);
    font-weight: 600;
    color:       var(--color-text);
    line-height: 1.3;
  }

  &__step-note {
    font-size:   var(--fs-sm);
    color:       var(--color-text-muted);
    line-height: 1.5;
  }

  &__code {
    position:      relative;
    display:       flex;
    align-items:   stretch;
    border:        1px solid var(--color-border);
    border-radius: var(--radius);
    overflow:      hidden;
    background:    var(--color-bg);
  }

  &__pre {
    font-family: var(--font-mono);
    font-size:   var(--fs-sm);
    color:       var(--color-primary);
    padding:     0.55rem 0.75rem;
    margin:      0;
    flex:        1;
    white-space: pre;
    overflow-x:  auto;
    line-height: 1.55;
    border:      none;
    background:  transparent;
  }

  &__copy-btn {
    @include inline-flex-center();
    flex-shrink:    0;
    border:         none;
    border-left:    1px solid var(--color-border);
    background:     var(--color-surface-2);
    color:          var(--color-text-muted);
    font-size:      var(--fs-xxs);
    font-family:    var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding:        0 0.75rem;
    cursor:         pointer;
    transition:     color var(--tr-fast), background var(--tr-fast);

    &:hover { color: var(--color-text); background: var(--color-surface); }

    &--copied {
      color:      var(--color-accent);
      background: color-mix(in srgb, var(--color-accent) 8%, transparent);
    }
  }
}
</style>
