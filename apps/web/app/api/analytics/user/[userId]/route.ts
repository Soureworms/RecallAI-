import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
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
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const isSelf = params.userId === session.user.id
  const isManager =
    session.user.role === "MANAGER" || session.user.role === "ADMIN"

  if (!isSelf && !isManager) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Managers can only view users in their org
  if (!isSelf) {
    const target = await prisma.user.findUnique({ where: { id: params.userId } })
    if (!target || target.orgId !== session.user.orgId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
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
