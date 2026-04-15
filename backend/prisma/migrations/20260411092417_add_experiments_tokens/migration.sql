-- CreateTable
CREATE TABLE "experiment_sessions" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "description" VARCHAR(500),
    "snapshot" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "parentId" TEXT,
    "shareToken" VARCHAR(64),
    "shareMode" VARCHAR(8),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "experiment_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "token_accounts" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "monthlyQuota" INTEGER NOT NULL DEFAULT 200,
    "balance" INTEGER NOT NULL DEFAULT 200,
    "resetAt" TIMESTAMP(3) NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "token_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "token_transactions" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" VARCHAR(80) NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "token_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "experiment_sessions_shareToken_key" ON "experiment_sessions"("shareToken");

-- CreateIndex
CREATE INDEX "experiment_sessions_orgId_deletedAt_idx" ON "experiment_sessions"("orgId", "deletedAt");

-- CreateIndex
CREATE INDEX "experiment_sessions_shareToken_idx" ON "experiment_sessions"("shareToken");

-- CreateIndex
CREATE INDEX "experiment_sessions_orgId_updatedAt_idx" ON "experiment_sessions"("orgId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "token_accounts_orgId_key" ON "token_accounts"("orgId");

-- CreateIndex
CREATE INDEX "token_transactions_accountId_createdAt_idx" ON "token_transactions"("accountId", "createdAt");

-- AddForeignKey
ALTER TABLE "experiment_sessions" ADD CONSTRAINT "experiment_sessions_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experiment_sessions" ADD CONSTRAINT "experiment_sessions_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "experiment_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_accounts" ADD CONSTRAINT "token_accounts_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_transactions" ADD CONSTRAINT "token_transactions_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "token_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
