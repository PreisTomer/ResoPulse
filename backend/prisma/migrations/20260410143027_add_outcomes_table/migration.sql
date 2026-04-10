-- CreateTable
CREATE TABLE "outcomes" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionName" TEXT,
    "timestamp" TEXT,
    "freqKhz" INTEGER NOT NULL,
    "fieldVcm" INTEGER NOT NULL,
    "medium" TEXT NOT NULL,
    "targetPreset" TEXT NOT NULL,
    "waveform" TEXT NOT NULL,
    "dutyCycle" DOUBLE PRECISION NOT NULL,
    "pulseWidthNs" INTEGER NOT NULL,
    "orientationDeg" INTEGER NOT NULL,
    "lysisNPulses" INTEGER NOT NULL,
    "targetRatio" DOUBLE PRECISION NOT NULL,
    "healthyRatio" DOUBLE PRECISION NOT NULL,
    "selectivity" DOUBLE PRECISION NOT NULL,
    "targetTemp" DOUBLE PRECISION NOT NULL,
    "healthyTemp" DOUBLE PRECISION NOT NULL,
    "rating" INTEGER NOT NULL,
    "aiSuggested" BOOLEAN NOT NULL DEFAULT false,
    "targetTauNs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "healthyTauNs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "targetFcKhz" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "healthyFcKhz" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "targetRadiusUm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sigmaE" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "outcomes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "outcomes_targetPreset_idx" ON "outcomes"("targetPreset");

-- CreateIndex
CREATE INDEX "outcomes_rating_idx" ON "outcomes"("rating");

-- CreateIndex
CREATE INDEX "outcomes_targetTauNs_idx" ON "outcomes"("targetTauNs");
