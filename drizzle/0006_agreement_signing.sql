-- Agreement-only signing links and a single-use token for client signatures.
--
-- Apply this file in the Supabase SQL editor for the saffhire project
-- BEFORE the app version that reads these columns is deployed.
-- Safe to run more than once.
--
-- Do not run drizzle/0001 through drizzle/0005 on Supabase. Those files are
-- the old MySQL history. The Postgres baseline is drizzle/0000_supabase_initial.sql.

DO $$ BEGIN
  CREATE TYPE "public"."intake_kind" AS ENUM ('credentialing', 'agreement_only');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."agreement_status" AS ENUM ('unsigned', 'client_signed', 'fully_executed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "signupIntakes"
  ADD COLUMN IF NOT EXISTS "kind" "intake_kind" NOT NULL DEFAULT 'credentialing';

ALTER TABLE "signupIntakes"
  ADD COLUMN IF NOT EXISTS "agreementStatus" "agreement_status" NOT NULL DEFAULT 'unsigned';

ALTER TABLE "signupIntakes"
  ADD COLUMN IF NOT EXISTS "signToken" varchar(64);

ALTER TABLE "signupIntakes"
  ADD COLUMN IF NOT EXISTS "signTokenUsedAt" timestamptz;

DO $$ BEGIN
  ALTER TABLE "signupIntakes"
    ADD CONSTRAINT "signupIntakes_signToken_unique" UNIQUE ("signToken");
EXCEPTION
  WHEN duplicate_object OR duplicate_table THEN NULL;
END $$;

-- Copy agreement progress that already lives inside conversationLog so
-- countersign links that were already emailed keep working. The token
-- inside conversationLog is not changed.
UPDATE "signupIntakes"
SET "agreementStatus" = 'fully_executed'
WHERE "agreementStatus" = 'unsigned'
  AND (
    "conversationLog" LIKE '%"status":"fully_executed"%'
    OR "conversationLog" LIKE '%"status": "fully_executed"%'
  );

UPDATE "signupIntakes"
SET "agreementStatus" = 'client_signed'
WHERE "agreementStatus" = 'unsigned'
  AND (
    "conversationLog" LIKE '%"status":"client_signed"%'
    OR "conversationLog" LIKE '%"status": "client_signed"%'
  );
