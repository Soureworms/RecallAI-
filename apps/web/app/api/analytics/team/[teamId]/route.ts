import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import {
  getTeamRetentionByDeck,
  getUserRetentionScores,
  getKnowledgeGaps,
  getNewHireRampProgress,
} from "@/lib/services/analytics"

export async function GET(
  _req: NextRequest,
  { params }: { params: { teamId: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (session.user.role !== "MANAGER" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const team = await prisma.team.findUnique({ where: { id: params.teamId } })
  if (!team || team.orgId !== session.user.orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const members = await prisma.teamMember.findMany({
    where: { teamId: params.teamId },
    select: { userId: true },
  })
  const userIds = members.map((m) => m.userId)

  const [deckRetention, userScores, knowledgeGaps] = await Promise.all([
    getTeamRetentionByDeck(params.teamId),
    getUserRetentionScores(params.teamId),
    getKnowledgeGaps(session.user.orgId),
  ])

  // New hire progress for team members created in last 90 days
  const newHireProgress = (
    await Promise.all(userIds.map((id) => getNewHireRampProgress(id)))
  ).filter((p): p is NonNullable<typeof p> => p !== null)

  // Aggregate stats
  const totalActiveCards = await prisma.card.count({
    where: { status: "ACTIVE", deck: { orgId: session.user.orgId, isArchived: false } },
  })

  const avgRetention =
    userScores.length > 0
      ? Math.round(
          userScores.reduce((s, u) => s + u.avgRetention, 0) / userScores.length
        )
      : 0

  const avgCompletionRate =
    userScores.length > 0
      ? Math.round(
          userScores.reduce((s, u) => s + u.completionRate, 0) / userScores.length
        )
      : 0

  return NextResponse.json({
    teamSize: userIds.length,
    avgRetention,
    avgCompletionRate,
    totalActiveCards,
    deckRetention,
    userScores,
    knowledgeGaps,
    newHireProgress,
  })
}
