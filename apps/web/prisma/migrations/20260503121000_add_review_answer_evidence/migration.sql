ALTER TABLE "ReviewLog"
  ADD COLUMN "typedAnswer" TEXT,
  ADD COLUMN "answerScore" DOUBLE PRECISION,
  ADD COLUMN "answerPassed" BOOLEAN;

CREATE INDEX "ReviewLog_answerPassed_idx" ON "ReviewLog"("answerPassed");
