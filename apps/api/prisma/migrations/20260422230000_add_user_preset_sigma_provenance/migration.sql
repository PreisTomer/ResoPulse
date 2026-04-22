-- AlterTable
ALTER TABLE "user_cell_presets"
  ADD COLUMN "sigmaUncertaintyPct" DOUBLE PRECISION,
  ADD COLUMN "sigmaSource"         VARCHAR(16),
  ADD COLUMN "sigmaCitation"       VARCHAR(500);
