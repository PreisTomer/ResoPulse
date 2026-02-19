<script setup lang="ts">
</script>

<template>
  <div class="home">
    <!-- Hero -->
    <section class="hero">
      <div class="hero-inner">
        <div class="hero-eyebrow">
          <span class="eyebrow-dot"></span>
          Frequency & Resonance Research
        </div>
        <h1 class="hero-title">
          BioResonance
          <span class="hero-title-accent">Analysis Platform</span>
        </h1>
        <p class="hero-description">
          A precision tool for scientists and bio-researchers exploring targeted resonance therapy.
          Load cellular frequency data, compare healthy and pathological signatures,
          and identify resonance parameters that disrupt harmful cells while preserving healthy tissue.
        </p>
        <div class="hero-actions">
          <button class="btn btn-primary">Load Data Set</button>
          <button class="btn btn-ghost">View Sample Analysis</button>
        </div>
      </div>
      <div class="hero-visual">
        <div class="wave-ring ring-1"></div>
        <div class="wave-ring ring-2"></div>
        <div class="wave-ring ring-3"></div>
        <div class="wave-center">◉</div>
      </div>
    </section>

    <!-- Cell Type Cards -->
    <section class="cell-section">
      <div class="section-inner">
        <h2 class="section-title">Cell Signature Profiles</h2>
        <p class="section-sub">Load JSON data sets to begin comparative frequency analysis.</p>
        <div class="cell-cards">
          <div class="cell-card cell-card--healthy">
            <div class="card-header">
              <span class="card-icon">◎</span>
              <div>
                <div class="card-label">Healthy Cell</div>
                <div class="card-sublabel">Reference Baseline</div>
              </div>
            </div>
            <div class="card-body">
              <p>Frequency and vibration signature of a healthy cell. Used as the preservation target during resonance tuning.</p>
            </div>
            <div class="card-footer">
              <button class="btn-card">Load Healthy Data</button>
            </div>
          </div>

          <div class="cell-card cell-card--cancer">
            <div class="card-header">
              <span class="card-icon">◎</span>
              <div>
                <div class="card-label">Cancer Cell</div>
                <div class="card-sublabel">Target Pathogen</div>
              </div>
            </div>
            <div class="card-body">
              <p>Frequency and vibration signature of a cancerous cell. The primary target for resonance disruption therapy.</p>
            </div>
            <div class="card-footer">
              <button class="btn-card">Load Cancer Data</button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Feature Overview -->
    <section class="features-section">
      <div class="section-inner">
        <div class="features-grid">
          <div class="feature">
            <div class="feature-icon">⬡</div>
            <div class="feature-title">Big Data Visualization</div>
            <div class="feature-desc">Render large-scale frequency JSON data sets as interactive graphs and spectral charts.</div>
          </div>
          <div class="feature">
            <div class="feature-icon">⬡</div>
            <div class="feature-title">Comparative Analysis</div>
            <div class="feature-desc">Side-by-side comparison of healthy vs. pathological cell signatures to isolate delta frequencies.</div>
          </div>
          <div class="feature">
            <div class="feature-icon">⬡</div>
            <div class="feature-title">Resonance Targeting</div>
            <div class="feature-desc">Identify precise resonance frequencies that affect target cells without impacting healthy tissue.</div>
          </div>
          <div class="feature">
            <div class="feature-icon">⬡</div>
            <div class="feature-title">Extensible Profiles</div>
            <div class="feature-desc">Support for cancer, viruses, bacteria, and other pathogen types as research expands.</div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home {
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* ── Hero ─────────────────────────────── */
.hero {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 3rem;
  max-width: 1440px;
  margin: 0 auto;
  padding: 5rem 2rem 4rem;
  width: 100%;
}

.hero-inner {
  max-width: 600px;
}

.hero-eyebrow {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: var(--color-primary);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-family: var(--font-mono);
  margin-bottom: 1.25rem;
}

.eyebrow-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: var(--color-primary);
}

.hero-title {
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 800;
  letter-spacing: -0.02em;
  margin-bottom: 1.25rem;
  display: flex;
  flex-direction: column;
  line-height: 1.15;
}

.hero-title-accent {
  color: var(--color-primary);
  font-size: 0.65em;
  font-weight: 400;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  font-family: var(--font-mono);
}

.hero-description {
  color: var(--color-text-muted);
  font-size: 1rem;
  line-height: 1.75;
  margin-bottom: 2rem;
  max-width: 540px;
}

.hero-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.btn {
  padding: 0.65rem 1.4rem;
  border-radius: var(--radius);
  font-size: 0.9rem;
  font-weight: 500;
  border: none;
  transition: all 0.15s;
}

.btn-primary {
  background-color: var(--color-primary);
  color: #080e1a;
}

.btn-primary:hover {
  filter: brightness(1.1);
}

.btn-ghost {
  background-color: transparent;
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.btn-ghost:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

/* ── Hero Visual ──────────────────────── */
.hero-visual {
  position: relative;
  width: 280px;
  height: 280px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.wave-ring {
  position: absolute;
  border-radius: 50%;
  border: 1px solid var(--color-primary);
  animation: expand 4s ease-out infinite;
}

.ring-1 { width: 80px; height: 80px; animation-delay: 0s; opacity: 0.6; }
.ring-2 { width: 160px; height: 160px; animation-delay: 1.3s; opacity: 0.35; }
.ring-3 { width: 240px; height: 240px; animation-delay: 2.6s; opacity: 0.15; }

@keyframes expand {
  0% { transform: scale(0.85); opacity: 0.6; }
  100% { transform: scale(1.1); opacity: 0; }
}

.wave-center {
  font-size: 2.5rem;
  color: var(--color-primary);
  position: relative;
  z-index: 1;
  text-shadow: 0 0 20px rgba(0, 212, 255, 0.5);
}

/* ── Cell Cards ───────────────────────── */
.cell-section {
  background-color: var(--color-surface);
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
  padding: 4rem 2rem;
}

.section-inner {
  max-width: 1440px;
  margin: 0 auto;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.section-sub {
  color: var(--color-text-muted);
  font-size: 0.9rem;
  margin-bottom: 2rem;
}

.cell-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.25rem;
}

.cell-card {
  background-color: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  transition: border-color 0.2s;
}

.cell-card--healthy {
  border-left: 3px solid var(--color-accent);
}

.cell-card--healthy:hover {
  border-color: var(--color-accent);
}

.cell-card--cancer {
  border-left: 3px solid var(--color-danger);
}

.cell-card--cancer:hover {
  border-color: var(--color-danger);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.card-icon {
  font-size: 1.8rem;
  line-height: 1;
}

.cell-card--healthy .card-icon { color: var(--color-accent); }
.cell-card--cancer .card-icon { color: var(--color-danger); }

.card-label {
  font-weight: 600;
  font-size: 1rem;
  color: var(--color-text-heading);
}

.card-sublabel {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.card-body {
  color: var(--color-text-muted);
  font-size: 0.875rem;
  line-height: 1.65;
  flex: 1;
}

.card-footer {
  padding-top: 0.5rem;
  border-top: 1px solid var(--color-border);
}

.btn-card {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text);
  padding: 0.45rem 1rem;
  border-radius: var(--radius);
  font-size: 0.8rem;
  transition: all 0.15s;
}

.cell-card--healthy .btn-card:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
  background-color: var(--color-accent-dim);
}

.cell-card--cancer .btn-card:hover {
  border-color: var(--color-danger);
  color: var(--color-danger);
  background-color: var(--color-danger-dim);
}

/* ── Features ─────────────────────────── */
.features-section {
  padding: 4rem 2rem;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.5rem;
}

.feature {
  padding: 1.5rem;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.feature-icon {
  font-size: 1.4rem;
  color: var(--color-primary);
  margin-bottom: 0.85rem;
}

.feature-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-text-heading);
  margin-bottom: 0.5rem;
}

.feature-desc {
  font-size: 0.825rem;
  color: var(--color-text-muted);
  line-height: 1.65;
}

/* ── Responsive ───────────────────────── */
@media (max-width: 768px) {
  .hero {
    grid-template-columns: 1fr;
    padding-top: 3rem;
  }

  .hero-visual {
    display: none;
  }
}
</style>
