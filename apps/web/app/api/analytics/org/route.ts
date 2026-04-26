import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth/permissions"
import { prisma } from "@/lib/db"
import { getKnowledgeGaps } from "@/lib/services/analytics"
import { forgetting_curve, default_request_retention } from "ts-fsrs"

function retrievability(stability: number, lastReviewDate: Date): number {
  const elapsed = (Date.now() - lastReviewDate.getTime()) / 86_400_000
  return Math.max(0, Math.min(1, forgetting_curve(default_request_retention, elapsed, stability)))
}

export async function GET() {
  const authResult = await requireRole("MANAGER")
  if (!authResult.ok) return authResult.response
  const { session } = authResult

  const orgId = session.user.orgId
  const weekAgo = new Date(Date.now() - 7 * 86_400_000)

  const [totalUsers, activeThisWeek, totalDecks, totalCards, userCards, knowledgeGaps] =
    await Promise.all([
      prisma.user.count({ where: { orgId } }),
      prisma.reviewLog.groupBy({
        by: ["userId"],
        where: { user: { orgId }, reviewedAt: { gte: weekAgo } },
      }).then((rows) => rows.length),
      prisma.deck.count({ where: { orgId, isArchived: false } }),
      prisma.card.count({ where: { status: "ACTIVE", deck: { orgId, isArchived: false } } }),
      prisma.userCard.findMany({
        where: { card: { status: "ACTIVE", deck: { orgId, isArchived: false } }, stability: { gt: 0 }, lastReviewDate: { not: null } },
        select: { stability: true, lastReviewDate: true },
        take: 5000,
      }),
      getKnowledgeGaps(orgId),
    ])

  const retentionScores = userCards
    .filter((uc): uc is typeof uc & { lastReviewDate: Date } => uc.lastReviewDate !== null)
    .map((uc) => retrievability(uc.stability, uc.lastReviewDate))

  const avgRetention =
    retentionScores.length > 0
      ? Math.round((retentionScores.reduce((a, b) => a + b, 0) / retentionScores.length) * 100)
      : 0

  // Reviews per day for the last 14 days
  const twoWeeksAgo = new Date(Date.now() - 14 * 86_400_000)
  const recentLogs = await prisma.reviewLog.findMany({
    where: { user: { orgId }, reviewedAt: { gte: twoWeeksAgo } },
    select: { reviewedAt: true },
  })
  const byDay = new Map<string, number>()
  for (const log of recentLogs) {
    const key = log.reviewedAt.toISOString().split("T")[0]
    byDay.set(key, (byDay.get(key) ?? 0) + 1)
  }
  const reviewActivity = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(Date.now() - (13 - i) * 86_400_000)
    const key = d.toISOString().split("T")[0]
    return { date: key, count: byDay.get(key) ?? 0 }
  })

  return NextResponse.json({
    totalUsers,
    activeThisWeek,
    totalDecks,
    totalCards,
    avgRetention,
    reviewActivity,
    knowledgeGaps: knowledgeGaps.slice(0, 5),
  })
}
