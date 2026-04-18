import { Rating as FSRSRating, State } from "ts-fsrs"
import type { Card as FSRSCard } from "ts-fsrs"
import { CardState, Rating as DbRating } from "@prisma/client"
import type { UserCard } from "@prisma/client"

// ── State mapping ─────────────────────────────────────────────────────────────

export function dbStateToFSRS(state: CardState): State {
  switch (state) {
    case CardState.NEW:
      return State.New
    case CardState.LEARNING:
      return State.Learning
    case CardState.REVIEW:
      return State.Review
    case CardState.RELEARNING:
      return State.Relearning
  }
}

export function fsrsStateToDb(state: State): CardState {
  switch (state) {
    case State.New:
      return CardState.NEW
    case State.Learning:
      return CardState.LEARNING
    case State.Review:
      return CardState.REVIEW
    case State.Relearning:
      return CardState.RELEARNING
    default:
      return CardState.NEW
  }
}

// ── Rating mapping ────────────────────────────────────────────────────────────

export function dbRatingToFSRS(rating: DbRating): FSRSRating {
  switch (rating) {
    case DbRating.AGAIN:
      return FSRSRating.Again
    case DbRating.HARD:
      return FSRSRating.Hard
    case DbRating.GOOD:
      return FSRSRating.Good
    case DbRating.EASY:
      return FSRSRating.Easy
  }
}

// ── Card mapping ──────────────────────────────────────────────────────────────

/** Convert a stored UserCard row into a ts-fsrs Card for scheduling. */
export function userCardToFSRS(userCard: UserCard): FSRSCard {
  return {
    due: userCard.dueDate,
    stability: userCard.stability,
    difficulty: userCard.difficulty,
    elapsed_days: userCard.elapsedDays,
    scheduled_days: userCard.scheduledDays,
    learning_steps: userCard.learningSteps,
    reps: userCard.reps,
    lapses: userCard.lapses,
    state: dbStateToFSRS(userCard.state),
    last_review: userCard.lastReviewDate ?? undefined,
  }
}
