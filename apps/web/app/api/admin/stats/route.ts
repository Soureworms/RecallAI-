import { NextResponse } from "next/server"
import { requireSuperAdmin } from "@/lib/auth/permissions"
import { prisma } from "@/lib/db"
import { withHandlerSimple } from "@/lib/api/handler"

export const GET = withHandlerSimple(async () => {
  const auth = await requireSuperAdmin()
  if (!auth.ok) return auth.response

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const [orgs, users, decks, cards, reviews, reviewsToday, activeUsersToday] = await Promise.all([
    prisma.organization.count({ where: { NOT: { id: "system-org-001" } } }),
    prisma.user.count({ where: { NOT: { orgId: "system-org-001" } } }),
    prisma.deck.count(),
    prisma.card.count({ where: { status: "ACTIVE" } }),
    prisma.reviewLog.count(),
    prisma.reviewLog.count({ where: { reviewedAt: { gte: todayStart } } }),
    prisma.reviewLog.groupBy({
      by: ["userId"],
      where: { reviewedAt: { gte: todayStart } },
    }).then((r) => r.length),
  ])

  return NextResponse.json({ orgs, users, decks, cards, reviews, reviewsToday, activeUsersToday })
})
