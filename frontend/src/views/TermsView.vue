<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="terms">
    <div class="terms__inner">

      <div class="terms__eyebrow">Legal</div>
      <h1 class="terms__title">Terms of Use</h1>
      <p class="terms__meta">Last Updated: April 16, 2026 &nbsp;·&nbsp; ResoPulse &nbsp;·&nbsp;
        <a href="https://www.resopulse-virtual-lab.com/" class="terms__link" target="_blank" rel="noopener">resopulse-virtual-lab.com</a>
        &nbsp;·&nbsp; <strong class="terms__patent-badge">Patent Pending</strong>
      </p>

      <p class="terms__intro">
        By accessing or using <a href="https://www.resopulse-virtual-lab.com/" class="terms__link" target="_blank" rel="noopener">https://www.resopulse-virtual-lab.com/</a>
        (the "Service"), you agree to be bound by these Terms of Use. If you do not agree, do not use the Service.
      </p>

      <section class="terms__section">
        <h2 class="terms__h2">1. Intellectual Property Ownership</h2>
        <dl class="terms__dl">
          <dt>Proprietary Logic</dt>
          <dd>All algorithms, including the Schwan single-shell and Kotnik-Miklavcic double-shell models, the real-time closed-loop impedance feedback system, the population-lysis integration model, and the Window of Selectivity optimisation framework, are the exclusive intellectual property of Tomer Preis.</dd>
          <dt>Patent Pending</dt>
          <dd>The novel methods implemented in this platform, including the closed-loop impedance feedback system, the Window of Selectivity optimisation algorithm, the instrument-bridge integration architecture, and the dual-population selectivity scoring methodology, are the subject of pending patent applications. Any reproduction, implementation, or commercialisation of these methods without written authorisation is strictly prohibited.</dd>
          <dt>Codebase</dt>
          <dd>The Vue 3, TypeScript, and Node.js source code, along with all custom physics modules (Pennes bioheat, nsEP pulse envelopes, Kotnik double-shell model, population lysis integration, DEP Clausius-Mossotti solver), are protected by copyright law. Copyright &copy; 2026 Tomer Preis. All rights reserved.</dd>
          <dt>Protocol Documentation</dt>
          <dd>The ResoPulse Protocol Documentation (accessible at /protocol) constitutes a proprietary scientific work authored by Tomer Preis and is protected by copyright. Access to this documentation does not grant any right to reproduce it, incorporate it into a competing product, or use it as a design basis for commercial instrumentation.</dd>
          <dt>No License</dt>
          <dd>Use of the website does not grant any license to download, clone, scrape, or reproduce any part of the platform, its algorithms, its cell-parameter library, or its documentation for any purpose beyond your own personal scientific use of the Service.</dd>
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
          <li>Attempt to decompile, disassemble, or reverse engineer any part of the virtual biophysics engine, its algorithms, or its physics modules.</li>
          <li>Use the Cell Library parameters, Experiment Lab logic, or any simulation outputs to design, develop, train, or commercialise a competing computational biophysics platform, electroporation simulation tool, or cell-engineering software product.</li>
          <li>Use the ResoPulse Protocol Documentation, in whole or in part, as a design specification, technical blueprint, or competitive analysis basis for developing commercial electroporation or cell-transfection instruments, regardless of whether those instruments are marketed to overlapping customer segments.</li>
          <li>Train, fine-tune, or prompt any machine-learning model, large language model, generative AI system, or automated analysis pipeline using the platform's protocol text, cell library entries, simulation outputs, or biophysical model implementations for any commercial or competitive purpose.</li>
          <li>Use automated scripts, web crawlers, bots, or scraping tools to systematically extract cell library parameters, biophysical model configurations, selectivity scores, or protocol content from any part of the Service.</li>
          <li>Reproduce, adapt, sublicense, or redistribute the Window of Selectivity methodology, the dual-population Therapeutic Index framework, or any other novel analytical method described in the platform's documentation or codebase, in any medium or format, without prior written permission.</li>
          <li>Bypass, circumvent, or disable any security measures, authentication layers, rate limits, or access controls provided by Vercel, Neon, Clerk, or any other component of the platform infrastructure.</li>
          <li>Access or use the Service in any manner intended to build a dataset, benchmark, or competitive intelligence report for the benefit of any third party engaged in the design or sale of electroporation, acoustic resonance, or cellular bioelectromagnetics equipment or software.</li>
        </ul>
        <p class="terms__p">
          These restrictions apply to all users, including employees, contractors, and agents of commercial life-science instrument manufacturers, contract research organisations, and academic technology-transfer offices acting on behalf of commercial partners.
        </p>
      </section>

      <section class="terms__section">
        <h2 class="terms__h2">4. Simulation Data Ownership</h2>
        <dl class="terms__dl">
          <dt>Your outputs</dt>
          <dd>Experiment results, CSV exports, and protocol configurations you generate using the Service are your own data. You retain ownership of those outputs.</dd>
          <dt>The engine</dt>
          <dd>The algorithms, biophysical models, and source code that produce those outputs remain the exclusive property of Tomer Preis. Ownership of outputs does not grant any license to the underlying logic.</dd>
          <dt>Model training</dt>
          <dd>Anonymised, aggregated outcome ratings you provide may be used to retrain the on-premise optimisation model. No personally identifiable information is used in this process.</dd>
        </dl>
      </section>

      <section class="terms__section">
        <h2 class="terms__h2">5. Limitation of Liability</h2>
        <p class="terms__p">
          Tomer Preis assumes no liability for experimental outcomes, laboratory decisions, or hardware damage resulting
          from the use of these simulations. The Service is provided <strong>"As-Is."</strong>
        </p>
      </section>

      <section class="terms__section">
        <h2 class="terms__h2">6. Model Versioning and Result Reproducibility</h2>
        <p class="terms__p">
          The biophysical models in ResoPulse may be updated between software versions to improve accuracy or incorporate
          new literature findings. Simulation results obtained from different versions of the Service may not be directly
          comparable. We recommend noting the software version when citing results in research documentation.
        </p>
      </section>

      <section class="terms__section">
        <h2 class="terms__h2">7. Academic Use and Attribution</h2>
        <p class="terms__p">
          If you use ResoPulse simulation outputs to inform published research, conference presentations, or technical
          reports, we ask (but do not require) that you acknowledge the tool. A suggested attribution:
        </p>
        <blockquote class="terms__quote">
          Simulation performed using ResoPulse Virtual Biophysics Engine (resopulse-virtual-lab.com, 2026). Biophysical
          models based on Kotnik &amp; Miklavcic (2000), Weaver &amp; Chizmadzhev (1996), and Pennes (1948).
        </blockquote>
      </section>

      <section class="terms__section">
        <h2 class="terms__h2">8. Trade Secrets and Confidential Information</h2>
        <p class="terms__p">
          Certain features and components of the ResoPulse platform constitute confidential information
          and trade secrets of Tomer Preis. These include, without limitation:
        </p>
        <ul class="terms__ul">
          <li>The AI-driven protocol optimiser and its trained model parameters.</li>
          <li>The instrument-bridge calibration logic and hardware-abstraction layer.</li>
          <li>The population-lysis Gaussian integration algorithm and its parameterisation.</li>
          <li>The proprietary cell parameter database values not derivable from published literature alone.</li>
          <li>The impedance feedback model and conductivity-drift correction methodology.</li>
        </ul>
        <p class="terms__p">
          By accessing any feature of the Service beyond the public home page, you acknowledge that
          you may be exposed to confidential technical information. You agree: (a) not to disclose,
          reproduce, or exploit such information outside of your personal scientific use of the
          Service; (b) not to use such information to develop or assist in developing any competing
          product or service; and (c) that these confidentiality obligations survive termination or
          expiry of your account.
        </p>
      </section>

      <section class="terms__section">
        <h2 class="terms__h2">9. Governing Law and Jurisdiction</h2>
        <p class="terms__p">
          These Terms of Use and any dispute, claim, or controversy arising out of or relating to
          your use of the Service shall be governed by and construed in accordance with the laws
          of the State of Israel, without regard to its conflict-of-law provisions.
        </p>
        <p class="terms__p">
          You irrevocably consent to the exclusive jurisdiction of the competent courts located in
          Israel for the resolution of any dispute arising under or in connection with these Terms.
          If you are located outside Israel, you may also have rights under the mandatory laws of
          your own jurisdiction; nothing in this clause limits those statutory rights.
        </p>
      </section>

      <section class="terms__section">
        <h2 class="terms__h2">10. Legal Notices and IP Claims</h2>
        <p class="terms__p">
          All formal legal notices, intellectual property infringement claims, trade-secret
          misappropriation allegations, or other legal correspondence must be sent to:
        </p>
        <p class="terms__p">
          <strong>Tomer Preis</strong><br>
          Rishon LeZion, Israel<br>
          <a href="mailto:preis.tomer@gmail.com" class="terms__link">preis.tomer@gmail.com</a><br>
          Subject line: <em>Legal Notice &ndash; ResoPulse</em>
        </p>
        <p class="terms__p">
          We will acknowledge receipt within 5 business days. Failure to use the correct subject
          line may delay routing and does not constitute a waiver of any right.
        </p>
      </section>

      <section class="terms__section">
        <h2 class="terms__h2">11. Changes to These Terms</h2>
        <p class="terms__p">
          We may update these Terms of Use as the Service evolves. Material changes will be communicated by updating
          the "Last Updated" date above. Continued use of the Service after the effective date constitutes acceptance
          of the revised terms.
        </p>
      </section>

      <div class="terms__footer">
        <RouterLink :to="ROUTE.HOME" class="terms__back">← Back to ResoPulse</RouterLink>
        <RouterLink :to="ROUTE.PRIVACY" class="terms__privacy-link">Privacy</RouterLink>
        <span class="terms__copy">© 2026 Tomer Preis. All rights reserved. Patent Pending.</span>
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

  &__patent-badge {
    font-family: var(--font-mono);
    font-size: var(--fs-xxs);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-amber);
    border: 1px solid color-mix(in srgb, var(--color-amber) 40%, transparent);
    background: color-mix(in srgb, var(--color-amber) 8%, transparent);
    padding: 0.1rem 0.45rem;
    border-radius: 3px;
    font-weight: 700;
    white-space: nowrap;
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
