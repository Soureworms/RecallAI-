import { NextResponse } from "next/server"
import { requireDeckContentManager, requireRole } from "@/lib/auth/permissions"
import { prisma } from "@/lib/db"
import { withHandler } from "@/lib/api/handler"
import { createCardSchema } from "@/lib/schemas/api"

function notFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404 })
}

async function ownedDeck(deckId: string, orgId: string) {
  const deck = await prisma.deck.findUnique({ where: { id: deckId } })
  if (!deck || deck.orgId !== orgId || deck.isArchived) return null
  return deck
}

async function agentCanReadDeck(userId: string, deckId: string) {
  const assignment = await prisma.deckAssignment.findUnique({
    where: { userId_deckId: { userId, deckId } },
    select: { deckId: true },
  })
  return Boolean(assignment)
}

export const GET = withHandler<{ deckId: string }>(async (req, { params }) => {
  const auth = await requireRole("AGENT", { limiterKey: "api:agent", routeClass: "read" })
  if (!auth.ok) return auth.response
  const { session } = auth

  const deck = await ownedDeck(params.deckId, session.user.orgId)
  if (!deck) return notFound()

  const isAgent = session.user.role === "AGENT"
  if (isAgent && !(await agentCanReadDeck(session.user.id, params.deckId))) return notFound()

  const statusParam = req.nextUrl.searchParams.get("status")

  // Agents always see only ACTIVE cards — never drafts or archived
  const whereStatus = isAgent
    ? "ACTIVE"
    : statusParam === "DRAFT"
    ? "DRAFT"
    : statusParam === "ACTIVE"
    ? "ACTIVE"
    : undefined

  const cards = await prisma.card.findMany({
    where: {
      deckId: params.deckId,
      status: whereStatus ?? { not: "ARCHIVED" },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(cards)
})

// Shared workspace: any MANAGER in the org can add cards to any deck.
export const POST = withHandler<{ deckId: string }>(async (req, { params }) => {
  const auth = await requireRole("MANAGER", { limiterKey: "api:manager", routeClass: "write" })
  if (!auth.ok) return auth.response
  const { session } = auth
  const contentAccess = requireDeckContentManager(session)
  if (!contentAccess.ok) return contentAccess.response

  const deck = await ownedDeck(params.deckId, session.user.orgId)
  if (!deck) return notFound()

  const parsed = createCardSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }
  const { question, answer, format, tags } = parsed.data

  const card = await prisma.card.create({
    data: { deckId: params.deckId, question, answer, format, tags, status: "ACTIVE" },
  })

  return NextResponse.json(card, { status: 201 })
})
