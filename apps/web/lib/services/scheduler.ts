import { fsrs, createEmptyCard, Rating as FSRSRating } from "ts-fsrs"
import type { Grade, IPreview, RecordLogItem } from "ts-fsrs"
import { Rating as DbRating } from "@prisma/client"
import type { UserCard } from "@prisma/client"
import { prisma } from "@/lib/db"
import {
  dbRatingToFSRS,
  fsrsStateToDb,
  userCardToFSRS,
} from "./fsrs-mapper"

// ── Singleton scheduler ───────────────────────────────────────────────────────

const scheduler = fsrs({
  request_retention: 0.9,
  maximum_interval: 365,
  enable_fuzz: true,
  enable_short_term: true,
})

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Create a UserCard record for a user/card pair using FSRS empty-card defaults.
 * Sets dueDate to now so the card appears immediately in the first session.
 */
export async function initializeCard(
  userId: string,
  cardId: string
): Promise<UserCard> {
  const empty = createEmptyCard(new Date())

  return prisma.userCard.create({
    data: {
      userId,
      cardId,
      stability: empty.stability,
      difficulty: empty.difficulty,
      elapsedDays: empty.elapsed_days,
      scheduledDays: empty.scheduled_days,
      learningSteps: empty.learning_steps,
      reps: empty.reps,
      lapses: empty.lapses,
      state: "NEW",
      dueDate: new Date(),
    },
  })
}

/**
 * Preview what the next due date would be for every rating (Again/Hard/Good/Easy)
 * without persisting anything.
 */
export function getNextReview(userCard: UserCard): ReviewPreview {
  const card = userCardToFSRS(userCard)
  const record: IPreview = scheduler.repeat(card, new Date())

  return {
    again: buildPreviewItem(record[FSRSRating.Again]),
    hard: buildPreviewItem(record[FSRSRating.Hard]),
    good: buildPreviewItem(record[FSRSRating.Good]),
    easy: buildPreviewItem(record[FSRSRating.Easy]),
  }
}

/**
 * Record a completed review:
 * - Applies the rating via ts-fsrs
 * - Persists updated scheduling fields on UserCard
 * - Appends a ReviewLog row
 * Returns the updated UserCard.
 */
export async function submitReview(
  userId: string,
  cardId: string,
  rating: DbRating
): Promise<UserCard> {
  const userCard = await prisma.userCard.findUniqueOrThrow({
    where: { userId_cardId: { userId, cardId } },
  })

  const fsrsCard = userCardToFSRS(userCard)
  const fsrsRating = dbRatingToFSRS(rating) as Grade
  const now = new Date()

  const result: RecordLogItem = scheduler.next(fsrsCard, now, fsrsRating)
  const { card: next, log } = result

  const [updated] = await prisma.$transaction([
    prisma.userCard.update({
      where: { userId_cardId: { userId, cardId } },
      data: {
        stability: next.stability,
        difficulty: next.difficulty,
        elapsedDays: next.elapsed_days,
        scheduledDays: next.scheduled_days,
        learningSteps: next.learning_steps,
        reps: next.reps,
        lapses: next.lapses,
        state: fsrsStateToDb(next.state),
        dueDate: next.due,
        lastReviewDate: now,
      },
    }),
    prisma.reviewLog.create({
      data: {
        userId,
        cardId,
        rating,
        reviewedAt: now,
        scheduledInterval: log.scheduled_days,
        elapsedDays: log.elapsed_days,
        stability: next.stability,
        difficulty: next.difficulty,
        state: fsrsStateToDb(next.state),
      },
    }),
  ])

  return updated
}

// ── Internal helpers ──────────────────────────────────────────────────────────

export type ReviewPreviewItem = {
  nextDue: Date
  scheduledDays: number
}

export type ReviewPreview = {
  again: ReviewPreviewItem
  hard: ReviewPreviewItem
  good: ReviewPreviewItem
  easy: ReviewPreviewItem
}

function buildPreviewItem(item: RecordLogItem): ReviewPreviewItem {
  return {
    nextDue: item.card.due,
    scheduledDays: item.log.scheduled_days,
  }
}
