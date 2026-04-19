import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { createEmptyCard } from "ts-fsrs"

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}
function notFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404 })
}

// Returns the set of userIds already assigned to this deck
export async function GET(
  _req: NextRequest,
  { params }: { params: { deckId: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const deck = await prisma.deck.findUnique({ where: { id: params.deckId } })
  if (!deck || deck.orgId !== session.user.orgId) return notFound()

  const rows = await prisma.userCard.findMany({
    where: { card: { deckId: params.deckId, status: "ACTIVE" } },
    select: { userId: true },
    distinct: ["userId"],
  })

  return NextResponse.json({ assignedUserIds: rows.map((r) => r.userId) })
}

export async function POST(
  req: NextRequest,
  { params }: { params: { deckId: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (session.user.role !== "MANAGER" && session.user.role !== "ADMIN") {
    return forbidden()
  }

  const deck = await prisma.deck.findUnique({ where: { id: params.deckId } })
  if (!deck || deck.orgId !== session.user.orgId) return notFound()

  const body = (await req.json()) as { userIds?: string[]; teamId?: string }

  // Resolve target userIds
  let userIds: string[]
  if (body.teamId) {
    const team = await prisma.team.findUnique({
      where: { id: body.teamId },
      include: { members: { select: { userId: true } } },
    })
    if (!team || team.orgId !== session.user.orgId) return notFound()
    userIds = team.members.map((m) => m.userId)
  } else if (Array.isArray(body.userIds) && body.userIds.length > 0) {
    // Validate all users belong to the same org
    const users = await prisma.user.findMany({
      where: { id: { in: body.userIds }, orgId: session.user.orgId },
      select: { id: true },
    })
    userIds = users.map((u) => u.id)
  } else {
    return NextResponse.json(
      { error: "Provide userIds or teamId" },
      { status: 400 }
    )
  }

  if (userIds.length === 0) {
    return NextResponse.json({ created: 0 })
  }

  // Fetch all ACTIVE cards in this deck
  const cards = await prisma.card.findMany({
    where: { deckId: params.deckId, status: "ACTIVE" },
    select: { id: true },
  })

  if (cards.length === 0) {
    return NextResponse.json({ created: 0 })
  }

  const empty = createEmptyCard(new Date())
  const now = new Date()

  const data = userIds.flatMap((userId) =>
    cards.map((card) => ({
      userId,
      cardId: card.id,
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
  )

  const result = await prisma.userCard.createMany({
    data,
    skipDuplicates: true,
  })

  return NextResponse.json({ created: result.count })
}
