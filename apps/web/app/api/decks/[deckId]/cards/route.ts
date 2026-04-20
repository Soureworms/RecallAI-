import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/auth/permissions"
import { prisma } from "@/lib/db"
import { CardFormat } from "@prisma/client"

function notFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404 })
}

async function ownedDeck(deckId: string, orgId: string) {
  const deck = await prisma.deck.findUnique({ where: { id: deckId } })
  if (!deck || deck.orgId !== orgId || deck.isArchived) return null
  return deck
}

export async function GET(
  req: NextRequest,
  { params }: { params: { deckId: string } }
) {
  const auth = await requireRole("AGENT")
  if (!auth.ok) return auth.response
  const { session } = auth

  const deck = await ownedDeck(params.deckId, session.user.orgId)
  if (!deck) return notFound()

  const statusParam = req.nextUrl.searchParams.get("status")
  const whereStatus = statusParam === "DRAFT"
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
}

export async function POST(
  req: NextRequest,
  { params }: { params: { deckId: string } }
) {
  const auth = await requireRole("MANAGER")
  if (!auth.ok) return auth.response
  const { session } = auth

  const deck = await ownedDeck(params.deckId, session.user.orgId)
  if (!deck) return notFound()

  const body = (await req.json()) as {
    question?: string
    answer?: string
    format?: string
    tags?: string[]
  }

  if (!body.question?.trim() || !body.answer?.trim()) {
    return NextResponse.json(
      { error: "Question and answer are required" },
      { status: 400 }
    )
  }

  const format = (body.format as CardFormat | undefined) ?? CardFormat.QA
  if (!Object.values(CardFormat).includes(format)) {
    return NextResponse.json({ error: "Invalid format" }, { status: 400 })
  }

  const card = await prisma.card.create({
    data: {
      deckId: params.deckId,
      question: body.question.trim(),
      answer: body.answer.trim(),
      format,
      tags: body.tags ?? [],
      status: "ACTIVE",
    },
  })

  return NextResponse.json(card, { status: 201 })
}
