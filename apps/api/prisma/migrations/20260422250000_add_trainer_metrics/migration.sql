-- Adds the trainer_metrics table. Each row records one retrain attempt with
-- holdout RMSE/MAE per outcome (target DR, healthy DR, rating). The promotion
-- gate reads previous rows where promoted=true to pick the best MAE to beat;
-- losing fits are still persisted so the ReportsView can trend model quality.

CREATE TABLE "trainer_metrics" (
  "id"                TEXT NOT NULL,
  "modelVersion"      VARCHAR(40) NOT NULL,
  "trainedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "nSamples"          INTEGER NOT NULL,
  "holdoutSamples"    INTEGER NOT NULL,
  "rmseTargetDr"      DOUBLE PRECISION NOT NULL,
  "maeTargetDr"       DOUBLE PRECISION NOT NULL,
  "rmseHealthyDr"     DOUBLE PRECISION NOT NULL,
  "maeHealthyDr"      DOUBLE PRECISION NOT NULL,
  "rmseRating"        DOUBLE PRECISION NOT NULL,
  "maeRating"         DOUBLE PRECISION NOT NULL,
  "holdoutMaeOverall" DOUBLE PRECISION NOT NULL,
  "previousBestMae"   DOUBLE PRECISION,
  "promoted"          BOOLEAN NOT NULL DEFAULT false,

  CONSTRAINT "trainer_metrics_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "trainer_metrics_modelVersion_key" ON "trainer_metrics"("modelVersion");
CREATE INDEX        "trainer_metrics_trainedAt_idx"    ON "trainer_metrics"("trainedAt");
CREATE INDEX        "trainer_metrics_promoted_trainedAt_idx" ON "trainer_metrics"("promoted", "trainedAt");
