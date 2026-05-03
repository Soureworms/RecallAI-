import { NextResponse } from "next/server"
import { requireDeckContentManager, requireRole } from "@/lib/auth/permissions"
import { prisma } from "@/lib/db"
import { withHandler } from "@/lib/api/handler"
import { updateCardSchema } from "@/lib/schemas/api"
import { assignCardsToUsers } from "@/lib/services/user-card"

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
  await assignCardsToUsers(rows.map((r) => r.userId), [cardId])
}

// Shared workspace: any MANAGER in the org can edit, approve, or archive
// any card in any deck. Deck access is org-wide, not per-creator.
export const PUT = withHandler<{ deckId: string; cardId: string }>(async (req, { params }) => {
  const auth = await requireRole("MANAGER", { limiterKey: "api:manager", routeClass: "write" })
  if (!auth.ok) return auth.response
  const { session } = auth
  const contentAccess = requireDeckContentManager(session)
  if (!contentAccess.ok) return contentAccess.response

  const card = await ownedCard(params.cardId, params.deckId, session.user.orgId)
  if (!card) return notFound()

  const parsed = updateCardSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }
  const { question, answer, format, tags } = parsed.data

  const updated = await prisma.card.update({
    where: { id: params.cardId },
    data: {
      question: question ?? card.question,
      answer:   answer   ?? card.answer,
      format:   format   ?? card.format,
      tags:     tags     ?? card.tags,
    },
  })

  return NextResponse.json(updated)
})

// PATCH: approve a draft card (with optional inline edits)
export const PATCH = withHandler<{ deckId: string; cardId: string }>(async (req, { params }) => {
  const auth = await requireRole("MANAGER", { limiterKey: "api:manager", routeClass: "write" })
  if (!auth.ok) return auth.response
  const { session } = auth
  const contentAccess = requireDeckContentManager(session)
  if (!contentAccess.ok) return contentAccess.response

  const card = await ownedCard(params.cardId, params.deckId, session.user.orgId)
  if (!card) return notFound()
  if (card.status !== "DRAFT") {
    return NextResponse.json({ error: "Only DRAFT cards can be approved" }, { status: 400 })
  }

  const parsed = updateCardSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }
  const { question, answer, format, tags } = parsed.data

  const approved = await prisma.card.update({
    where: { id: params.cardId },
    data: {
      question: question ?? card.question,
      answer:   answer   ?? card.answer,
      format:   format   ?? card.format,
      tags:     tags     ?? card.tags,
      status: "ACTIVE",
    },
  })

  await autoAssignCard(params.cardId, params.deckId)
  return NextResponse.json(approved)
})

// DELETE: permanently delete DRAFT cards; archive ACTIVE cards
export const DELETE = withHandler<{ deckId: string; cardId: string }>(async (_req, { params }) => {
  const auth = await requireRole("MANAGER", { limiterKey: "api:manager", routeClass: "write" })
  if (!auth.ok) return auth.response
  const { session } = auth
  const contentAccess = requireDeckContentManager(session)
  if (!contentAccess.ok) return contentAccess.response

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
})
