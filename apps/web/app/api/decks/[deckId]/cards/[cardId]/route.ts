import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/auth/permissions"
import { prisma } from "@/lib/db"
import { CardFormat } from "@prisma/client"
import { createEmptyCard } from "ts-fsrs"

function notFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404 })
}

async function ownedCard(cardId: string, deckId: string, orgId: string) {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: { deck: true },
  })
  if (!card || card.deckId !== deckId || card.deck.orgId !== orgId) return null
  return card
}

async function autoAssignCard(cardId: string, deckId: string) {
  const rows = await prisma.userCard.findMany({
    where: { card: { deckId }, NOT: { cardId } },
    select: { userId: true },
    distinct: ["userId"],
  })
  if (rows.length === 0) return

  const empty = createEmptyCard(new Date())
  await prisma.userCard.createMany({
    data: rows.map(({ userId }) => ({
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
      dueDate: new Date(),
    })),
    skipDuplicates: true,
  })
}

// Shared workspace: any MANAGER in the org can edit, approve, or archive
// any card in any deck. Deck access is org-wide, not per-creator.
export async function PUT(
  req: NextRequest,
  { params }: { params: { deckId: string; cardId: string } }
) {
  const auth = await requireRole("MANAGER")
  if (!auth.ok) return auth.response
  const { session } = auth

  const card = await ownedCard(params.cardId, params.deckId, session.user.orgId)
  if (!card) return notFound()

  const body = (await req.json()) as {
    question?: string
    answer?: string
    format?: string
    tags?: string[]
  }

  const format = body.format ? (body.format as CardFormat) : card.format
  if (body.format && !Object.values(CardFormat).includes(format)) {
    return NextResponse.json({ error: "Invalid format" }, { status: 400 })
  }

  const updated = await prisma.card.update({
    where: { id: params.cardId },
    data: {
      question: body.question?.trim() ?? card.question,
      answer: body.answer?.trim() ?? card.answer,
      format,
      tags: body.tags ?? card.tags,
    },
  })

  return NextResponse.json(updated)
}

// PATCH: approve a draft card (with optional inline edits)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { deckId: string; cardId: string } }
) {
  const auth = await requireRole("MANAGER")
  if (!auth.ok) return auth.response
  const { session } = auth

  const card = await ownedCard(params.cardId, params.deckId, session.user.orgId)
  if (!card) return notFound()
  if (card.status !== "DRAFT") {
    return NextResponse.json({ error: "Only DRAFT cards can be approved" }, { status: 400 })
  }

  const body = (await req.json()) as {
    question?: string
    answer?: string
    format?: string
    tags?: string[]
  }

  const format = body.format ? (body.format as CardFormat) : card.format
  if (body.format && !Object.values(CardFormat).includes(format)) {
    return NextResponse.json({ error: "Invalid format" }, { status: 400 })
  }

  const approved = await prisma.card.update({
    where: { id: params.cardId },
    data: {
      question: body.question?.trim() ?? card.question,
      answer: body.answer?.trim() ?? card.answer,
      format,
      tags: body.tags ?? card.tags,
      status: "ACTIVE",
    },
  })

  await autoAssignCard(params.cardId, params.deckId)

  return NextResponse.json(approved)
}

// DELETE: permanently delete DRAFT cards; archive ACTIVE cards
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { deckId: string; cardId: string } }
) {
  const auth = await requireRole("MANAGER")
  if (!auth.ok) return auth.response
  const { session } = auth

  const card = await ownedCard(params.cardId, params.deckId, session.user.orgId)
  if (!card) return notFound()

  if (card.status === "DRAFT") {
    await prisma.card.delete({ where: { id: params.cardId } })
  } else {
    await prisma.card.update({
      where: { id: params.cardId },
      data: { status: "ARCHIVED" },
    })
  }

  return new NextResponse(null, { status: 204 })
}
