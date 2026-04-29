-- Analytics performance indexes
CREATE INDEX IF NOT EXISTS "Card_deckId_status_idx" ON "Card"("deckId", "status");
CREATE INDEX IF NOT EXISTS "UserCard_userId_dueDate_idx" ON "UserCard"("userId", "dueDate");
CREATE INDEX IF NOT EXISTS "UserCard_cardId_idx" ON "UserCard"("cardId");
CREATE INDEX IF NOT EXISTS "ReviewLog_userId_reviewedAt_idx" ON "ReviewLog"("userId", "reviewedAt");
CREATE INDEX IF NOT EXISTS "ReviewLog_cardId_reviewedAt_idx" ON "ReviewLog"("cardId", "reviewedAt");
CREATE INDEX IF NOT EXISTS "ReviewLog_reviewedAt_idx" ON "ReviewLog"("reviewedAt");
CREATE INDEX IF NOT EXISTS "ReviewLog_rating_idx" ON "ReviewLog"("rating");

-- Optional rollup table to precompute retention timeline points.
CREATE TABLE IF NOT EXISTS "UserDailyRetentionRollup" (
  "userId" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "retention" DOUBLE PRECISION,
  CONSTRAINT "UserDailyRetentionRollup_pkey" PRIMARY KEY ("userId", "date"),
  CONSTRAINT "UserDailyRetentionRollup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "UserDailyRetentionRollup_date_idx" ON "UserDailyRetentionRollup"("date");
