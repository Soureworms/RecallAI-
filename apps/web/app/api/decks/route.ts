import { NextRequest, NextResponse } from "next/server"
import { requireDeckContentManager, requireRole } from "@/lib/auth/permissions"
import { prisma } from "@/lib/db"
import { withHandlerSimple } from "@/lib/api/handler"
import { createDeckSchema } from "@/lib/schemas/api"
import { deckReadWhereForRole } from "@/lib/auth/deck-scope"

async function withCardCounts<T extends { id: string }>(decks: T[]) {
  const counts = await Promise.all(
    decks.map((deck) => prisma.card.count({ where: { deckId: deck.id } }))
  )
  return decks.map((deck, index) => ({ ...deck, _count: { cards: counts[index] } }))
}

export const GET = withHandlerSimple(async () => {
  const auth = await requireRole("AGENT", { limiterKey: "api:agent", routeClass: "read" })
  if (!auth.ok) return auth.response
  const { session } = auth

  const decks = await prisma.deck.findMany({
    where: {
      orgId: session.user.orgId,
      isArchived: false,
      ...deckReadWhereForRole(session.user.role, session.user.id),
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ decks: await withCardCounts(decks) })
})

export const POST = withHandlerSimple(async (req: NextRequest) => {
  const auth = await requireRole("MANAGER", { limiterKey: "api:manager", routeClass: "write" })
  if (!auth.ok) return auth.response
  const { session } = auth
  const contentAccess = requireDeckContentManager(session)
  if (!contentAccess.ok) return contentAccess.response

  const parsed = createDeckSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }
  const { name, description, isMandatory } = parsed.data

  const deck = await prisma.deck.create({
    data: {
      name,
      description: description ?? null,
      isMandatory,
      orgId: session.user.orgId,
      createdById: session.user.id,
    },
  })

  return NextResponse.json({ ...deck, _count: { cards: 0 } }, { status: 201 })
})
