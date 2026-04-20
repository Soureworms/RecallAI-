import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/auth/permissions"
import { prisma } from "@/lib/db"
import { generateCardsFromText } from "@/lib/services/card-generator"

export async function POST(
  req: NextRequest,
  { params }: { params: { deckId: string } }
) {
  const auth = await requireRole("MANAGER")
  if (!auth.ok) return auth.response
  const { session } = auth

  const deck = await prisma.deck.findUnique({ where: { id: params.deckId } })
  if (!deck || deck.orgId !== session.user.orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const body = (await req.json()) as { sourceDocumentId?: string }
  if (!body.sourceDocumentId) {
    return NextResponse.json({ error: "sourceDocumentId is required" }, { status: 400 })
  }

  const doc = await prisma.sourceDocument.findUnique({
    where: { id: body.sourceDocumentId },
  })
  if (!doc || doc.orgId !== session.user.orgId || doc.status !== "READY") {
    return NextResponse.json(
      { error: "Document not found or not ready for generation" },
      { status: 404 }
    )
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "AI generation is not configured. Set ANTHROPIC_API_KEY in your environment." },
      { status: 503 }
    )
  }

  let rawCards
  try {
    rawCards = await generateCardsFromText(doc.textContent)
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Generation failed"
    return NextResponse.json({ error: msg }, { status: 502 })
  }

  if (rawCards.length === 0) {
    return NextResponse.json({
      cards: [],
      message: "No cards could be generated from this document",
    })
  }

  const cards = await prisma.$transaction(
    rawCards.map((c) =>
      prisma.card.create({
        data: {
          deckId: params.deckId,
          question: c.question,
          answer: c.answer,
          format: c.format,
          tags: c.tags,
          difficulty: c.difficulty,
          status: "DRAFT",
          sourceDocumentId: doc.id,
        },
      })
    )
  )

  return NextResponse.json({ cards, count: cards.length })
}
