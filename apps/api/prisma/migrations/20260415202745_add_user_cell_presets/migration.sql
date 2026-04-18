-- CreateTable
CREATE TABLE "user_cell_presets" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "role" VARCHAR(8) NOT NULL,
    "cellType" VARCHAR(12) NOT NULL,
    "label" VARCHAR(120) NOT NULL,
    "shortLabel" VARCHAR(40) NOT NULL,
    "notes" VARCHAR(500),
    "radius" DOUBLE PRECISION NOT NULL,
    "membraneThickness" DOUBLE PRECISION NOT NULL,
    "dielectricConstant" DOUBLE PRECISION NOT NULL,
    "conductivity" DOUBLE PRECISION NOT NULL,
    "thresholdVoltage" DOUBLE PRECISION NOT NULL,
    "density" DOUBLE PRECISION NOT NULL,
    "specificHeatCapacity" DOUBLE PRECISION NOT NULL,
    "resonantFreqGHz" DOUBLE PRECISION,
    "capsidQ" DOUBLE PRECISION,
    "resonantThresholdVcm" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_cell_presets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_cell_presets_orgId_idx" ON "user_cell_presets"("orgId");

-- AddForeignKey
ALTER TABLE "user_cell_presets" ADD CONSTRAINT "user_cell_presets_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
