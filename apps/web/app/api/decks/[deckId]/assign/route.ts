import { NextRequest, NextResponse } from "next/server"
import { requireDeckContentManager, requireRole } from "@/lib/auth/permissions"
import { prisma } from "@/lib/db"
import { withHandler } from "@/lib/api/handler"
import { assignSchema } from "@/lib/schemas/api"
import { assignCardsToUsers } from "@/lib/services/user-card"

function notFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404 })
}

// Shared workspace: any MANAGER in the org can view/manage assignments for any deck.
export const GET = withHandler<{ deckId: string }>(async (_req, { params }) => {
  const auth = await requireRole("MANAGER", { limiterKey: "api:manager", routeClass: "write" })
  if (!auth.ok) return auth.response
  const { session } = auth
  const contentAccess = requireDeckContentManager(session)
  if (!contentAccess.ok) return contentAccess.response

  const deck = await prisma.deck.findUnique({ where: { id: params.deckId } })
  if (!deck || deck.orgId !== session.user.orgId) return notFound()

  const rows = await prisma.deckAssignment.findMany({
    where: { deckId: params.deckId },
    select: { userId: true },
  })

  return NextResponse.json({ assignedUserIds: rows.map((r) => r.userId) })
})

export const POST = withHandler<{ deckId: string }>(async (req: NextRequest, { params }) => {
  const auth = await requireRole("MANAGER", { limiterKey: "api:manager", routeClass: "write" })
  if (!auth.ok) return auth.response
  const { session } = auth
  const contentAccess = requireDeckContentManager(session)
  if (!contentAccess.ok) return contentAccess.response

  const deck = await prisma.deck.findUnique({ where: { id: params.deckId } })
  if (!deck || deck.orgId !== session.user.orgId) return notFound()

  const parsed = assignSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  let userIds: string[]
  let teamId: string | undefined
  if ("teamId" in parsed.data) {
    const team = await prisma.team.findUnique({
      where: { id: parsed.data.teamId },
      include: { members: { select: { userId: true } } },
    })
    if (!team || team.orgId !== session.user.orgId) return notFound()
    userIds = team.members.map((m) => m.userId)
    teamId = team.id
  } else {
    const users = await prisma.user.findMany({
      where: { id: { in: parsed.data.userIds }, orgId: session.user.orgId },
      select: { id: true },
    })
    userIds = users.map((u) => u.id)
  }

  if (userIds.length === 0) return NextResponse.json({ created: 0 })

  const assignmentRows = await prisma.deckAssignment.createMany({
    data: userIds.map((userId) => ({
      userId,
      deckId: params.deckId,
      assignedById: session.user.id,
      teamId,
    })),
    skipDuplicates: true,
  })

  const cards = await prisma.card.findMany({
    where: { deckId: params.deckId, status: "ACTIVE" },
    select: { id: true },
  })

  const cardAssignments =
    cards.length === 0 ? 0 : await assignCardsToUsers(userIds, cards.map((c) => c.id))

  return NextResponse.json({ created: cardAssignments, assignmentRecordsCreated: assignmentRows.count })
})

export const DELETE = withHandler<{ deckId: string }>(async (req: NextRequest, { params }) => {
  const auth = await requireRole("MANAGER", { limiterKey: "api:manager", routeClass: "write" })
  if (!auth.ok) return auth.response
  const { session } = auth
  const contentAccess = requireDeckContentManager(session)
  if (!contentAccess.ok) return contentAccess.response

  const deck = await prisma.deck.findUnique({ where: { id: params.deckId } })
  if (!deck || deck.orgId !== session.user.orgId) return notFound()

  const parsed = assignSchema.safeParse(await req.json())
  if (!parsed.success || !("userIds" in parsed.data)) {
    return NextResponse.json({ error: "userIds is required" }, { status: 400 })
  }

  const users = await prisma.user.findMany({
    where: { id: { in: parsed.data.userIds }, orgId: session.user.orgId },
    select: { id: true },
  })
  const userIds = users.map((u) => u.id)

  if (userIds.length === 0) return NextResponse.json({ removed: 0 })

  const result = await prisma.deckAssignment.deleteMany({
    where: { deckId: params.deckId, userId: { in: userIds } },
  })

  return NextResponse.json({ removed: result.count })
})
