import { forgetting_curve, default_request_retention } from "ts-fsrs"
import { prisma } from "@/lib/db"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n))
}

function pct(n: number) {
  return Math.round(clamp01(n) * 100)
}

function elapsedDays(from: Date, to = new Date()) {
  return (to.getTime() - from.getTime()) / 86_400_000
}

// ts-fsrs 5.x: forgetting_curve(decayOrParams, elapsed_days, stability)
function retrievability_r(elapsedD: number, stability: number): number {
  return clamp01(forgetting_curve(default_request_retention, elapsedD, stability))
}

function retrievability(uc: { stability: number; lastReviewDate: Date | null }): number | null {
  if (!uc.lastReviewDate || uc.stability <= 0) return null
  return retrievability_r(elapsedDays(uc.lastReviewDate), uc.stability)
}

// ─── Step 14 Functions ────────────────────────────────────────────────────────

export type DeckRetentionItem = {
  deckId: string
  name: string
  avgRetention: number
  cardCount: number
}

export async function getTeamRetentionByDeck(
  teamId: string
): Promise<DeckRetentionItem[]> {
  const members = await prisma.teamMember.findMany({
    where: { teamId },
    select: { userId: true },
  })
  if (members.length === 0) return []

  const userIds = members.map((m) => m.userId)
  const userCards = await prisma.userCard.findMany({
    where: { userId: { in: userIds }, card: { status: "ACTIVE" } },
    include: { card: { include: { deck: { select: { id: true, name: true } } } } },
  })

  const byDeck = new Map<string, { name: string; scores: number[]; cardIds: Set<string> }>()

  for (const uc of userCards) {
    const { id: deckId, name } = uc.card.deck
    if (!byDeck.has(deckId)) byDeck.set(deckId, { name, scores: [], cardIds: new Set() })
    const entry = byDeck.get(deckId)!
    entry.cardIds.add(uc.cardId)
    const r = retrievability(uc)
    if (r !== null) entry.scores.push(r)
  }

  return Array.from(byDeck.entries())
    .map(([deckId, { name, scores, cardIds }]) => ({
      deckId,
      name,
      avgRetention: scores.length > 0
        ? pct(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0,
      cardCount: cardIds.size,
    }))
    .sort((a, b) => a.avgRetention - b.avgRetention)
}

export type UserScoreItem = {
  userId: string
  name: string | null
  email: string
  avgRetention: number
  completionRate: number
  reviewsThisWeek: number
  lastActiveDate: string | null
  streak: number
}

export async function getUserRetentionScores(
  teamId: string
): Promise<UserScoreItem[]> {
  const members = await prisma.teamMember.findMany({
    where: { teamId },
    include: { user: { select: { id: true, name: true, email: true } } },
  })
  if (members.length === 0) return []

  const userIds = members.map((m) => m.user.id)
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000)
  // Fetch up to 366 days of logs to cover any possible streak — bounded, single query
  const yearAgo = new Date(now.getTime() - 366 * 86_400_000)

  const [allUserCards, weeklyGroups, allLogs] = await Promise.all([
    prisma.userCard.findMany({
      where: { userId: { in: userIds }, card: { status: "ACTIVE" } },
      select: { userId: true, stability: true, lastReviewDate: true, dueDate: true },
    }),
    prisma.reviewLog.groupBy({
      by: ["userId"],
      where: { userId: { in: userIds }, reviewedAt: { gte: weekAgo } },
      _count: true,
    }),
    prisma.reviewLog.findMany({
      where: { userId: { in: userIds }, reviewedAt: { gte: yearAgo } },
      select: { userId: true, reviewedAt: true },
      orderBy: { reviewedAt: "desc" },
    }),
  ])

  const cardsByUser = new Map<string, typeof allUserCards>()
  for (const uc of allUserCards) {
    if (!cardsByUser.has(uc.userId)) cardsByUser.set(uc.userId, [])
    cardsByUser.get(uc.userId)!.push(uc)
  }

  const weekCountByUser = new Map<string, number>()
  for (const row of weeklyGroups) {
    weekCountByUser.set(row.userId, row._count)
  }

  const logsByUser = new Map<string, Date[]>()
  for (const log of allLogs) {
    if (!logsByUser.has(log.userId)) logsByUser.set(log.userId, [])
    logsByUser.get(log.userId)!.push(log.reviewedAt)
  }

  const toDay = (d: Date) => {
    const c = new Date(d)
    c.setHours(0, 0, 0, 0)
    return c.getTime()
  }
  const today = toDay(now)

  function computeStreakFromLogs(dates: Date[]): number {
    if (dates.length === 0) return 0
    const dateSet = new Set(dates.map(toDay))
    if (!dateSet.has(today) && !dateSet.has(today - 86_400_000)) return 0
    let check = dateSet.has(today) ? today : today - 86_400_000
    let streak = 0
    while (dateSet.has(check)) { streak++; check -= 86_400_000 }
    return streak
  }

  const results = members.map(({ user }) => {
    const userCards = cardsByUser.get(user.id) ?? []
    const reviewsThisWeek = weekCountByUser.get(user.id) ?? 0
    const logs = logsByUser.get(user.id) ?? []

    const scores = userCards.map(retrievability).filter((r): r is number => r !== null)
    const avgRetention = scores.length > 0
      ? pct(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0

    const dueThisWeek = userCards.filter(
      (uc) => uc.dueDate >= weekAgo && uc.dueDate <= now
    ).length

    const completionRate = dueThisWeek > 0
      ? pct(reviewsThisWeek / dueThisWeek)
      : reviewsThisWeek > 0 ? 100 : 0

    return {
      userId: user.id,
      name: user.name,
      email: user.email,
      avgRetention,
      completionRate,
      reviewsThisWeek,
      lastActiveDate: logs.length > 0 ? logs[0].toISOString() : null,
      streak: computeStreakFromLogs(logs),
    }
  })

  return results.sort((a, b) => a.avgRetention - b.avgRetention)
}

export type KnowledgeGapItem = {
  tag: string
  avgRetention: number
  affectedCards: number
  strugglingUsers: number
}

export async function getKnowledgeGaps(orgId: string): Promise<KnowledgeGapItem[]> {
  const userCards = await prisma.userCard.findMany({
    where: { card: { status: "ACTIVE", deck: { orgId, isArchived: false } } },
    select: {
      userId: true,
      cardId: true,
      stability: true,
      lastReviewDate: true,
      card: { select: { tags: true } },
    },
    take: 10_000,
  })

  type TagEntry = { scores: number[]; cards: Set<string>; users: Set<string> }
  const byTag = new Map<string, TagEntry>()

  for (const uc of userCards) {
    const r = retrievability(uc)
    if (r === null) continue
    for (const tag of uc.card.tags) {
      if (!byTag.has(tag)) byTag.set(tag, { scores: [], cards: new Set(), users: new Set() })
      const entry = byTag.get(tag)!
      entry.scores.push(r)
      entry.cards.add(uc.cardId)
      entry.users.add(uc.userId)
    }
  }

  const gaps: KnowledgeGapItem[] = []
  for (const [tag, entry] of Array.from(byTag.entries())) {
    const avg = pct(entry.scores.reduce((a, b) => a + b, 0) / entry.scores.length)
    if (avg < 80) {
      gaps.push({
        tag,
        avgRetention: avg,
        affectedCards: entry.cards.size,
        strugglingUsers: entry.users.size,
      })
    }
  }
  return gaps.sort((a, b) => a.avgRetention - b.avgRetention)
}

export type NewHireProgress = {
  userId: string
  name: string | null
  email: string
  percentage: number
  total: number
  mastered: number
}

export async function getNewHireRampProgress(userId: string): Promise<NewHireProgress | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, orgId: true, createdAt: true },
  })
  if (!user) return null

  const ninetyDaysAgo = new Date(Date.now() - 90 * 86_400_000)
  if (user.createdAt < ninetyDaysAgo) return null

  const mandatoryCards = await prisma.card.findMany({
    where: {
      status: "ACTIVE",
      deck: { orgId: user.orgId, isMandatory: true, isArchived: false },
    },
    select: { id: true },
  })
  const total = mandatoryCards.length
  if (total === 0) {
    return { userId, name: user.name, email: user.email, percentage: 100, total: 0, mastered: 0 }
  }

  const mastered = await prisma.userCard.count({
    where: {
      userId,
      cardId: { in: mandatoryCards.map((c) => c.id) },
      state: "REVIEW",
      stability: { gt: 7 },
    },
  })

  return {
    userId,
    name: user.name,
    email: user.email,
    percentage: Math.round((mastered / total) * 100),
    total,
    mastered,
  }
}

export type CardEffectivenessItem = {
  cardId: string
  question: string
  deckName: string
  againRate: number
  againCount: number
  totalReviews: number
}

export async function getCardEffectiveness(deckId: string): Promise<CardEffectivenessItem[]> {
  const cards = await prisma.card.findMany({
    where: { deckId, status: "ACTIVE" },
    include: {
      reviewLogs: { select: { rating: true } },
      deck: { select: { name: true } },
    },
  })

  return cards
    .map((c) => {
      const total = c.reviewLogs.length
      const again = c.reviewLogs.filter((r) => r.rating === "AGAIN").length
      return {
        cardId: c.id,
        question: c.question,
        deckName: c.deck.name,
        againRate: total > 0 ? Math.round((again / total) * 100) : 0,
        againCount: again,
        totalReviews: total,
      }
    })
    .filter((c) => c.totalReviews > 0)
    .sort((a, b) => b.againRate - a.againRate)
    .slice(0, 10)
}

// ─── Step 16 Individual Analytics ─────────────────────────────────────────────

export type TimelinePoint = { date: string; retention: number | null }

export async function getRetentionTimeline(
  userId: string,
  days = 30
): Promise<TimelinePoint[]> {
  const logs = await prisma.reviewLog.findMany({
    where: { userId },
    select: { cardId: true, reviewedAt: true, stability: true },
    orderBy: { reviewedAt: "asc" },
  })

  const byCard = new Map<string, Array<{ reviewedAt: Date; stability: number }>>()
  for (const log of logs) {
    if (!byCard.has(log.cardId)) byCard.set(log.cardId, [])
    byCard.get(log.cardId)!.push({ reviewedAt: log.reviewedAt, stability: log.stability })
  }

  const now = new Date()
  const timeline: TimelinePoint[] = []

  for (let i = days - 1; i >= 0; i--) {
    const dayEnd = new Date(now)
    dayEnd.setDate(dayEnd.getDate() - i)
    dayEnd.setHours(23, 59, 59, 999)

    let sum = 0
    let count = 0

    for (const cardLogs of Array.from(byCard.values())) {
      let last: { reviewedAt: Date; stability: number } | null = null
      for (const entry of cardLogs) {
        if (entry.reviewedAt <= dayEnd) last = entry
        else break
      }
      if (last && last.stability > 0) {
        sum += retrievability_r(elapsedDays(last.reviewedAt, dayEnd), last.stability)
        count++
      }
    }

    timeline.push({
      date: dayEnd.toISOString().split("T")[0],
      retention: count > 0 ? pct(sum / count) : null,
    })
  }

  return timeline
}

export type ReviewActivityPoint = { date: string; done: number }

export async function getReviewActivity(
  userId: string,
  days = 30
): Promise<ReviewActivityPoint[]> {
  const since = new Date(Date.now() - days * 86_400_000)
  const logs = await prisma.reviewLog.findMany({
    where: { userId, reviewedAt: { gte: since } },
    select: { reviewedAt: true },
  })

  const byDay = new Map<string, number>()
  for (const log of logs) {
    const day = log.reviewedAt.toISOString().split("T")[0]
    byDay.set(day, (byDay.get(day) ?? 0) + 1)
  }

  const result: ReviewActivityPoint[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000)
    const key = d.toISOString().split("T")[0]
    result.push({ date: key, done: byDay.get(key) ?? 0 })
  }
  return result
}

export type DeckProgressItem = {
  deckId: string
  deckName: string
  total: number
  mastered: number
  percentage: number
}

export async function getDeckProgress(userId: string): Promise<DeckProgressItem[]> {
  const userCards = await prisma.userCard.findMany({
    where: { userId, card: { status: "ACTIVE" } },
    select: {
      state: true,
      stability: true,
      card: { select: { deckId: true, deck: { select: { id: true, name: true } } } },
    },
  })

  const byDeck = new Map<string, { name: string; total: number; mastered: number }>()
  for (const uc of userCards) {
    const { id, name } = uc.card.deck
    if (!byDeck.has(id)) byDeck.set(id, { name, total: 0, mastered: 0 })
    const entry = byDeck.get(id)!
    entry.total++
    if (uc.state === "REVIEW" && uc.stability > 7) entry.mastered++
  }

  return Array.from(byDeck.entries()).map(([deckId, { name, total, mastered }]) => ({
    deckId,
    deckName: name,
    total,
    mastered,
    percentage: total > 0 ? Math.round((mastered / total) * 100) : 0,
  }))
}

export type WeakCard = {
  cardId: string
  question: string
  deckName: string
  againRate: number
  againCount: number
  totalReviews: number
  stability: number
}

export async function getWeakestCards(userId: string): Promise<WeakCard[]> {
  const userCards = await prisma.userCard.findMany({
    where: { userId, card: { status: "ACTIVE" } },
    select: {
      cardId: true,
      stability: true,
      card: {
        select: {
          question: true,
          deck: { select: { name: true } },
          reviewLogs: {
            where: { userId },
            select: { rating: true },
          },
        },
      },
    },
  })

  return userCards
    .map((uc) => {
      const logs = uc.card.reviewLogs
      const total = logs.length
      const again = logs.filter((r) => r.rating === "AGAIN").length
      return {
        cardId: uc.cardId,
        question: uc.card.question,
        deckName: uc.card.deck.name,
        againRate: total > 0 ? Math.round((again / total) * 100) : 0,
        againCount: again,
        totalReviews: total,
        stability: uc.stability,
      }
    })
    .filter((c) => c.totalReviews > 0)
    .sort((a, b) => b.againRate - a.againRate || a.stability - b.stability)
    .slice(0, 10)
}

export type RecentReview = {
  id: string
  question: string
  deckName: string
  rating: string
  reviewedAt: string
}

export async function getRecentReviews(
  userId: string,
  take = 50
): Promise<RecentReview[]> {
  const logs = await prisma.reviewLog.findMany({
    where: { userId },
    include: { card: { include: { deck: { select: { name: true } } } } },
    orderBy: { reviewedAt: "desc" },
    take,
  })

  return logs.map((log) => ({
    id: log.id,
    question: log.card.question,
    deckName: log.card.deck.name,
    rating: log.rating,
    reviewedAt: log.reviewedAt.toISOString(),
  }))
}

// ─── Per-file (SourceDocument) Performance ───────────────────────────────────

export type DocumentPerformanceItem = {
  documentId: string
  filename: string
  deckName: string
  totalCards: number
  avgRetention: number
  totalReviews: number
  activeUsers: number
}

export async function getDocumentPerformance(
  orgId: string
): Promise<DocumentPerformanceItem[]> {
  const docs = await prisma.sourceDocument.findMany({
    where: { orgId, status: "READY" },
    select: {
      id: true,
      filename: true,
      deck: { select: { name: true } },
      cards: {
        where: { status: "ACTIVE" },
        select: {
          id: true,
          userCards: {
            select: {
              userId: true,
              stability: true,
              lastReviewDate: true,
            },
          },
          _count: { select: { reviewLogs: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return docs
    .filter((doc) => doc.cards.length > 0)
    .map((doc) => {
      const allUserCards = doc.cards.flatMap((c) => c.userCards)
      const activeUsers = new Set(allUserCards.map((uc) => uc.userId)).size
      const totalReviews = doc.cards.reduce((sum, c) => sum + c._count.reviewLogs, 0)

      const retentions = allUserCards
        .filter((uc) => uc.lastReviewDate !== null && uc.stability > 0)
        .map((uc) => retrievability_r(elapsedDays(uc.lastReviewDate!), uc.stability))

      const avgRetention =
        retentions.length > 0
          ? pct(retentions.reduce((a, b) => a + b, 0) / retentions.length)
          : 0

      return {
        documentId: doc.id,
        filename: doc.filename,
        deckName: doc.deck?.name ?? "–",
        totalCards: doc.cards.length,
        avgRetention,
        totalReviews,
        activeUsers,
      }
    })
    .sort((a, b) => a.avgRetention - b.avgRetention)
}
