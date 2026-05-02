-- Preserve existing learner access after introducing DeckAssignment.
INSERT INTO "DeckAssignment" ("userId", "deckId", "assignedById", "teamId", "createdAt", "updatedAt")
SELECT DISTINCT
  uc."userId",
  c."deckId",
  NULL,
  NULL,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "UserCard" uc
JOIN "Card" c ON c."id" = uc."cardId"
LEFT JOIN "DeckAssignment" da
  ON da."userId" = uc."userId"
 AND da."deckId" = c."deckId"
WHERE da."userId" IS NULL;
