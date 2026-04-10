<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="cm-overlay" @click.self="$emit(EMIT.CLOSE)">
    <div class="cm" role="dialog" aria-modal="true" aria-labelledby="cm-title">

      <div class="cm__header">
        <div class="cm__header-left">
          <span class="cm__icon">{{ ICON.MAIL }}</span>
          <span id="cm-title" class="cm__title">{{ $t('nav.contactModalTitle') }}</span>
        </div>
        <button class="cm__close" @click="$emit(EMIT.CLOSE)" :aria-label="$t('nav.contactClose')">{{ ICON.CLOSE }}</button>
      </div>

      <p class="cm__subtitle">{{ $t('nav.contactModalSubtitle') }}</p>

      <form class="cm__form" @submit.prevent="send">

        <div class="cm__field">
          <label class="cm__label" for="cm-name">{{ $t('nav.contactLabelName') }}</label>
          <input
            id="cm-name"
            class="cm__input"
            type="text"
            v-model="form.name"
            :placeholder="$t('nav.contactNamePlaceholder')"
          />
        </div>

        <div class="cm__field">
          <label class="cm__label" for="cm-message">{{ $t('nav.contactLabelMessage') }}</label>
          <textarea
            id="cm-message"
            class="cm__textarea"
            v-model="form.message"
            rows="5"
            :placeholder="$t('nav.contactMessagePlaceholder')"
          ></textarea>
        </div>

        <div class="cm__footer">
          <a
            :href="whatsAppUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="cm__whatsapp"
          >
            <svg class="cm__whatsapp-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
            {{ $t('nav.contactWhatsApp') }}
          </a>
          <div class="cm__footer-right">
            <span class="cm__note">{{ $t('nav.contactNote') }}</span>
            <button type="submit" class="cm__send" :disabled="!isSendable">
              {{ ICON.MAIL }} {{ $t('nav.contactSend') }}
            </button>
          </div>
        </div>

      </form>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { ICON } from '@/constants/icons'
import { EMIT } from '@/constants/emitEvents'

const RECIPIENT     = 'preis.tomer@gmail.com'
const WHATSAPP_NUMBER = '972545972242'

export default defineComponent({
  name: 'ContactModal',

  emits: [EMIT.CLOSE],

  data() {
    return {
      form: {
        name:    '',
        message: '',
      },
    }
  },

  computed: {
    ICON() { return ICON },
    EMIT() { return EMIT },

    whatsAppUrl(): string {
      return `https://wa.me/${WHATSAPP_NUMBER}`
    },

    isSendable(): boolean {
      return this.form.message.trim().length > 0
    },
  },

  methods: {
    send(): void {
      const { name, message } = this.form
      const subject = encodeURIComponent('ResoPulse — Message from visitor')
      const lines = [
        name    ? `From: ${name}` : '',
        `\n${message}`,
      ].filter(Boolean)
      const body = encodeURIComponent(lines.join('\n'))
      window.location.href = `mailto:${RECIPIENT}?subject=${subject}&body=${body}`
      this.$emit(EMIT.CLOSE)
    },
  },
})
</script>

<style lang="scss" scoped>
.cm-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: color-mix(in srgb, var(--color-bg) 60%, transparent);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.cm {
  @include surface-card(var(--radius-lg), 1.5rem);
  width: 100%;
  max-width: 500px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  box-shadow: 0 8px 40px color-mix(in srgb, var(--color-bg) 20%, transparent);

  &__header {
    @include flex-between();

    &-left { @include flex-row(0.5rem); }
  }

  &__icon { font-size: 1rem; color: var(--color-primary); }

  &__title {
    font-size: var(--fs-md);
    font-weight: 700;
    color: var(--color-text-heading);
    letter-spacing: 0.01em;
  }

  &__close {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-text-muted);
    font-size: 1rem;
    padding: 0.2rem;
    line-height: 1;
    opacity: var(--op-muted);
    transition: opacity var(--tr-fast);
    &:hover { opacity: 1; }
  }

  &__subtitle {
    font-size: var(--fs-sm);
    color: var(--color-text-heading);
    line-height: 1.5;
    margin: 0;
    opacity: var(--op-partial);
  }

  &__form { display: flex; flex-direction: column; gap: 0.85rem; }

  &__field { display: flex; flex-direction: column; gap: 0.3rem; }

  &__label {
    @include mono-upper(var(--fs-xxs), 0.08em);
    color: var(--color-text-heading);
    opacity: var(--op-strong);
  }

  &__input,
  &__textarea {
    background: color-mix(in srgb, var(--color-primary) 3%, var(--color-bg));
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    color: var(--color-text-heading);
    font-family: var(--font-body);
    font-size: var(--fs-md);
    padding: 0.5rem 0.75rem;
    width: 100%;
    transition: border-color var(--tr-fast);
    box-sizing: border-box;

    &:focus {
      outline: none;
      border-color: var(--color-primary);
    }

    &::placeholder { color: var(--color-text-muted); opacity: var(--op-dim); }
  }

  &__textarea { resize: vertical; min-height: 110px; line-height: 1.55; }

  &__footer {
    @include flex-between();
    margin-top: 0.25rem;
    gap: 1rem;
    flex-wrap: wrap;
  }

  &__footer-right {
    @include flex-row(0.75rem);
    align-items: center;
  }

  &__whatsapp {
    @include flex-row(0.4rem);
    align-items: center;
    font-size: var(--fs-sm);
    color: var(--color-primary);
    opacity: var(--op-partial);
    text-decoration: none;
    transition: opacity var(--tr-fast);

    &:hover { opacity: 1; }

    &-icon {
      width: 1rem;
      height: 1rem;
      flex-shrink: 0;
    }
  }

  &__note {
    font-size: var(--fs-xxs);
    color: var(--color-text-heading);
    opacity: var(--op-muted);
    font-family: var(--font-mono);
  }

  &__send {
    @include flex-row(0.4rem);
    background: color-mix(in srgb, var(--color-primary) 28%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-primary) 75%, white);
    border-radius: var(--radius);
    color: var(--color-text-heading);
    font-family: var(--font-mono);
    font-size: var(--fs-sm);
    font-weight: 600;
    padding: 0.45rem 1rem;
    cursor: pointer;
    transition: background-color var(--tr-fast), box-shadow var(--tr-fast), opacity var(--tr-fast);

    &:hover:not(:disabled) {
      background: color-mix(in srgb, var(--color-primary) 40%, transparent);
      box-shadow: 0 0 10px color-mix(in srgb, var(--color-primary) 30%, transparent);
    }
    &:disabled { opacity: var(--op-ghost); cursor: not-allowed; }
  }
}
</style>
