-- CreateTable
CREATE TABLE "DeckAssignment" (
    "userId" TEXT NOT NULL,
    "deckId" TEXT NOT NULL,
    "assignedById" TEXT,
    "teamId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeckAssignment_pkey" PRIMARY KEY ("userId","deckId")
);

-- CreateIndex
CREATE INDEX "DeckAssignment_deckId_idx" ON "DeckAssignment"("deckId");

-- CreateIndex
CREATE INDEX "DeckAssignment_assignedById_idx" ON "DeckAssignment"("assignedById");

-- CreateIndex
CREATE INDEX "DeckAssignment_teamId_idx" ON "DeckAssignment"("teamId");

-- AddForeignKey
ALTER TABLE "DeckAssignment" ADD CONSTRAINT "DeckAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeckAssignment" ADD CONSTRAINT "DeckAssignment_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "Deck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeckAssignment" ADD CONSTRAINT "DeckAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeckAssignment" ADD CONSTRAINT "DeckAssignment_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
