-- Per-lab scalar sigma_i correction per cell preset. Fitted server-side from
-- measured outcome rows; applied at simulation time as sigma_i_corrected =
-- sigma_i_base * sigmaMultiplier. One active row per (orgId, cellPresetId).

-- CreateTable
CREATE TABLE "cell_calibrations" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "cellPresetId" TEXT NOT NULL,
    "sigmaMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "uncertaintyStd" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "nSamples" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cell_calibrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cell_calibrations_orgId_cellPresetId_key" ON "cell_calibrations"("orgId", "cellPresetId");

-- CreateIndex
CREATE INDEX "cell_calibrations_orgId_idx" ON "cell_calibrations"("orgId");

-- AddForeignKey
ALTER TABLE "cell_calibrations" ADD CONSTRAINT "cell_calibrations_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Per-lab scoping on outcomes: calibration fits must run against rows from one
-- org only. Historical rows stay null (they predate org-scoped logging) and
-- are simply excluded from calibration queries via WHERE "orgId" IS NOT NULL.

-- AlterTable
ALTER TABLE "outcomes" ADD COLUMN "orgId" TEXT;

-- CreateIndex
CREATE INDEX "outcomes_orgId_targetPreset_idx" ON "outcomes"("orgId", "targetPreset");
