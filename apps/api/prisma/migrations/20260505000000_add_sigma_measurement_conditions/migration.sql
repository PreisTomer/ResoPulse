-- AlterTable: add σ_i measurement provenance columns for temperature correction and medium mismatch detection
ALTER TABLE "user_cell_presets"
  ADD COLUMN "conductivityMeasurementTempC"  DOUBLE PRECISION,
  ADD COLUMN "conductivityMeasurementSigmaE" DOUBLE PRECISION;
