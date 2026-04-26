import { NextRequest, NextResponse } from "next/server"
import { requireRole, requireOrgAccess } from "@/lib/auth/permissions"
import { prisma } from "@/lib/db"
import {
  getRetentionTimeline,
  getReviewActivity,
  getDeckProgress,
  getWeakestCards,
  getRecentReviews,
  getNewHireRampProgress,
} from "@/lib/services/analytics"

export async function GET(
  _req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const authResult = await requireRole("AGENT")
  if (!authResult.ok) return authResult.response
  const { session } = authResult

  const isSelf = params.userId === session.user.id
  const isManagerPlus =
    session.user.role === "MANAGER" || session.user.role === "ADMIN"

  if (!isSelf && !isManagerPlus) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (!isSelf) {
    // Verify target user is in the same org
    const orgCheck = await requireOrgAccess(session, params.userId)
    if (!orgCheck.ok) return orgCheck.response

    // MANAGERs can only view analytics for users in their own teams.
    // ADMIN and SUPER_ADMIN can view any user in the org.
    if (session.user.role === "MANAGER") {
      const sharedTeam = await prisma.teamMember.findFirst({
        where: {
          userId: params.userId,
          team: { members: { some: { userId: session.user.id } } },
        },
      })
      if (!sharedTeam) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }
  }

  const [timeline, activity, deckProgress, weakCards, recentReviews, newHireProgress] =
    await Promise.all([
      getRetentionTimeline(params.userId),
      getReviewActivity(params.userId),
      getDeckProgress(params.userId),
      getWeakestCards(params.userId),
      getRecentReviews(params.userId),
      getNewHireRampProgress(params.userId),
    ])

  return NextResponse.json({
    timeline,
    activity,
    deckProgress,
    weakCards,
    recentReviews,
    newHireProgress,
  })
}
