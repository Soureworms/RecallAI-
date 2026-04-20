import { NextRequest, NextResponse } from "next/server"
import { requireRole, requireOrgAccess } from "@/lib/auth/permissions"
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

  // Managers can only view users in their org
  if (!isSelf) {
    const orgCheck = await requireOrgAccess(session, params.userId)
    if (!orgCheck.ok) return orgCheck.response
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
