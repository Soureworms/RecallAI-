import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth/permissions"
import { prisma } from "@/lib/db"
import { withHandlerSimple } from "@/lib/api/handler"

function calculateStreak(reviewDates: Date[]): number {
  if (reviewDates.length === 0) return 0

  const toDay = (d: Date) => {
    const copy = new Date(d)
    copy.setHours(0, 0, 0, 0)
    return copy.getTime()
  }

  const today = toDay(new Date())
  const yesterday = today - 86_400_000
  const dateSet = new Set(reviewDates.map(toDay))

  if (!dateSet.has(today) && !dateSet.has(yesterday)) return 0

  let check = dateSet.has(today) ? today : yesterday
  let streak = 0
  while (dateSet.has(check)) {
    streak++
    check -= 86_400_000
  }
  return streak
}

export const GET = withHandlerSimple(async () => {
  const authResult = await requireRole("AGENT", { limiterKey: "api:agent", routeClass: "read" })
  if (!authResult.ok) return authResult.response
  const { session } = authResult

  const { id: userId, orgId } = session.user
  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)

  const deckAccess =
    session.user.role === "AGENT"
      ? { orgId, isArchived: false, assignments: { some: { userId } } }
      : { orgId, isArchived: false }

  const [dueCount, todayCount, streakLogs, nextDue] = await Promise.all([
    prisma.userCard.count({
      where: {
        userId,
        dueDate: { lte: now },
        card: { status: "ACTIVE", deck: deckAccess },
      },
    }),
    prisma.reviewLog.count({
      where: { userId, reviewedAt: { gte: todayStart } },
    }),
    prisma.reviewLog.findMany({
      where: { userId },
      select: { reviewedAt: true },
      orderBy: { reviewedAt: "desc" },
      take: 1000,
    }),
    prisma.userCard.findFirst({
      where: {
        userId,
        dueDate: { gt: now },
        card: { status: "ACTIVE", deck: deckAccess },
      },
      orderBy: { dueDate: "asc" },
      select: { dueDate: true },
    }),
  ])

  const streak = calculateStreak(streakLogs.map((l) => l.reviewedAt))

  return NextResponse.json({
    dueCount,
    todayCount,
    streak,
    nextDueDate: nextDue?.dueDate.toISOString() ?? null,
  })
})
