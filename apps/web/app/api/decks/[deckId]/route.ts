import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/auth/permissions"
import { prisma } from "@/lib/db"
import { createEmptyCard } from "ts-fsrs"

function notFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404 })
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
  const auth = await requireRole("AGENT")
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
}

// Shared workspace: any MANAGER in the org can edit or archive any deck.
// This is intentional — deck access is org-wide, not per-creator.
export async function PUT(
  req: NextRequest,
  { params }: { params: { deckId: string } }
) {
  const auth = await requireRole("MANAGER")
  if (!auth.ok) return auth.response
  const { session } = auth

  const deck = await getOwnedDeck(params.deckId, session.user.orgId)
  if (!deck) return notFound()

  const body = (await req.json()) as {
    name?: string
    description?: string
    isMandatory?: boolean
  }

  const turningMandatory = body.isMandatory === true && !deck.isMandatory

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

  // Auto-assign to all current org members when a deck is first made mandatory
  if (turningMandatory) {
    const [orgUsers, activeCards] = await Promise.all([
      prisma.user.findMany({
        where: { orgId: session.user.orgId },
        select: { id: true },
      }),
      prisma.card.findMany({
        where: { deckId: params.deckId, status: "ACTIVE" },
        select: { id: true },
      }),
    ])

    if (orgUsers.length > 0 && activeCards.length > 0) {
      const empty = createEmptyCard(new Date())
      const now = new Date()
      await prisma.userCard.createMany({
        data: orgUsers.flatMap((u) =>
          activeCards.map((c) => ({
            userId: u.id,
            cardId: c.id,
            stability: empty.stability,
            difficulty: empty.difficulty,
            elapsedDays: empty.elapsed_days,
            scheduledDays: empty.scheduled_days,
            learningSteps: empty.learning_steps,
            reps: empty.reps,
            lapses: empty.lapses,
            state: "NEW" as const,
            dueDate: now,
          }))
        ),
        skipDuplicates: true,
      })
    }
  }

  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { deckId: string } }
) {
  const auth = await requireRole("MANAGER")
  if (!auth.ok) return auth.response
  const { session } = auth

  const deck = await getOwnedDeck(params.deckId, session.user.orgId)
  if (!deck) return notFound()

  await prisma.deck.update({
    where: { id: params.deckId },
    data: { isArchived: true },
  })

  return new NextResponse(null, { status: 204 })
}
