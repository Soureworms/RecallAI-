import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

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

  // Streak must touch today or yesterday
  if (!dateSet.has(today) && !dateSet.has(yesterday)) return 0

  let check = dateSet.has(today) ? today : yesterday
  let streak = 0

  while (dateSet.has(check)) {
    streak++
    check -= 86_400_000
  }

  return streak
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: userId, orgId } = session.user
  const now = new Date()

  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)

  const [dueCount, todayCount, streakLogs, nextDue] = await Promise.all([
    prisma.userCard.count({
      where: {
        userId,
        dueDate: { lte: now },
        card: { status: "ACTIVE", deck: { orgId, isArchived: false } },
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
        card: { status: "ACTIVE", deck: { orgId, isArchived: false } },
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
}
