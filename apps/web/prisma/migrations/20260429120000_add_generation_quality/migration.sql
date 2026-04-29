-- Store per-run card generation quality summary for analytics/prompt tuning
ALTER TABLE "SourceDocument"
ADD COLUMN "generationQuality" JSONB;
