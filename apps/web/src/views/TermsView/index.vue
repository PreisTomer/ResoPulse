<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <div class="terms">
    <div class="terms__inner">

      <div class="terms__eyebrow">Legal</div>
      <h1 class="terms__title">Terms of Use</h1>
      <p class="terms__meta">Last Updated: April 29, 2026 &nbsp;·&nbsp; ResoPulse</p>

      <p class="terms__intro">
        ResoPulse (the "Service") is a free, open-source research and portfolio project. By using the Service you agree to these Terms.
      </p>

      <section class="terms__section">
        <h2 class="terms__h2">1. License</h2>
        <p class="terms__p">
          The ResoPulse source code is released under the
          <a href="https://opensource.org/licenses/MIT" class="terms__link" target="_blank" rel="noopener">MIT License</a>.
          You are free to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
          software, subject to the conditions of that license. Copyright &copy; 2026 Tomer Preis.
        </p>
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
        <h2 class="terms__h2">3. Your Simulation Data</h2>
        <p class="terms__p">
          Experiment results, CSV exports, and protocol configurations you generate using the Service are your own data.
          Anonymised, aggregated outcome ratings you choose to log may be used to retrain the on-premise optimisation
          model; no personally identifiable information is used in that process.
        </p>
      </section>

      <section class="terms__section">
        <h2 class="terms__h2">4. Disclaimer of Warranty and Liability</h2>
        <p class="terms__p">
          The Service is provided <strong>"AS IS"</strong>, without warranty of any kind, express or implied, including
          but not limited to the warranties of merchantability, fitness for a particular purpose, and non-infringement.
          In no event shall the authors or copyright holders be liable for any claim, damages, or other liability,
          whether in an action of contract, tort, or otherwise, arising from, out of, or in connection with the Service
          or the use or other dealings in the Service.
        </p>
      </section>

      <section class="terms__section">
        <h2 class="terms__h2">5. Model Versioning and Reproducibility</h2>
        <p class="terms__p">
          The biophysical models in ResoPulse may be updated between software versions to improve accuracy or incorporate
          new literature findings. Simulation results obtained from different versions may not be directly comparable.
          Note the software version when citing results in research documentation.
        </p>
      </section>

      <section class="terms__section">
        <h2 class="terms__h2">6. Academic Attribution (Suggested)</h2>
        <p class="terms__p">
          If you use ResoPulse simulation outputs in published research, conference presentations, or technical reports,
          a citation is appreciated but not required. A suggested attribution:
        </p>
        <blockquote class="terms__quote">
          Simulation performed using ResoPulse Closed-Loop Electroporation Digital Twin (2026). Biophysical
          models based on Kotnik &amp; Miklavcic (2000), Weaver &amp; Chizmadzhev (1996), and Pennes (1948).
        </blockquote>
      </section>

      <section class="terms__section">
        <h2 class="terms__h2">7. Contact</h2>
        <p class="terms__p">
          Questions, bug reports, or correspondence:
          <a href="mailto:preis.tomer@gmail.com" class="terms__link">preis.tomer@gmail.com</a>.
        </p>
      </section>

      <section class="terms__section">
        <h2 class="terms__h2">8. Changes to These Terms</h2>
        <p class="terms__p">
          These Terms may be updated as the project evolves. Material changes will be communicated by updating the
          "Last Updated" date above.
        </p>
      </section>

      <div class="terms__footer">
        <RouterLink :to="ROUTE.HOME" class="terms__back">← Back to ResoPulse</RouterLink>
        <RouterLink :to="ROUTE.PRIVACY" class="terms__privacy-link">Privacy</RouterLink>
        <span class="terms__copy">© 2026 Tomer Preis · MIT License</span>
      </div>

    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { ROUTE } from '@/constants/routes'

export default defineComponent({
  name: 'TermsView',

  computed: {
    ROUTE() { return ROUTE },
  },
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
    font-size: var(--fs-xxs);
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
    font-size: var(--fs-xxs);
    color: var(--color-text-muted);
    margin: 0 0 1.75rem;
    letter-spacing: 0.04em;
  }

  &__intro {
    font-size: var(--fs-lg);
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
      font-size: var(--fs-sm);
      font-weight: 700;
      color: var(--color-primary);
      letter-spacing: 0.04em;
      padding-top: 0.1rem;
      white-space: nowrap;
    }

    dd {
      font-size: var(--fs-md);
      line-height: 1.65;
      color: var(--color-text);
      margin: 0;
    }
  }

  &__p {
    font-size: var(--fs-md);
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
      font-size: var(--fs-md);
      line-height: 1.6;
      color: var(--color-text);
    }
  }

  &__link {
    color: var(--color-primary);
    text-decoration: none;

    &:hover { text-decoration: underline; }
  }

  &__quote {
    font-size: var(--fs-sm);
    line-height: 1.65;
    color: var(--color-text-muted);
    border-left: 2px solid var(--color-border);
    padding-left: 1rem;
    margin: 0.75rem 0 0;
    font-style: italic;
  }

  &__footer {
    margin-top: 2.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  &__back,
  &__privacy-link {
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    color: var(--color-primary);
    text-decoration: none;
    letter-spacing: 0.04em;

    &:hover { text-decoration: underline; }
  }

  &__copy {
    font-family: var(--font-mono);
    font-size: var(--fs-xxs);
    color: var(--color-text-muted);
    opacity: var(--op-dim);
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
