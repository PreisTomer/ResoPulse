<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <teleport to="body">
    <transition name="bsm-fade">
      <div v-if="visible" class="bsm-backdrop" @mousedown.self="$emit('close')" role="dialog" aria-modal="true">
        <div class="bsm">

          <!-- Header -->
          <div class="bsm__header">
            <div class="bsm__header-text">
              <div class="bsm__title">{{ $t('instrument.bridgeModal.title') }}</div>
              <div class="bsm__subtitle">{{ $t('instrument.bridgeModal.subtitle') }}</div>
            </div>
            <button class="bsm__close" @click="$emit('close')" type="button" :title="$t('instrument.bridgeModal.close')">
              {{ ICON.CLOSE }}
            </button>
          </div>

          <!-- Tab bar -->
          <div class="bsm__tabs" role="tablist">
            <button
              v-for="tab in TABS"
              :key="tab.key"
              class="bsm__tab-btn"
              :class="{ 'bsm__tab-btn--active': activeTab === tab.key }"
              @click="activeTab = tab.key"
              type="button"
              role="tab"
              :aria-selected="activeTab === tab.key"
            >
              <span class="bsm__tab-icon">{{ tab.icon }}</span>
              {{ $t(`instrument.bridgeModal.tabs.${tab.key}`) }}
            </button>
          </div>

          <!-- Tab body -->
          <div class="bsm__body">

            <!-- Quick Start -->
            <div v-if="activeTab === 'quick'" class="bsm__pane">
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
                      <button class="bsm__copy-btn" :class="{ 'bsm__copy-btn--copied': copiedKey === CMD.CHECK_PYTHON }" @click="copyCommand(CMD.CHECK_PYTHON)" type="button">
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
                      <button class="bsm__copy-btn" :class="{ 'bsm__copy-btn--copied': copiedKey === CMD.INSTALL_CORE }" @click="copyCommand(CMD.INSTALL_CORE)" type="button">
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
                      <button class="bsm__copy-btn" :class="{ 'bsm__copy-btn--copied': copiedKey === CMD.SMOKE_TEST }" @click="copyCommand(CMD.SMOKE_TEST)" type="button">
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
                      <button class="bsm__copy-btn" :class="{ 'bsm__copy-btn--copied': copiedKey === CMD.START_BACKEND }" @click="copyCommand(CMD.START_BACKEND)" type="button">
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
                      <button class="bsm__copy-btn" :class="{ 'bsm__copy-btn--copied': copiedKey === CMD.RUN_DEMO }" @click="copyCommand(CMD.RUN_DEMO)" type="button">
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

            <!-- BTX ECM -->
            <div v-if="activeTab === 'btx'" class="bsm__pane">
              <div class="bsm__pane-header">
                <div class="bsm__pane-title">{{ $t('instrument.bridgeModal.btx.title') }}</div>
                <div class="bsm__pane-sub">{{ $t('instrument.bridgeModal.btx.sub') }}</div>
              </div>
              <div class="bsm__steps">
                <div class="bsm__step">
                  <div class="bsm__step-num">1</div>
                  <div class="bsm__step-content">
                    <div class="bsm__step-label">{{ $t('instrument.bridgeModal.btx.s1Label') }}</div>
                    <div class="bsm__step-note">{{ $t('instrument.bridgeModal.btx.s1Note') }}</div>
                    <div class="bsm__code">
                      <pre class="bsm__pre">{{ CMD.PROBE }}</pre>
                      <button class="bsm__copy-btn" :class="{ 'bsm__copy-btn--copied': copiedKey === CMD.PROBE }" @click="copyCommand(CMD.PROBE)" type="button">
                        {{ copiedKey === CMD.PROBE ? ICON.CHECK : $t('instrument.bridgeModal.copy') }}
                      </button>
                    </div>
                  </div>
                </div>
                <div class="bsm__step">
                  <div class="bsm__step-num">2</div>
                  <div class="bsm__step-content">
                    <div class="bsm__step-label">{{ $t('instrument.bridgeModal.btx.s2Label') }}</div>
                    <div class="bsm__step-note">{{ $t('instrument.bridgeModal.btx.s2Note') }}</div>
                    <div class="bsm__code">
                      <pre class="bsm__pre">{{ CMD.INSTALL_SERIAL }}</pre>
                      <button class="bsm__copy-btn" :class="{ 'bsm__copy-btn--copied': copiedKey === CMD.INSTALL_SERIAL }" @click="copyCommand(CMD.INSTALL_SERIAL)" type="button">
                        {{ copiedKey === CMD.INSTALL_SERIAL ? ICON.CHECK : $t('instrument.bridgeModal.copy') }}
                      </button>
                    </div>
                  </div>
                </div>
                <div class="bsm__step">
                  <div class="bsm__step-num">3</div>
                  <div class="bsm__step-content">
                    <div class="bsm__step-label">{{ $t('instrument.bridgeModal.btx.s3Label') }}</div>
                    <div class="bsm__step-note">{{ $t('instrument.bridgeModal.btx.s3Note') }}</div>
                    <div class="bsm__code">
                      <pre class="bsm__pre">{{ CMD.RUN_BTX }}</pre>
                      <button class="bsm__copy-btn" :class="{ 'bsm__copy-btn--copied': copiedKey === CMD.RUN_BTX }" @click="copyCommand(CMD.RUN_BTX)" type="button">
                        {{ copiedKey === CMD.RUN_BTX ? ICON.CHECK : $t('instrument.bridgeModal.copy') }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div class="bsm__warn">
                <div class="bsm__warn-title">{{ ICON.WARNING }} {{ $t('instrument.bridgeModal.btx.warnTitle') }}</div>
                <div class="bsm__warn-body">{{ $t('instrument.bridgeModal.btx.warn') }}</div>
              </div>
            </div>

            <!-- VISA / LCR -->
            <div v-if="activeTab === 'visa'" class="bsm__pane">
              <div class="bsm__pane-header">
                <div class="bsm__pane-title">{{ $t('instrument.bridgeModal.visa.title') }}</div>
                <div class="bsm__pane-sub">{{ $t('instrument.bridgeModal.visa.sub') }}</div>
              </div>
              <div class="bsm__steps">
                <div class="bsm__step">
                  <div class="bsm__step-num">1</div>
                  <div class="bsm__step-content">
                    <div class="bsm__step-label">{{ $t('instrument.bridgeModal.visa.s1Label') }}</div>
                    <div class="bsm__step-note">{{ $t('instrument.bridgeModal.visa.s1Note') }}</div>
                  </div>
                </div>
                <div class="bsm__step">
                  <div class="bsm__step-num">2</div>
                  <div class="bsm__step-content">
                    <div class="bsm__step-label">{{ $t('instrument.bridgeModal.visa.s2Label') }}</div>
                    <div class="bsm__step-note">{{ $t('instrument.bridgeModal.visa.s2Note') }}</div>
                    <div class="bsm__code">
                      <pre class="bsm__pre">{{ CMD.INSTALL_VISA }}</pre>
                      <button class="bsm__copy-btn" :class="{ 'bsm__copy-btn--copied': copiedKey === CMD.INSTALL_VISA }" @click="copyCommand(CMD.INSTALL_VISA)" type="button">
                        {{ copiedKey === CMD.INSTALL_VISA ? ICON.CHECK : $t('instrument.bridgeModal.copy') }}
                      </button>
                    </div>
                    <div class="bsm__code">
                      <pre class="bsm__pre">{{ CMD.PROBE }}</pre>
                      <button class="bsm__copy-btn" :class="{ 'bsm__copy-btn--copied': copiedKey === CMD.PROBE }" @click="copyCommand(CMD.PROBE)" type="button">
                        {{ copiedKey === CMD.PROBE ? ICON.CHECK : $t('instrument.bridgeModal.copy') }}
                      </button>
                    </div>
                  </div>
                </div>
                <div class="bsm__step">
                  <div class="bsm__step-num">3</div>
                  <div class="bsm__step-content">
                    <div class="bsm__step-label">{{ $t('instrument.bridgeModal.visa.s3Label') }}</div>
                    <div class="bsm__step-note">{{ $t('instrument.bridgeModal.visa.s3Note') }}</div>
                    <div class="bsm__code">
                      <pre class="bsm__pre">{{ CMD.RUN_VISA }}</pre>
                      <button class="bsm__copy-btn" :class="{ 'bsm__copy-btn--copied': copiedKey === CMD.RUN_VISA }" @click="copyCommand(CMD.RUN_VISA)" type="button">
                        {{ copiedKey === CMD.RUN_VISA ? ICON.CHECK : $t('instrument.bridgeModal.copy') }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Serial LCR -->
            <div v-if="activeTab === 'serial'" class="bsm__pane">
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
                      <button class="bsm__copy-btn" :class="{ 'bsm__copy-btn--copied': copiedKey === CMD.PROBE }" @click="copyCommand(CMD.PROBE)" type="button">
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
                      <button class="bsm__copy-btn" :class="{ 'bsm__copy-btn--copied': copiedKey === CMD.INSTALL_SERIAL }" @click="copyCommand(CMD.INSTALL_SERIAL)" type="button">
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
                      <button class="bsm__copy-btn" :class="{ 'bsm__copy-btn--copied': copiedKey === CMD.RUN_SERIAL }" @click="copyCommand(CMD.RUN_SERIAL)" type="button">
                        {{ copiedKey === CMD.RUN_SERIAL ? ICON.CHECK : $t('instrument.bridgeModal.copy') }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <!-- Footer -->
          <div class="bsm__footer">
            {{ ICON.INFO }} {{ $t('instrument.bridgeModal.footer') }}
          </div>

        </div>
      </div>
    </transition>
  </teleport>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { ICON } from '@/constants/icons'

type TabKey = 'quick' | 'btx' | 'visa' | 'serial'

interface Tab {
  key: TabKey
  icon: string
}

// Terminal commands shown in code blocks — not translatable strings, intentionally hardcoded.
const CMD = {
  CHECK_PYTHON:   'py --version',
  INSTALL_CORE:   'cd instrument-bridge\nuv sync --extra serial',
  SMOKE_TEST:     'uv run python smoke_test.py',
  START_BACKEND:  'cd backend\nnpm run dev',
  RUN_DEMO:       'uv run instrument-bridge run --driver demo',
  PROBE:          'uv run instrument-bridge probe',
  INSTALL_SERIAL: 'uv sync --extra serial',
  INSTALL_VISA:   'uv sync --extra visa',
  RUN_BTX:        'uv run instrument-bridge run --driver btx --port COM4',
  RUN_VISA:       'uv run instrument-bridge run --driver visa_lcr --visa-resource "GPIB0::17::INSTR"',
  RUN_SERIAL:     'uv run instrument-bridge run --driver ascii_serial --port COM3',
}

const TABS: Tab[] = [
  { key: 'quick',  icon: ICON.LIGHTNING },
  { key: 'btx',    icon: ICON.PLUG },
  { key: 'visa',   icon: ICON.PLUG },
  { key: 'serial', icon: ICON.PLUG },
]

export default defineComponent({
  name: 'BridgeSetupModal',

  props: {
    visible: { type: Boolean, default: false },
  },

  emits: ['close'],

  data() {
    return {
      activeTab: 'quick' as TabKey,
      copiedKey: null as string | null,
      copyTimer: null as ReturnType<typeof setTimeout> | null,
    }
  },

  computed: {
    ICON: () => ICON,
    CMD:  () => CMD,
    TABS: () => TABS,
  },

  watch: {
    visible(isNowVisible: boolean) {
      if (isNowVisible) {
        this.activeTab = 'quick'
        this.copiedKey = null
      }
    },
  },

  methods: {
    copyCommand(text: string): void {
      navigator.clipboard.writeText(text).then(() => {
        if (this.copyTimer) clearTimeout(this.copyTimer)
        this.copiedKey = text
        this.copyTimer = setTimeout(() => {
          this.copiedKey = null
        }, 1500)
      })
    },
  },
})
</script>

<style lang="scss" scoped>
.bsm-fade-enter-active,
.bsm-fade-leave-active { transition: opacity var(--tr-slow); }
.bsm-fade-enter-from,
.bsm-fade-leave-to     { opacity: 0; }

.bsm-backdrop {
  position:        fixed;
  inset:           0;
  z-index:         9000;
  background:      color-mix(in srgb, black 72%, transparent);
  display:         flex;
  align-items:     center;
  justify-content: center;
  padding:         1rem;
}

.bsm {
  background:     var(--color-surface);
  border:         1px solid var(--color-border);
  border-radius:  var(--radius-lg);
  width:          min(740px, 100%);
  max-height:     88vh;
  display:        flex;
  flex-direction: column;
  overflow:       hidden;

  // ── Header ────────────────────────────────────────────────────────────────

  &__header {
    @include flex-between();
    padding:       1.1rem 1.4rem 1rem;
    border-bottom: 1px solid var(--color-border);
    gap:           0.75rem;
    flex-shrink:   0;
  }

  &__header-text {
    @include flex-col(0.2rem);
    min-width: 0;
  }

  &__title {
    font-size:   var(--fs-xl);
    font-weight: 600;
    color:       var(--color-text);
  }

  &__subtitle {
    font-size: var(--fs-sm);
    color:     var(--color-text-muted);
    line-height: 1.4;
  }

  &__close {
    background:    transparent;
    border:        none;
    color:         var(--color-text-muted);
    font-size:     1rem;
    cursor:        pointer;
    padding:       0.25rem 0.4rem;
    border-radius: var(--radius);
    flex-shrink:   0;
    transition:    color var(--tr-fast), background var(--tr-fast);

    &:hover { color: var(--color-text); background: var(--color-surface-2); }
  }

  // ── Tab bar ───────────────────────────────────────────────────────────────

  &__tabs {
    @include flex-row(0);
    border-bottom: 1px solid var(--color-border);
    padding:       0 1.4rem;
    flex-shrink:   0;
    overflow-x:    auto;
  }

  &__tab-btn {
    @include flex-row(0.3rem);
    background:    transparent;
    border:        none;
    border-bottom: 2px solid transparent;
    color:         var(--color-text-muted);
    font-size:     var(--fs-sm);
    padding:       0.55rem 0.85rem;
    cursor:        pointer;
    white-space:   nowrap;
    transition:    color var(--tr-fast), border-color var(--tr-fast);
    margin-bottom: -1px;

    &:hover { color: var(--color-text); }

    &--active {
      color:        var(--color-primary);
      border-color: var(--color-primary);
    }
  }

  &__tab-icon {
    font-size: var(--fs-xs);
    opacity:   var(--op-dim);
  }

  // ── Scrollable body ───────────────────────────────────────────────────────

  &__body {
    overflow-y: auto;
    flex:       1;
    padding:    1.25rem 1.4rem;
  }

  // ── Pane ─────────────────────────────────────────────────────────────────

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

  // ── Steps ─────────────────────────────────────────────────────────────────

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
    flex: 1;
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

  // ── Code block ────────────────────────────────────────────────────────────

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
    flex-shrink:   0;
    border:        none;
    border-left:   1px solid var(--color-border);
    background:    var(--color-surface-2);
    color:         var(--color-text-muted);
    font-size:     var(--fs-xxs);
    font-family:   var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding:       0 0.75rem;
    cursor:        pointer;
    transition:    color var(--tr-fast), background var(--tr-fast);

    &:hover { color: var(--color-text); background: var(--color-surface); }

    &--copied {
      color:      var(--color-accent);
      background: color-mix(in srgb, var(--color-accent) 8%, transparent);
    }
  }

  // ── Warning box ───────────────────────────────────────────────────────────

  &__warn {
    @include flex-col(0.35rem);
    background:    color-mix(in srgb, var(--color-amber) 8%, transparent);
    border:        1px solid color-mix(in srgb, var(--color-amber) 35%, transparent);
    border-radius: var(--radius);
    padding:       0.75rem 0.9rem;
  }

  &__warn-title {
    font-size:   var(--fs-sm);
    font-weight: 600;
    color:       var(--color-amber);
  }

  &__warn-body {
    font-size:   var(--fs-sm);
    color:       var(--color-text-muted);
    line-height: 1.55;
  }

  // ── Footer ────────────────────────────────────────────────────────────────

  &__footer {
    @include flex-row(0.4rem);
    border-top:  1px solid var(--color-border);
    padding:     0.7rem 1.4rem;
    font-size:   var(--fs-xs);
    color:       var(--color-text-muted);
    font-family: var(--font-mono);
    flex-shrink: 0;
  }

  // ── Responsive ────────────────────────────────────────────────────────────

  @media (max-width: 768px) {
    &__header { padding: 0.9rem 1rem 0.8rem; }
    &__tabs   { padding: 0 1rem; }
    &__body   { padding: 1rem; }
    &__footer { padding: 0.6rem 1rem; }
  }
}
</style>
