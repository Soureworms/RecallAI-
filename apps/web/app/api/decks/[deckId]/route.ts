import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}
function notFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404 })
}
function isManagerPlus(role: string) {
  return role === "MANAGER" || role === "ADMIN"
}

async function getOwnedDeck(deckId: string, orgId: string) {
  const deck = await prisma.deck.findUnique({ where: { id: deckId } })
  if (!deck || deck.orgId !== orgId) return null
  return deck
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { deckId: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const deck = await prisma.deck.findUnique({
    where: { id: params.deckId },
    include: {
      _count: { select: { cards: { where: { status: { not: "ARCHIVED" } } } } },
    },
  })

  if (!deck || deck.orgId !== session.user.orgId) return notFound()

  return NextResponse.json(deck)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { deckId: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!isManagerPlus(session.user.role)) return forbidden()

  const deck = await getOwnedDeck(params.deckId, session.user.orgId)
  if (!deck) return notFound()

  const body = (await req.json()) as {
    name?: string
    description?: string
    isMandatory?: boolean
  }

  const updated = await prisma.deck.update({
    where: { id: params.deckId },
    data: {
      name: body.name?.trim() ?? deck.name,
      description: body.description !== undefined ? body.description.trim() : deck.description,
      isMandatory: body.isMandatory ?? deck.isMandatory,
    },
    include: {
      _count: { select: { cards: { where: { status: { not: "ARCHIVED" } } } } },
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { deckId: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!isManagerPlus(session.user.role)) return forbidden()

  const deck = await getOwnedDeck(params.deckId, session.user.orgId)
  if (!deck) return notFound()

  await prisma.deck.update({
    where: { id: params.deckId },
    data: { isArchived: true },
  })

  return new NextResponse(null, { status: 204 })
}
