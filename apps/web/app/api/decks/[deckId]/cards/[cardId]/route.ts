import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { CardFormat } from "@prisma/client"

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}
function notFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404 })
}
function isManagerPlus(role: string) {
  return role === "MANAGER" || role === "ADMIN"
}

async function ownedCard(cardId: string, deckId: string, orgId: string) {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: { deck: true },
  })
  if (!card || card.deckId !== deckId || card.deck.orgId !== orgId) return null
  return card
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { deckId: string; cardId: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!isManagerPlus(session.user.role)) return forbidden()

  const card = await ownedCard(params.cardId, params.deckId, session.user.orgId)
  if (!card) return notFound()

  const body = (await req.json()) as {
    question?: string
    answer?: string
    format?: string
    tags?: string[]
  }

  const format = body.format
    ? (body.format as CardFormat)
    : card.format
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

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { deckId: string; cardId: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!isManagerPlus(session.user.role)) return forbidden()

  const card = await ownedCard(params.cardId, params.deckId, session.user.orgId)
  if (!card) return notFound()

  await prisma.card.update({
    where: { id: params.cardId },
    data: { status: "ARCHIVED" },
  })

  return new NextResponse(null, { status: 204 })
}
