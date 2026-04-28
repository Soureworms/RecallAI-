import { prisma } from "@/lib/db"
import { CardState, Rating as DbRating } from "@prisma/client"
import {
  FSRSBindingItem,
  FSRSBindingReview,
  computeParameters,
  evaluateWithTimeSeriesSplits,
  computeOptimalSteps,
} from "@open-spaced-repetition/binding"

const RATING_NUM: Record<DbRating, number> = {
  AGAIN: 1,
  HARD: 2,
  GOOD: 3,
  EASY: 4,
}

const STATE_NUM: Record<CardState, number> = {
  NEW: 0,
  LEARNING: 1,
  REVIEW: 2,
  RELEARNING: 3,
}

type LogRow = {
  cardId: string
  rating: DbRating
  reviewedAt: Date
  state: CardState
}

function buildFSRSItems(logs: LogRow[]): FSRSBindingItem[] {
  const byCard = new Map<string, LogRow[]>()
  for (const log of logs) {
    const list = byCard.get(log.cardId) ?? []
    list.push(log)
    byCard.set(log.cardId, list)
  }

  const items: FSRSBindingItem[] = []
  for (const cardLogs of Array.from(byCard.values())) {
    cardLogs.sort((a: LogRow, b: LogRow) => a.reviewedAt.getTime() - b.reviewedAt.getTime())

    const reviews = cardLogs.map((log: LogRow, i: number) => {
      const prev = i === 0 ? log.reviewedAt : cardLogs[i - 1].reviewedAt
      const deltaT = i === 0 ? 0 : Math.max(0, Math.round((log.reviewedAt.getTime() - prev.getTime()) / 86_400_000))
      return new FSRSBindingReview(RATING_NUM[log.rating], deltaT)
    })

    const item = new FSRSBindingItem(reviews)
    if (item.includeLongTermReviews()) {
      items.push(item)
    }
  }

  return items
}

function buildCsvBuffer(logs: LogRow[]): Uint8Array {
  const sorted = [...logs].sort((a, b) => a.reviewedAt.getTime() - b.reviewedAt.getTime())
  const rows = ["card_id,review_time,review_rating,review_state,review_duration"]
  for (const log of sorted) {
    rows.push(`${log.cardId},${log.reviewedAt.getTime()},${RATING_NUM[log.rating]},${STATE_NUM[log.state]},0`)
  }
  return Buffer.from(rows.join("\n"))
}

export type UserFSRSConfig = {
  w: number[]
  learningStepsSecs: number[]
  relearningStepsSecs: number[]
  logLoss: number | null
  rmseBins: number | null
  reviewCount: number
  lastOptimizedAt: Date
}

/** Run the full Rust FSRS optimizer for a user and persist results. Returns false if not enough data. */
export async function optimizeUserParameters(userId: string): Promise<boolean> {
  const logs = await prisma.reviewLog.findMany({
    where: { userId },
    select: { cardId: true, rating: true, reviewedAt: true, state: true },
    orderBy: { reviewedAt: "asc" },
  })

  if (logs.length < 10) return false

  const items = buildFSRSItems(logs)
  if (items.length < 3) return false

  const opts = { enableShortTerm: true }

  const [parameters, evaluation] = await Promise.all([
    computeParameters(items, opts),
    evaluateWithTimeSeriesSplits(items, opts),
  ])

  const stepsResult = computeOptimalSteps(buildCsvBuffer(logs), 0.9, parameters)

  await prisma.userFSRSParameters.upsert({
    where: { userId },
    create: {
      userId,
      parameters,
      logLoss: evaluation.logLoss,
      rmseBins: evaluation.rmseBins,
      reviewCount: logs.length,
      learningStepsSecs: stepsResult.recommendedLearningSteps,
      relearningStepsSecs: stepsResult.recommendedRelearningSteps,
      lastOptimizedAt: new Date(),
    },
    update: {
      parameters,
      logLoss: evaluation.logLoss,
      rmseBins: evaluation.rmseBins,
      reviewCount: logs.length,
      learningStepsSecs: stepsResult.recommendedLearningSteps,
      relearningStepsSecs: stepsResult.recommendedRelearningSteps,
      lastOptimizedAt: new Date(),
    },
  })

  return true
}

/** Fetch persisted FSRS parameters for a user, or null if none exist yet. */
export async function getUserFSRSConfig(userId: string): Promise<UserFSRSConfig | null> {
  const params = await prisma.userFSRSParameters.findUnique({ where: { userId } })
  if (!params) return null
  return {
    w: params.parameters as number[],
    learningStepsSecs: (params.learningStepsSecs as number[] | null) ?? [],
    relearningStepsSecs: (params.relearningStepsSecs as number[] | null) ?? [],
    logLoss: params.logLoss,
    rmseBins: params.rmseBins,
    reviewCount: params.reviewCount,
    lastOptimizedAt: params.lastOptimizedAt,
  }
}
