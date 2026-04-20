import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/auth/permissions"
import { prisma } from "@/lib/db"
import { createEmptyCard } from "ts-fsrs"

export async function POST(
  req: NextRequest,
  { params }: { params: { deckId: string } }
) {
  const auth = await requireRole("MANAGER")
  if (!auth.ok) return auth.response
  const { session } = auth

  const deck = await prisma.deck.findUnique({ where: { id: params.deckId } })
  if (!deck || deck.orgId !== session.user.orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const body = (await req.json()) as { cardIds?: string[]; approveAll?: boolean }

  let cardIds: string[]
  if (body.approveAll) {
    const drafts = await prisma.card.findMany({
      where: { deckId: params.deckId, status: "DRAFT" },
      select: { id: true },
    })
    cardIds = drafts.map((c) => c.id)
  } else if (Array.isArray(body.cardIds) && body.cardIds.length > 0) {
    // Verify all belong to this deck
    const found = await prisma.card.findMany({
      where: { id: { in: body.cardIds }, deckId: params.deckId, status: "DRAFT" },
      select: { id: true },
    })
    cardIds = found.map((c) => c.id)
  } else {
    return NextResponse.json(
      { error: "Provide cardIds or approveAll: true" },
      { status: 400 }
    )
  }

  if (cardIds.length === 0) {
    return NextResponse.json({ approved: 0 })
  }

  // Activate all cards
  await prisma.card.updateMany({
    where: { id: { in: cardIds } },
    data: { status: "ACTIVE" },
  })

  // Auto-assign to users already assigned to this deck
  const assignedUsers = await prisma.userCard.findMany({
    where: {
      card: { deckId: params.deckId },
      cardId: { notIn: cardIds },
    },
    select: { userId: true },
    distinct: ["userId"],
  })

  if (assignedUsers.length > 0) {
    const empty = createEmptyCard(new Date())
    const now = new Date()
    await prisma.userCard.createMany({
      data: assignedUsers.flatMap(({ userId }) =>
        cardIds.map((cardId) => ({
          userId,
          cardId,
          stability: empty.stability,
          difficulty: empty.difficulty,
          elapsedDays: empty.elapsed_days,
          scheduledDays: empty.scheduled_days,
          learningSteps: empty.learning_steps,
          reps: empty.reps,
          lapses: empty.lapses,
          state: "NEW" as const,
          dueDate: now,
        }))
      ),
      skipDuplicates: true,
    })
  }

  return NextResponse.json({ approved: cardIds.length })
}
