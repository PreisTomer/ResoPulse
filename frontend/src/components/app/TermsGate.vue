<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <Teleport to="body">
    <div
      class="terms-gate"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tg-title"
    >
      <div class="terms-gate__backdrop" />
      <div class="terms-gate__panel">
        <div class="terms-gate__eyebrow">{{ $t("termsGate.eyebrow") }}</div>
        <h2 id="tg-title" class="terms-gate__title">
          {{ $t("termsGate.title") }}
        </h2>

        <div class="terms-gate__body">
          <p class="terms-gate__para" v-html="$t('termsGate.para')"></p>

          <ul class="terms-gate__list">
            <li v-html="$t('termsGate.li1')"></li>
            <li>{{ $t("termsGate.li2") }}</li>
            <li>{{ $t("termsGate.li3") }}</li>
            <li>{{ $t("termsGate.li4") }}</li>
          </ul>
        </div>

        <label class="terms-gate__check-row">
          <input
            v-model="agreed"
            class="terms-gate__checkbox"
            type="checkbox"
          />
          <span class="terms-gate__check-label">
            {{ $t("termsGate.checkLabel") }}
            <RouterLink to="/terms" class="terms-gate__link" target="_blank">{{
              $t("termsGate.termsLink")
            }}</RouterLink>
          </span>
        </label>

        <div class="terms-gate__actions">
          <RouterLink to="/" class="terms-gate__cancel">{{
            $t("termsGate.cancelBtn")
          }}</RouterLink>
          <button
            class="terms-gate__btn"
            :class="{ 'terms-gate__btn--ready': agreed }"
            :disabled="!agreed"
            @click="accept"
          >
            {{ $t("termsGate.enterBtn") }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts">
import { defineComponent } from "vue";

import { EMIT } from "@/constants/emitEvents";
const STORAGE_KEY = "rp_terms_v1";

export default defineComponent({
  name: "TermsGate",

  emits: [EMIT.ACCEPTED],

  data() {
    return {
      agreed: false,
    };
  },

  methods: {
    accept() {
      if (!this.agreed) return;
      localStorage.setItem(STORAGE_KEY, "1");
      this.$emit(EMIT.ACCEPTED);
    },
  },
});
</script>

<style lang="scss" scoped>
.terms-gate {
  position: fixed;
  inset: 0;
  z-index: 9000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;

  &__backdrop {
    position: absolute;
    inset: 0;
    background: color-mix(in srgb, var(--color-bg) 88%, transparent);
    backdrop-filter: blur(6px);
  }

  &__panel {
    position: relative;
    z-index: 1;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 10px;
    padding: 2rem 2rem 1.6rem;
    max-width: 520px;
    width: 100%;
    box-shadow:
      0 24px 64px color-mix(in srgb, black 60%, transparent),
      0 0 0 1px color-mix(in srgb, var(--color-primary) 6%, transparent);
  }

  &__eyebrow {
    font-family: var(--font-mono);
    font-size: var(--fs-xxs);
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--color-primary);
    margin-bottom: 0.4rem;
  }

  &__title {
    font-size: 1.15rem;
    font-weight: 800;
    color: var(--color-text-heading);
    margin: 0 0 1.25rem;
    line-height: 1.3;
  }

  &__body {
    margin-bottom: 1.25rem;
  }

  &__para {
    font-size: var(--fs-md);
    line-height: 1.65;
    color: var(--color-text);
    margin: 0 0 0.9rem;
  }

  &__list {
    margin: 0;
    padding-left: 1.1rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;

    li {
      font-size: var(--fs-sm);
      line-height: 1.55;
      color: var(--color-text-muted);
    }
  }

  &__check-row {
    display: flex;
    align-items: flex-start;
    gap: 0.65rem;
    cursor: pointer;
    padding: 0.85rem;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    background: color-mix(in srgb, white 2.5%, transparent);
    margin-bottom: 1.25rem;
    transition: border-color var(--tr-fast);

    &:hover {
      border-color: color-mix(in srgb, var(--color-primary) 30%, transparent);
    }
  }

  &__checkbox {
    margin-top: 1px;
    flex-shrink: 0;
    accent-color: var(--color-primary);
    width: 15px;
    height: 15px;
    cursor: pointer;
  }

  &__check-label {
    font-size: var(--fs-md);
    color: var(--color-text);
    line-height: 1.5;
  }

  &__link {
    color: var(--color-primary);
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  &__actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  &__cancel {
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    color: var(--color-text-muted);
    text-decoration: none;
    letter-spacing: 0.04em;
    transition: color var(--tr-fast);

    &:hover {
      color: var(--color-text);
    }
  }

  &__btn {
    padding: 0.6rem 1.4rem;
    border-radius: var(--radius);
    font-size: var(--fs-md);
    font-weight: 600;
    font-family: var(--font-sans);
    border: 1px solid var(--color-border);
    background: transparent;
    color: var(--color-text-muted);
    cursor: not-allowed;
    transition: all 0.18s;

    &--ready {
      background: var(--color-primary);
      border-color: var(--color-primary);
      color: var(--color-btn-dark);
      cursor: pointer;
      box-shadow: var(--glow-md);

      &:hover {
        filter: brightness(1.1);
        box-shadow: var(--glow-lg);
      }
    }
  }

  @media (max-width: 540px) {
    align-items: flex-end;

    &__panel {
      border-radius: 10px 10px 0 0;
      padding: 1.5rem 1.25rem 1.5rem;
      max-width: 100%;
      max-height: 92svh;
      overflow-y: auto;
    }
  }
}
</style>
