import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth/permissions"
import { prisma } from "@/lib/db"
import { getNextReview } from "@/lib/services/scheduler"
import { assignCardsToUsers } from "@/lib/services/user-card"
import { getUserFSRSConfig } from "@/lib/services/fsrs-optimizer"
import { withHandlerSimple } from "@/lib/api/handler"

export const GET = withHandlerSimple(async () => {
  const authResult = await requireRole("AGENT", { limiterKey: "api:agent", routeClass: "read" })
  if (!authResult.ok) return authResult.response
  const { session } = authResult

  const { id: userId, orgId } = session.user

  const [org, fsrsConfig, assignedDecks] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: orgId },
      select: { studyMode: true },
    }),
    getUserFSRSConfig(userId),
    prisma.deckAssignment.findMany({
      where: { userId, deck: { orgId, isArchived: false } },
      select: { deckId: true },
    }),
  ])
  const studyMode = org?.studyMode ?? "AUTO_ROTATE"

  const assignedDeckIds = assignedDecks.map((d) => d.deckId)
  if (assignedDeckIds.length === 0) {
    return NextResponse.json({ dueCards: [], nextDueDate: null })
  }

  const deckFilter =
    studyMode === "AUTO_ROTATE"
      ? { id: { in: assignedDeckIds }, orgId, isArchived: false }
      : { id: { in: assignedDeckIds }, orgId, isArchived: false, OR: [{ isMandatory: true }, { inRotation: true }] }

  const eligibleCards = await prisma.card.findMany({
    where: { status: "ACTIVE", deck: deckFilter },
    select: { id: true },
  })

  if (eligibleCards.length > 0) {
    const cardIds = eligibleCards.map((c) => c.id)
    await assignCardsToUsers([userId], cardIds)
  }

  const now = new Date()
  const userCards = await prisma.userCard.findMany({
    where: {
      userId,
      dueDate: { lte: now },
      card: { status: "ACTIVE", deck: deckFilter },
    },
    include: {
      card: { include: { deck: { select: { name: true } } } },
    },
    orderBy: { dueDate: "asc" },
    take: 20,
  })

  const schedulerConfig = fsrsConfig
    ? { w: fsrsConfig.w, learningStepsSecs: fsrsConfig.learningStepsSecs, relearningStepsSecs: fsrsConfig.relearningStepsSecs }
    : undefined

  const dueCards = userCards.map((uc) => {
    const preview = getNextReview(uc, schedulerConfig)
    return {
      userCardId: uc.id,
      cardId: uc.cardId,
      question: uc.card.question,
      answer: uc.card.answer,
      format: uc.card.format,
      tags: uc.card.tags,
      deckName: uc.card.deck.name,
      isNew: uc.reps === 0,
      preview: {
        again: { nextDue: preview.again.nextDue.toISOString(), scheduledDays: preview.again.scheduledDays },
        hard: { nextDue: preview.hard.nextDue.toISOString(), scheduledDays: preview.hard.scheduledDays },
        good: { nextDue: preview.good.nextDue.toISOString(), scheduledDays: preview.good.scheduledDays },
        easy: { nextDue: preview.easy.nextDue.toISOString(), scheduledDays: preview.easy.scheduledDays },
      },
    }
  })

  let nextDueDate: string | null = null
  if (dueCards.length === 0) {
    const next = await prisma.userCard.findFirst({
      where: {
        userId,
        dueDate: { gt: now },
        card: { status: "ACTIVE", deck: deckFilter },
      },
      orderBy: { dueDate: "asc" },
      select: { dueDate: true },
    })
    nextDueDate = next?.dueDate.toISOString() ?? null
  }

  return NextResponse.json({ dueCards, nextDueDate })
})
