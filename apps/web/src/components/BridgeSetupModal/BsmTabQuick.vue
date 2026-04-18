<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="bsm__pane">
    <div class="bsm__pane-header">
      <div class="bsm__pane-title">{{ $t('instrument.bridgeModal.quick.title') }}</div>
      <div class="bsm__pane-sub">{{ $t('instrument.bridgeModal.quick.sub') }}</div>
    </div>
    <div class="bsm__steps">
      <div class="bsm__step">
        <div class="bsm__step-num">1</div>
        <div class="bsm__step-content">
          <div class="bsm__step-label">{{ $t('instrument.bridgeModal.quick.s1Label') }}</div>
          <div class="bsm__step-note">{{ $t('instrument.bridgeModal.quick.s1Note') }}</div>
          <div class="bsm__code">
            <pre class="bsm__pre">{{ CMD.CHECK_PYTHON }}</pre>
            <button class="bsm__copy-btn" :class="{ 'bsm__copy-btn--copied': copiedKey === CMD.CHECK_PYTHON }" @click="$emit(EMIT.COPY, CMD.CHECK_PYTHON)" type="button">
              {{ copiedKey === CMD.CHECK_PYTHON ? ICON.CHECK : $t('instrument.bridgeModal.copy') }}
            </button>
          </div>
        </div>
      </div>
      <div class="bsm__step">
        <div class="bsm__step-num">2</div>
        <div class="bsm__step-content">
          <div class="bsm__step-label">{{ $t('instrument.bridgeModal.quick.s2Label') }}</div>
          <div class="bsm__step-note">{{ $t('instrument.bridgeModal.quick.s2Note') }}</div>
          <div class="bsm__code">
            <pre class="bsm__pre">{{ CMD.INSTALL_CORE }}</pre>
            <button class="bsm__copy-btn" :class="{ 'bsm__copy-btn--copied': copiedKey === CMD.INSTALL_CORE }" @click="$emit(EMIT.COPY, CMD.INSTALL_CORE)" type="button">
              {{ copiedKey === CMD.INSTALL_CORE ? ICON.CHECK : $t('instrument.bridgeModal.copy') }}
            </button>
          </div>
        </div>
      </div>
      <div class="bsm__step">
        <div class="bsm__step-num">3</div>
        <div class="bsm__step-content">
          <div class="bsm__step-label">{{ $t('instrument.bridgeModal.quick.s3Label') }}</div>
          <div class="bsm__step-note">{{ $t('instrument.bridgeModal.quick.s3Note') }}</div>
          <div class="bsm__code">
            <pre class="bsm__pre">{{ CMD.SMOKE_TEST }}</pre>
            <button class="bsm__copy-btn" :class="{ 'bsm__copy-btn--copied': copiedKey === CMD.SMOKE_TEST }" @click="$emit(EMIT.COPY, CMD.SMOKE_TEST)" type="button">
              {{ copiedKey === CMD.SMOKE_TEST ? ICON.CHECK : $t('instrument.bridgeModal.copy') }}
            </button>
          </div>
        </div>
      </div>
      <div class="bsm__step">
        <div class="bsm__step-num">4</div>
        <div class="bsm__step-content">
          <div class="bsm__step-label">{{ $t('instrument.bridgeModal.quick.s4Label') }}</div>
          <div class="bsm__step-note">{{ $t('instrument.bridgeModal.quick.s4Note') }}</div>
          <div class="bsm__code">
            <pre class="bsm__pre">{{ CMD.START_BACKEND }}</pre>
            <button class="bsm__copy-btn" :class="{ 'bsm__copy-btn--copied': copiedKey === CMD.START_BACKEND }" @click="$emit(EMIT.COPY, CMD.START_BACKEND)" type="button">
              {{ copiedKey === CMD.START_BACKEND ? ICON.CHECK : $t('instrument.bridgeModal.copy') }}
            </button>
          </div>
        </div>
      </div>
      <div class="bsm__step">
        <div class="bsm__step-num">5</div>
        <div class="bsm__step-content">
          <div class="bsm__step-label">{{ $t('instrument.bridgeModal.quick.s5Label') }}</div>
          <div class="bsm__step-note">{{ $t('instrument.bridgeModal.quick.s5Note') }}</div>
          <div class="bsm__code">
            <pre class="bsm__pre">{{ CMD.RUN_DEMO }}</pre>
            <button class="bsm__copy-btn" :class="{ 'bsm__copy-btn--copied': copiedKey === CMD.RUN_DEMO }" @click="$emit(EMIT.COPY, CMD.RUN_DEMO)" type="button">
              {{ copiedKey === CMD.RUN_DEMO ? ICON.CHECK : $t('instrument.bridgeModal.copy') }}
            </button>
          </div>
        </div>
      </div>
      <div class="bsm__step bsm__step--highlight">
        <div class="bsm__step-num bsm__step-num--accent">6</div>
        <div class="bsm__step-content">
          <div class="bsm__step-label">{{ $t('instrument.bridgeModal.quick.s6Label') }}</div>
          <div class="bsm__step-note">{{ $t('instrument.bridgeModal.quick.s6Note') }}</div>
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
  name: 'BsmTabQuick',

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

    &--highlight {
      background:    color-mix(in srgb, var(--color-primary) 4%, transparent);
      border-radius: var(--radius);
      padding:       0.75rem 0.6rem;
      border-bottom: none;
      margin-top:    0.25rem;
    }
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

    &--accent {
      background:   color-mix(in srgb, var(--color-primary) 15%, transparent);
      border-color: color-mix(in srgb, var(--color-primary) 40%, transparent);
      color:        var(--color-primary);
    }
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
