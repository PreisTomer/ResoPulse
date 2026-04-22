-- Stage C.2: append-only measured-outcome columns to `outcomes`.
-- All nullable so existing rows are untouched and the AI path degrades cleanly
-- when a row has predictions only.

ALTER TABLE "outcomes"
  ADD COLUMN "measuredAt"               TEXT,
  ADD COLUMN "measuredTargetLysisPct"   DOUBLE PRECISION,
  ADD COLUMN "measuredHealthyLysisPct"  DOUBLE PRECISION,
  ADD COLUMN "measuredViabilityPct"     DOUBLE PRECISION,
  ADD COLUMN "measuredPermeabilizedPct" DOUBLE PRECISION,
  ADD COLUMN "measuredTransfectionPct"  DOUBLE PRECISION,
  ADD COLUMN "measuredViabilityAssay"   VARCHAR(20),
  ADD COLUMN "measuredAssayTimepointH"  DOUBLE PRECISION,
  ADD COLUMN "measuredTempC"            DOUBLE PRECISION,
  ADD COLUMN "measuredFieldVcm"         DOUBLE PRECISION,
  ADD COLUMN "measuredLysisDelayMs"     INTEGER,
  ADD COLUMN "measuredNotes"            VARCHAR(500);

-- Matching key for logMeasuredOutcome: (sessionName, timestamp) uniquely
-- identifies the outcome row the bench data applies to.
CREATE INDEX "outcomes_sessionName_timestamp_idx"
  ON "outcomes" ("sessionName", "timestamp");
