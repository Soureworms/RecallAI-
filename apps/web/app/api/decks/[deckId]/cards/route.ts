import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/auth/permissions"
import { prisma } from "@/lib/db"
import { CardFormat } from "@prisma/client"
import { sanitizeTags } from "@/lib/security/file-validation"

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

  const isAgent = session.user.role === "AGENT"
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
}

// Shared workspace: any MANAGER in the org can add cards to any deck.
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
    tags?: unknown
  }

  const question = body.question?.trim() ?? ""
  const answer   = body.answer?.trim()   ?? ""

  if (!question || !answer) {
    return NextResponse.json(
      { error: "Question and answer are required" },
      { status: 400 },
    )
  }
  if (question.length > 500 || answer.length > 2000) {
    return NextResponse.json(
      { error: "Question must be ≤ 500 chars and answer ≤ 2000 chars." },
      { status: 400 },
    )
  }

  const format = (body.format as CardFormat | undefined) ?? CardFormat.QA
  if (!Object.values(CardFormat).includes(format)) {
    return NextResponse.json({ error: "Invalid format" }, { status: 400 })
  }

  const tags = sanitizeTags(body.tags)

  const card = await prisma.card.create({
    data: {
      deckId: params.deckId,
      question,
      answer,
      format,
      tags,
      status: "ACTIVE",
    },
  })

  return NextResponse.json(card, { status: 201 })
}
