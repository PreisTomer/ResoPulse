-- Adds qPCR readout columns to `outcomes`. Fold-change is 2^(-ΔΔCt) for a named
-- transcript; nullable so prediction-only rows remain valid.

ALTER TABLE "outcomes"
  ADD COLUMN "measuredQpcrFoldChange" DOUBLE PRECISION,
  ADD COLUMN "measuredQpcrTarget"     VARCHAR(60);
