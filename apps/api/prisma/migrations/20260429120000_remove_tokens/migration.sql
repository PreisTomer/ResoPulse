-- Drop the tokenization system. The product is open source; no usage metering.

-- DropForeignKey
ALTER TABLE "token_transactions" DROP CONSTRAINT IF EXISTS "token_transactions_accountId_fkey";

-- DropForeignKey
ALTER TABLE "token_accounts" DROP CONSTRAINT IF EXISTS "token_accounts_orgId_fkey";

-- DropTable
DROP TABLE IF EXISTS "token_transactions";

-- DropTable
DROP TABLE IF EXISTS "token_accounts";
