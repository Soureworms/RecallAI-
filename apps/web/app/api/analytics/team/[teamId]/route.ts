import { NextRequest, NextResponse } from "next/server"
import { requireRole, requireTeamAccess } from "@/lib/auth/permissions"
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
  const authResult = await requireRole("MANAGER")
  if (!authResult.ok) return authResult.response
  const { session } = authResult

  // Managers can only access teams they belong to; admins can access all org teams
  const teamAccess = await requireTeamAccess(session, params.teamId)
  if (!teamAccess.ok) return teamAccess.response

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

  const newHireProgress = (
    await Promise.all(userIds.map((id) => getNewHireRampProgress(id)))
  ).filter((p): p is NonNullable<typeof p> => p !== null)

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
