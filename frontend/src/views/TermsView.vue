<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="terms">
    <div class="terms__inner">

      <div class="terms__eyebrow">Legal</div>
      <h1 class="terms__title">Terms of Use</h1>
      <p class="terms__meta">Last Updated: March 16, 2026 &nbsp;·&nbsp; ResoPulse &nbsp;·&nbsp;
        <a href="https://bio-resonance.vercel.app/" class="terms__link" target="_blank" rel="noopener">bio-resonance.vercel.app</a>
      </p>

      <p class="terms__intro">
        By accessing or using <a href="https://bio-resonance.vercel.app/" class="terms__link" target="_blank" rel="noopener">https://bio-resonance.vercel.app/</a>
        (the "Service"), you agree to be bound by these Terms of Use. If you do not agree, do not use the Service.
      </p>

      <section class="terms__section">
        <h2 class="terms__h2">1. Intellectual Property Ownership</h2>
        <dl class="terms__dl">
          <dt>Proprietary Logic</dt>
          <dd>All algorithms, including the Schwan single-shell and Kotnik-Miklavcic double-shell models, are the exclusive property of Tomer Preis.</dd>
          <dt>Codebase</dt>
          <dd>The Vue 3, TypeScript, and Node.js source code, along with custom physics modules (Pennes bioheat, nsEP pulse envelopes), are protected by copyright law.</dd>
          <dt>No License</dt>
          <dd>Use of the website does not grant any license to download, clone, or "scrape" the repository for any purpose.</dd>
        </dl>
      </section>

      <section class="terms__section">
        <h2 class="terms__h2">2. Research Use &amp; Scientific Disclaimer</h2>
        <dl class="terms__dl">
          <dt>In-Vitro Only</dt>
          <dd>ResoPulse is a computational simulation tool intended for in-vitro laboratory research only.</dd>
          <dt>Not a Medical Device</dt>
          <dd>This software is not a medical device and should not be used for clinical diagnostics or human treatment.</dd>
          <dt>Approximations</dt>
          <dd>All biophysical parameters are approximations derived from bioelectromagnetics literature; real-world results may vary.</dd>
        </dl>
      </section>

      <section class="terms__section">
        <h2 class="terms__h2">3. User Restrictions</h2>
        <p class="terms__p">You strictly agree <strong>NOT</strong> to:</p>
        <ul class="terms__ul">
          <li>Attempt to decompile or reverse engineer any part of the virtual biophysics engine.</li>
          <li>Use the "Cell Library" data or "Experiment Lab" logic to build a competing software product.</li>
          <li>Bypass any security measures or authentication layers provided via Vercel or Railway.</li>
        </ul>
      </section>

      <section class="terms__section">
        <h2 class="terms__h2">4. Limitation of Liability</h2>
        <p class="terms__p">
          Tomer Preis assumes no liability for experimental outcomes, laboratory decisions, or hardware damage resulting
          from the use of these simulations. The Service is provided <strong>"As-Is."</strong>
        </p>
      </section>

      <div class="terms__footer">
        <RouterLink to="/" class="terms__back">← Back to ResoPulse</RouterLink>
        <span class="terms__copy">© 2026 Tomer Preis. All rights reserved.</span>
      </div>

    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'TermsView',
})
</script>

<style lang="scss" scoped>
.terms {
  flex: 1;
  display: flex;
  justify-content: center;
  padding: 3rem 1.5rem 4rem;

  &__inner {
    max-width: 760px;
    width: 100%;
  }

  &__eyebrow {
    font-family: var(--font-mono);
    font-size: 0.65rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--color-primary);
    margin-bottom: 0.5rem;
  }

  &__title {
    font-size: clamp(1.6rem, 4vw, 2.4rem);
    font-weight: 800;
    color: var(--color-text-heading);
    margin: 0 0 0.4rem;
  }

  &__meta {
    font-family: var(--font-mono);
    font-size: 0.65rem;
    color: var(--color-text-muted);
    margin: 0 0 1.75rem;
    letter-spacing: 0.04em;
  }

  &__intro {
    font-size: 0.88rem;
    line-height: 1.7;
    color: var(--color-text);
    border-left: 2px solid var(--color-primary);
    padding-left: 1rem;
    margin-bottom: 2rem;
  }

  &__section {
    margin-bottom: 2rem;
    padding-bottom: 2rem;
    border-bottom: 1px solid var(--color-border);

    &:last-of-type {
      border-bottom: none;
    }
  }

  &__h2 {
    font-size: 1rem;
    font-weight: 700;
    color: var(--color-text-heading);
    font-family: var(--font-mono);
    letter-spacing: 0.04em;
    margin: 0 0 1rem;
  }

  &__dl {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 0.5rem 1.25rem;
    margin: 0;

    dt {
      font-family: var(--font-mono);
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--color-primary);
      letter-spacing: 0.04em;
      padding-top: 0.1rem;
      white-space: nowrap;
    }

    dd {
      font-size: 0.83rem;
      line-height: 1.65;
      color: var(--color-text);
      margin: 0;
    }
  }

  &__p {
    font-size: 0.83rem;
    line-height: 1.65;
    color: var(--color-text);
    margin: 0 0 0.75rem;
  }

  &__ul {
    margin: 0;
    padding-left: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.45rem;

    li {
      font-size: 0.83rem;
      line-height: 1.6;
      color: var(--color-text);
    }
  }

  &__link {
    color: var(--color-primary);
    text-decoration: none;

    &:hover { text-decoration: underline; }
  }

  &__footer {
    margin-top: 2.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  &__back {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    color: var(--color-primary);
    text-decoration: none;
    letter-spacing: 0.04em;

    &:hover { text-decoration: underline; }
  }

  &__copy {
    font-family: var(--font-mono);
    font-size: 0.62rem;
    color: var(--color-text-muted);
    opacity: 0.65;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  @media (max-width: 540px) {
    padding: 2rem 1rem 3rem;

    &__dl {
      grid-template-columns: 1fr;
      gap: 0.2rem;

      dt { margin-top: 0.6rem; }
    }
  }
}
</style>
