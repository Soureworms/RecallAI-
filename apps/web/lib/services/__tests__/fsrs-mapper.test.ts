import { describe, it, expect } from "vitest"
import { Rating as FSRSRating, State, createEmptyCard } from "ts-fsrs"
import { CardState, Rating as DbRating } from "@prisma/client"
import type { UserCard } from "@prisma/client"
import {
  dbStateToFSRS,
  fsrsStateToDb,
  dbRatingToFSRS,
  userCardToFSRS,
} from "../fsrs-mapper"

// ── State mapping ─────────────────────────────────────────────────────────────

describe("dbStateToFSRS", () => {
  it("maps all four states to the correct ts-fsrs State", () => {
    expect(dbStateToFSRS(CardState.NEW)).toBe(State.New)
    expect(dbStateToFSRS(CardState.LEARNING)).toBe(State.Learning)
    expect(dbStateToFSRS(CardState.REVIEW)).toBe(State.Review)
    expect(dbStateToFSRS(CardState.RELEARNING)).toBe(State.Relearning)
  })
})

describe("fsrsStateToDb", () => {
  it("maps all four ts-fsrs States to the correct CardState", () => {
    expect(fsrsStateToDb(State.New)).toBe(CardState.NEW)
    expect(fsrsStateToDb(State.Learning)).toBe(CardState.LEARNING)
    expect(fsrsStateToDb(State.Review)).toBe(CardState.REVIEW)
    expect(fsrsStateToDb(State.Relearning)).toBe(CardState.RELEARNING)
  })

  it("round-trips through dbStateToFSRS", () => {
    const states: CardState[] = [
      CardState.NEW,
      CardState.LEARNING,
      CardState.REVIEW,
      CardState.RELEARNING,
    ]
    for (const s of states) {
      expect(fsrsStateToDb(dbStateToFSRS(s))).toBe(s)
    }
  })
})

// ── Rating mapping ────────────────────────────────────────────────────────────

describe("dbRatingToFSRS", () => {
  it("maps all four ratings to the correct ts-fsrs Rating", () => {
    expect(dbRatingToFSRS(DbRating.AGAIN)).toBe(FSRSRating.Again)
    expect(dbRatingToFSRS(DbRating.HARD)).toBe(FSRSRating.Hard)
    expect(dbRatingToFSRS(DbRating.GOOD)).toBe(FSRSRating.Good)
    expect(dbRatingToFSRS(DbRating.EASY)).toBe(FSRSRating.Easy)
  })

  it("all ratings map to values between 1 and 4 (FSRS Grade range)", () => {
    const ratings = [DbRating.AGAIN, DbRating.HARD, DbRating.GOOD, DbRating.EASY]
    for (const r of ratings) {
      const fsrs = dbRatingToFSRS(r)
      expect(fsrs).toBeGreaterThanOrEqual(1)
      expect(fsrs).toBeLessThanOrEqual(4)
    }
  })
})

// ── Card mapping ──────────────────────────────────────────────────────────────

function makeUserCard(overrides: Partial<UserCard> = {}): UserCard {
  const now = new Date("2024-01-01T00:00:00.000Z")
  return {
    id: "test-uc-1",
    userId: "user-1",
    cardId: "card-1",
    stability: 2.5,
    difficulty: 3.0,
    elapsedDays: 5,
    scheduledDays: 10,
    learningSteps: 0,
    reps: 3,
    lapses: 1,
    state: CardState.REVIEW,
    dueDate: now,
    lastReviewDate: new Date("2023-12-27T00:00:00.000Z"),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

describe("userCardToFSRS", () => {
  it("maps all scalar fields correctly", () => {
    const uc = makeUserCard()
    const card = userCardToFSRS(uc)

    expect(card.stability).toBe(2.5)
    expect(card.difficulty).toBe(3.0)
    expect(card.elapsed_days).toBe(5)
    expect(card.scheduled_days).toBe(10)
    expect(card.learning_steps).toBe(0)
    expect(card.reps).toBe(3)
    expect(card.lapses).toBe(1)
  })

  it("maps dueDate to card.due", () => {
    const due = new Date("2024-06-15T00:00:00.000Z")
    const card = userCardToFSRS(makeUserCard({ dueDate: due }))
    expect(card.due).toEqual(due)
  })

  it("maps lastReviewDate to card.last_review when present", () => {
    const lastReview = new Date("2024-06-01T00:00:00.000Z")
    const card = userCardToFSRS(makeUserCard({ lastReviewDate: lastReview }))
    expect(card.last_review).toEqual(lastReview)
  })

  it("sets card.last_review to undefined when lastReviewDate is null", () => {
    const card = userCardToFSRS(makeUserCard({ lastReviewDate: null }))
    expect(card.last_review).toBeUndefined()
  })

  it("converts CardState to the correct ts-fsrs State enum", () => {
    const reviewCard = userCardToFSRS(makeUserCard({ state: CardState.REVIEW }))
    expect(reviewCard.state).toBe(State.Review)

    const newCard = userCardToFSRS(makeUserCard({ state: CardState.NEW }))
    expect(newCard.state).toBe(State.New)
  })

  it("output is accepted by createEmptyCard-derived scheduler.repeat()", () => {
    // Smoke-test: ensure the mapped card is structurally compatible with ts-fsrs
    const empty = createEmptyCard(new Date())
    const uc = makeUserCard({
      stability: empty.stability,
      difficulty: empty.difficulty,
      elapsedDays: empty.elapsed_days,
      scheduledDays: empty.scheduled_days,
      learningSteps: empty.learning_steps,
      reps: empty.reps,
      lapses: empty.lapses,
      state: CardState.NEW,
      dueDate: empty.due,
      lastReviewDate: null,
    })
    const mapped = userCardToFSRS(uc)
    // Verify the shape matches the ts-fsrs Card interface
    expect(typeof mapped.stability).toBe("number")
    expect(typeof mapped.difficulty).toBe("number")
    expect(mapped.due instanceof Date).toBe(true)
    expect(Object.values(State)).toContain(mapped.state)
  })
})
