-- Two-parameter physics-inversion calibration, per (org, cellPresetId, mode).
-- The Schwan path fits (σ_i_mult, V_th_mult); the Resonance path fits
-- (Q_mult, V_thr_res_mult). Each row carries the post-fit 2x2 covariance on
-- the multiplier scale so the frontend can propagate uncertainty into TI / Vm
-- bands via the analogous Jacobian.

-- Add new columns. All nullable / defaulted so existing rows migrate cleanly:
--   - existing rows are σ_i-only fits → param2_mult=1.0 (no V_th correction),
--     covariance entries default to 0.0 (treated as uncalibrated for the band
--     until the user re-fits with the new physics-inversion endpoint).

ALTER TABLE "cell_calibrations"
  ADD COLUMN "mode"            VARCHAR(12)      NOT NULL DEFAULT 'schwan',
  ADD COLUMN "category"        VARCHAR(12)      NOT NULL DEFAULT 'mammalian',
  ADD COLUMN "param1Mult"      DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  ADD COLUMN "param2Mult"      DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  ADD COLUMN "cov11"           DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  ADD COLUMN "cov12"           DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  ADD COLUMN "cov22"           DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  ADD COLUMN "residualStd"     DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  ADD COLUMN "param1Clamped"   BOOLEAN          NOT NULL DEFAULT FALSE,
  ADD COLUMN "param2Clamped"   BOOLEAN          NOT NULL DEFAULT FALSE,
  ADD COLUMN "param1Unident"   BOOLEAN          NOT NULL DEFAULT FALSE,
  ADD COLUMN "param2Unident"   BOOLEAN          NOT NULL DEFAULT FALSE;

-- Backfill: copy the legacy sigmaMultiplier into param1Mult so the new
-- frontend reads the same correction for already-calibrated cells. param2Mult
-- stays at the 1.0 default (no V_th info under the old contract). Covariance
-- stays at 0.0 — the UI falls back to the literature radius-based prior for
-- bands until the user re-runs the fit on the new endpoint.
UPDATE "cell_calibrations"
   SET "param1Mult" = "sigmaMultiplier"
 WHERE "param1Mult" = 1.0;

-- Switch the unique constraint to include `mode` so a cell can be calibrated
-- separately for Schwan (chartMode=schwan) and Resonance (chartMode=resonance).
DROP INDEX IF EXISTS "cell_calibrations_orgId_cellPresetId_key";
CREATE UNIQUE INDEX "cell_calibrations_orgId_cellPresetId_mode_key"
  ON "cell_calibrations"("orgId", "cellPresetId", "mode");
