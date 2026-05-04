import { NextRequest, NextResponse } from "next/server"
import { requireOrgAccess, requireRole, requireTeamAccess } from "@/lib/auth/permissions"
import { prisma } from "@/lib/db"
import { withHandlerSimple } from "@/lib/api/handler"
import { deckAccessWhereForRole, deckReadWhereForRole } from "@/lib/auth/deck-scope"

function parseLimit(value: string | null) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 100
  return Math.max(1, Math.min(200, Math.floor(parsed)))
}

function parsePassed(value: string | null) {
  if (value === "true" || value === "passed") return true
  if (value === "false" || value === "failed") return false
  return undefined
}

export const GET = withHandlerSimple(async (req: NextRequest) => {
  const auth = await requireRole("MANAGER", { limiterKey: "api:manager", routeClass: "read" })
  if (!auth.ok) return auth.response
  const { session } = auth

  const { searchParams } = req.nextUrl
  const deckId = searchParams.get("deckId")
  const teamId = searchParams.get("teamId")
  const userId = searchParams.get("userId")
  const passed = parsePassed(searchParams.get("passed"))
  const take = parseLimit(searchParams.get("limit"))

  if (teamId) {
    const teamAccess = await requireTeamAccess(session, teamId)
    if (!teamAccess.ok) return teamAccess.response
  }

  if (userId) {
    const orgAccess = await requireOrgAccess(session, userId)
    if (!orgAccess.ok) return orgAccess.response

    if (session.user.role === "MANAGER") {
      const sharedTeam = await prisma.teamMember.findFirst({
        where: {
          userId,
          team: { members: { some: { userId: session.user.id } } },
        },
      })
      if (!sharedTeam) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }
  }

  if (deckId) {
    const deck = await prisma.deck.findFirst({
      where: deckAccessWhereForRole(session.user.role, session.user.id, session.user.orgId, deckId),
      select: { id: true },
    })
    if (!deck) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
  }

  const logs = await prisma.reviewLog.findMany({
    where: {
      answerScore: { not: null },
      ...(passed === undefined ? {} : { answerPassed: passed }),
      user: {
        orgId: session.user.orgId,
        ...(userId ? { id: userId } : {}),
        ...(teamId ? { teams: { some: { teamId } } } : {}),
      },
      card: {
        ...(deckId ? { deckId } : {}),
        deck: {
          orgId: session.user.orgId,
          isArchived: false,
          ...deckReadWhereForRole(session.user.role, session.user.id),
        },
      },
    },
    select: {
      id: true,
      rating: true,
      reviewedAt: true,
      typedAnswer: true,
      answerScore: true,
      answerPassed: true,
      user: { select: { id: true, name: true, email: true } },
      card: {
        select: {
          id: true,
          question: true,
          answer: true,
          deck: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { reviewedAt: "desc" },
    take,
  })

  const scored = logs.filter((log) => log.answerScore !== null)
  const passedCount = scored.filter((log) => log.answerPassed).length
  const averageAnswerScore =
    scored.length > 0
      ? Math.round(scored.reduce((sum, log) => sum + (log.answerScore ?? 0), 0) / scored.length)
      : null

  return NextResponse.json({
    summary: {
      total: logs.length,
      passed: passedCount,
      failed: scored.length - passedCount,
      averageAnswerScore,
    },
    items: logs.map((log) => ({
      id: log.id,
      rating: log.rating,
      reviewedAt: log.reviewedAt.toISOString(),
      typedAnswer: log.typedAnswer,
      answerScore: log.answerScore,
      answerPassed: log.answerPassed,
      user: log.user,
      card: {
        id: log.card.id,
        question: log.card.question,
        answer: log.card.answer,
      },
      deck: log.card.deck,
    })),
  })
})
