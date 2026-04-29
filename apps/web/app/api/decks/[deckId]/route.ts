import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/auth/permissions"
import { prisma } from "@/lib/db"
import { withHandler } from "@/lib/api/handler"
import { updateDeckSchema } from "@/lib/schemas/api"
import { assignCardsToUsers } from "@/lib/services/user-card"

function notFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404 })
}

export const GET = withHandler<{ deckId: string }>(async (_req, { params }) => {
  const auth = await requireRole("AGENT", { limiterKey: "api:agent", routeClass: "read" })
  if (!auth.ok) return auth.response
  const { session } = auth

  const deck = await prisma.deck.findUnique({
    where: { id: params.deckId },
    include: {
      _count: { select: { cards: { where: { status: { not: "ARCHIVED" } } } } },
    },
  })

  if (!deck || deck.orgId !== session.user.orgId) return notFound()
  return NextResponse.json(deck)
})

// Shared workspace: any MANAGER in the org can edit or archive any deck.
// This is intentional — deck access is org-wide, not per-creator.
export const PUT = withHandler<{ deckId: string }>(async (req: NextRequest, { params }) => {
  const auth = await requireRole("MANAGER", { limiterKey: "api:manager", routeClass: "write" })
  if (!auth.ok) return auth.response
  const { session } = auth

  const deck = await prisma.deck.findUnique({ where: { id: params.deckId } })
  if (!deck || deck.orgId !== session.user.orgId) return notFound()

  const parsed = updateDeckSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }
  const { name, description, isMandatory, inRotation } = parsed.data

  const turningMandatory = isMandatory === true && !deck.isMandatory

  // Wrap deck update + auto-assignment in a single transaction so the deck is
  // never left in a mandatory=true state without cards assigned to users.
  const updated = await prisma.$transaction(async (tx) => {
    const updatedDeck = await tx.deck.update({
      where: { id: params.deckId },
      data: {
        name:        name        ?? deck.name,
        description: description !== undefined ? description : deck.description,
        isMandatory: isMandatory ?? deck.isMandatory,
        inRotation:  inRotation  ?? deck.inRotation,
      },
      include: {
        _count: { select: { cards: { where: { status: { not: "ARCHIVED" } } } } },
      },
    })

    if (turningMandatory) {
      const [orgUsers, activeCards] = await Promise.all([
        tx.user.findMany({ where: { orgId: session.user.orgId }, select: { id: true } }),
        tx.card.findMany({ where: { deckId: params.deckId, status: "ACTIVE" }, select: { id: true } }),
      ])
      if (orgUsers.length > 0 && activeCards.length > 0) {
        await assignCardsToUsers(
          orgUsers.map((u) => u.id),
          activeCards.map((c) => c.id)
        )
      }
    }

    return updatedDeck
  })

  return NextResponse.json(updated)
})

export const DELETE = withHandler<{ deckId: string }>(async (_req, { params }) => {
  const auth = await requireRole("MANAGER", { limiterKey: "api:manager", routeClass: "write" })
  if (!auth.ok) return auth.response
  const { session } = auth

  const deck = await prisma.deck.findUnique({ where: { id: params.deckId } })
  if (!deck || deck.orgId !== session.user.orgId) return notFound()

  await prisma.deck.update({
    where: { id: params.deckId },
    data: { isArchived: true },
  })

  return new NextResponse(null, { status: 204 })
})
