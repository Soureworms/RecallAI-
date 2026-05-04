ALTER TABLE "Organization"
  ADD COLUMN "complianceAnswerThreshold" INTEGER NOT NULL DEFAULT 70,
  ADD COLUMN "complianceCompletionThreshold" INTEGER NOT NULL DEFAULT 100;
