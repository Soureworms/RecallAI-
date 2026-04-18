import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { initializeCard, getNextReview } from "@/lib/services/scheduler"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: userId, orgId } = session.user

  // ── Auto-initialize mandatory deck cards the user has never seen ─────────
  const mandatoryCards = await prisma.card.findMany({
    where: {
      status: "ACTIVE",
      deck: { orgId, isMandatory: true, isArchived: false },
    },
    select: { id: true },
  })

  if (mandatoryCards.length > 0) {
    const existing = await prisma.userCard.findMany({
      where: {
        userId,
        cardId: { in: mandatoryCards.map((c) => c.id) },
      },
      select: { cardId: true },
    })
    const existingIds = new Set(existing.map((uc) => uc.cardId))
    for (const { id: cardId } of mandatoryCards) {
      if (!existingIds.has(cardId)) {
        await initializeCard(userId, cardId)
      }
    }
  }

  // ── Fetch up to 20 due cards ──────────────────────────────────────────────
  const now = new Date()
  const userCards = await prisma.userCard.findMany({
    where: {
      userId,
      dueDate: { lte: now },
      card: { status: "ACTIVE", deck: { orgId, isArchived: false } },
    },
    include: {
      card: { include: { deck: { select: { name: true } } } },
    },
    orderBy: { dueDate: "asc" },
    take: 20,
  })

  const dueCards = userCards.map((uc) => {
    const preview = getNextReview(uc)
    return {
      userCardId: uc.id,
      cardId: uc.cardId,
      question: uc.card.question,
      answer: uc.card.answer,
      format: uc.card.format,
      deckName: uc.card.deck.name,
      preview: {
        again: {
          nextDue: preview.again.nextDue.toISOString(),
          scheduledDays: preview.again.scheduledDays,
        },
        hard: {
          nextDue: preview.hard.nextDue.toISOString(),
          scheduledDays: preview.hard.scheduledDays,
        },
        good: {
          nextDue: preview.good.nextDue.toISOString(),
          scheduledDays: preview.good.scheduledDays,
        },
        easy: {
          nextDue: preview.easy.nextDue.toISOString(),
          scheduledDays: preview.easy.scheduledDays,
        },
      },
    }
  })

  // Next due date when no cards are ready
  let nextDueDate: string | null = null
  if (dueCards.length === 0) {
    const next = await prisma.userCard.findFirst({
      where: {
        userId,
        dueDate: { gt: now },
        card: { status: "ACTIVE", deck: { orgId, isArchived: false } },
      },
      orderBy: { dueDate: "asc" },
      select: { dueDate: true },
    })
    nextDueDate = next?.dueDate.toISOString() ?? null
  }

  return NextResponse.json({ dueCards, nextDueDate })
}
