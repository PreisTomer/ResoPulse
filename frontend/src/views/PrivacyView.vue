<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="privacy">
    <div class="privacy__inner">

      <div class="privacy__eyebrow">Legal</div>
      <h1 class="privacy__title">Privacy Policy</h1>
      <p class="privacy__meta">Last Updated: April 10, 2026 &nbsp;·&nbsp; ResoPulse &nbsp;·&nbsp;
        <a href="https://www.resopulse-virtual-lab.com/" class="privacy__link" target="_blank" rel="noopener">resopulse-virtual-lab.com</a>
      </p>

      <p class="privacy__intro">
        This Privacy Policy describes how Tomer Preis ("we", "our", or "us") collects, uses, and
        protects information when you use ResoPulse ("the Service"). By creating an account or using
        the Service you agree to this policy.
      </p>

      <section class="privacy__section">
        <h2 class="privacy__h2">1. Data Controller</h2>
        <p class="privacy__p">
          The data controller responsible for your personal data is Tomer Preis, the developer and
          operator of ResoPulse. For all privacy inquiries contact:
          <a href="mailto:preis.tomer@gmail.com" class="privacy__link">preis.tomer@gmail.com</a>
        </p>
      </section>

      <section class="privacy__section">
        <h2 class="privacy__h2">2. What Data We Collect</h2>
        <dl class="privacy__dl">
          <dt>Account data</dt>
          <dd>
            When you register, Clerk (our authentication provider) collects your email address and
            display name. We store a reference to your Clerk user ID in our database to associate
            your experiment data with your account.
          </dd>
          <dt>Experiment data</dt>
          <dd>
            Simulation parameters you configure (cell properties, pulse settings, medium
            conductivity, etc.) and the resulting computed outputs are stored server-side and
            associated with your account. This data is scientific in nature and contains no
            personal health information.
          </dd>
          <dt>Local storage</dt>
          <dd>
            We write a single key (<code>rp_terms_v1</code>) to your browser's local storage to
            record that you have accepted these terms. Experiment UI state and user presets may
            also be persisted locally via your browser.
          </dd>
          <dt>Technical data</dt>
          <dd>
            Standard web server logs (IP address, browser type, request timestamps) are retained
            by our hosting provider, Vercel, for up to 30 days for security and debugging purposes.
            We do not process or store these logs ourselves.
          </dd>
        </dl>
      </section>

      <section class="privacy__section">
        <h2 class="privacy__h2">3. What We Do Not Collect</h2>
        <ul class="privacy__ul">
          <li>We do not use advertising trackers or analytics SDKs (no Google Analytics, Mixpanel, Meta Pixel, or similar).</li>
          <li>We do not collect payment card data — any future billing is handled entirely by our payment processor.</li>
          <li>We do not collect health information, medical records, or any data relating to real patients or clinical subjects.</li>
          <li>We do not sell, rent, or share your personal data with third parties for their own marketing purposes.</li>
        </ul>
      </section>

      <section class="privacy__section">
        <h2 class="privacy__h2">4. How We Use Your Data</h2>
        <dl class="privacy__dl">
          <dt>Providing the Service</dt>
          <dd>Account data and experiment data are used solely to operate ResoPulse: authenticating your session, storing your simulation results, and powering the AI optimisation features.</dd>
          <dt>Improving the simulation models</dt>
          <dd>Anonymised, aggregated experiment outcomes may be used to retrain the on-premise XGBoost model. No individual user data is transmitted to any third-party AI service.</dd>
          <dt>Security and abuse prevention</dt>
          <dd>Technical logs retained by Vercel are used to investigate suspicious activity and protect the Service.</dd>
        </dl>
      </section>

      <section class="privacy__section">
        <h2 class="privacy__h2">5. Legal Basis for Processing (GDPR)</h2>
        <p class="privacy__p">
          If you are located in the European Economic Area, our legal bases for processing your personal data are:
        </p>
        <ul class="privacy__ul">
          <li><strong>Contract performance</strong> — processing your account data is necessary to provide the Service you signed up for.</li>
          <li><strong>Legitimate interests</strong> — technical logs are processed to maintain security and prevent abuse.</li>
          <li><strong>Consent</strong> — you provide explicit consent to these terms before accessing the Experiment Lab.</li>
        </ul>
      </section>

      <section class="privacy__section">
        <h2 class="privacy__h2">6. Third-Party Service Providers</h2>
        <p class="privacy__p">
          We use the following sub-processors. Each processes data only as necessary to deliver
          the Service and is contractually bound to appropriate data protection standards.
        </p>
        <dl class="privacy__dl">
          <dt>Clerk</dt>
          <dd>Authentication and user management. Processes email address and display name. Data
            centres in the US (EU data residency option available on Clerk's paid plans).
            <a href="https://clerk.com/legal/privacy" class="privacy__link" target="_blank" rel="noopener">Clerk Privacy Policy</a>.</dd>
          <dt>Vercel</dt>
          <dd>Frontend hosting and CDN. Processes IP addresses and HTTP request data via edge
            network logs. Data centres globally.
            <a href="https://vercel.com/legal/privacy-policy" class="privacy__link" target="_blank" rel="noopener">Vercel Privacy Policy</a>.</dd>
          <dt>Render / Neon (database host)</dt>
          <dd>PostgreSQL database hosting. Stores your account reference and experiment data.
            Data centre location: Frankfurt, EU.</dd>
        </dl>
      </section>

      <section class="privacy__section">
        <h2 class="privacy__h2">7. Data Retention</h2>
        <dl class="privacy__dl">
          <dt>Active accounts</dt>
          <dd>Account and experiment data are retained for as long as your account remains active.</dd>
          <dt>Account deletion</dt>
          <dd>When you delete your account via Account Settings, all personal data associated with your account is deleted from our systems within 30 days. Anonymised, aggregated model training data (containing no personal identifiers) may be retained indefinitely.</dd>
          <dt>Local storage</dt>
          <dd>You can clear browser local storage at any time via your browser settings.</dd>
        </dl>
      </section>

      <section class="privacy__section">
        <h2 class="privacy__h2">8. Your Rights</h2>
        <p class="privacy__p">
          Depending on your jurisdiction, you may have the following rights regarding your personal data:
        </p>
        <ul class="privacy__ul">
          <li><strong>Access</strong> — request a copy of the personal data we hold about you.</li>
          <li><strong>Rectification</strong> — ask us to correct inaccurate data.</li>
          <li><strong>Erasure</strong> — request deletion of your personal data ("right to be forgotten").</li>
          <li><strong>Portability</strong> — receive your experiment data in a machine-readable format (CSV export is available directly in the app).</li>
          <li><strong>Objection</strong> — object to processing based on legitimate interests.</li>
          <li><strong>Withdraw consent</strong> — you may stop using the Service at any time; withdraw is effective from that point forward.</li>
        </ul>
        <p class="privacy__p">
          To exercise any of these rights, contact us at
          <a href="mailto:preis.tomer@gmail.com" class="privacy__link">preis.tomer@gmail.com</a>.
          We will respond within 30 days.
        </p>
      </section>

      <section class="privacy__section">
        <h2 class="privacy__h2">9. Cookies and Local Storage</h2>
        <p class="privacy__p">
          ResoPulse does not use advertising or tracking cookies. We use:
        </p>
        <ul class="privacy__ul">
          <li><strong>Authentication session cookies</strong> — set by Clerk to maintain your logged-in session. These are strictly necessary and cannot be opted out of without logging out.</li>
          <li><strong>Browser local storage</strong> — used for terms acceptance state and UI preferences. No personal data is stored in local storage.</li>
        </ul>
      </section>

      <section class="privacy__section">
        <h2 class="privacy__h2">10. Children's Privacy</h2>
        <p class="privacy__p">
          ResoPulse is a scientific research tool intended for adults. We do not knowingly collect
          personal data from children under 16. If you believe a child has provided us with personal
          data, contact us at <a href="mailto:preis.tomer@gmail.com" class="privacy__link">preis.tomer@gmail.com</a>
          and we will delete it promptly.
        </p>
      </section>

      <section class="privacy__section">
        <h2 class="privacy__h2">11. Responsible Disclosure</h2>
        <p class="privacy__p">
          If you discover a security vulnerability in ResoPulse, please report it to us privately before
          disclosing it publicly. Email a description of the issue, the steps to reproduce it, and any
          relevant context to:
          <a href="mailto:preis.tomer@gmail.com" class="privacy__link">preis.tomer@gmail.com</a>
        </p>
        <p class="privacy__p">
          We ask that you give us reasonable time to investigate and address the issue before any public
          disclosure. We will acknowledge your report within 7 days and aim to resolve confirmed
          vulnerabilities promptly. We appreciate responsible disclosure and will credit researchers
          who help keep the Service secure, if they wish to be acknowledged.
        </p>
      </section>

      <section class="privacy__section">
        <h2 class="privacy__h2">12. Changes to This Policy</h2>
        <p class="privacy__p">
          We may update this Privacy Policy as the Service evolves. When we make material changes,
          we will update the "Last Updated" date above and, where required by law, notify you by
          email. Continued use of the Service after the effective date constitutes acceptance of
          the revised policy.
        </p>
      </section>

      <div class="privacy__footer">
        <RouterLink :to="ROUTE.HOME" class="privacy__back">← Back to ResoPulse</RouterLink>
        <RouterLink :to="ROUTE.TERMS" class="privacy__terms-link">Terms</RouterLink>
        <span class="privacy__copy">© 2026 Tomer Preis. All rights reserved.</span>
      </div>

    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { ROUTE } from '@/constants/routes'

export default defineComponent({
  name: 'PrivacyView',

  computed: {
    ROUTE() { return ROUTE },
  },
})
</script>

<style lang="scss" scoped>
.privacy {
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

  &__footer {
    margin-top: 2.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  &__back,
  &__terms-link {
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

  code {
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    background: color-mix(in srgb, var(--color-primary) 8%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-primary) 20%, transparent);
    border-radius: 3px;
    padding: 0.1rem 0.35rem;
  }

  @media (max-width: 540px) {
    padding: 2rem 1rem 3rem;

    &__dl {
      grid-template-columns: 1fr;
      gap: 0.2rem;

      dt { margin-top: 0.6rem; }
    }

    &__footer {
      flex-direction: column;
      align-items: flex-start;
    }
  }
}
</style>
