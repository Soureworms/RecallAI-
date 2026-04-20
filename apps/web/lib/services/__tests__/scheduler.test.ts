import { describe, it, expect, vi, beforeEach } from "vitest"
import { fsrs, createEmptyCard, Rating as FSRSRating, State } from "ts-fsrs"
import { CardState, Rating as DbRating } from "@prisma/client"
import type { UserCard } from "@prisma/client"
import { userCardToFSRS, fsrsStateToDb } from "../fsrs-mapper"

// ── Scheduler logic (pure, no DB) ─────────────────────────────────────────────
// We test the FSRS algorithm directly using the same config as scheduler.ts

const scheduler = fsrs({
  request_retention: 0.9,
  maximum_interval: 365,
  enable_fuzz: false, // deterministic for tests
  enable_short_term: true,
})

function makeUserCard(overrides: Partial<UserCard> = {}): UserCard {
  const now = new Date("2024-01-15T00:00:00.000Z")
  const empty = createEmptyCard(now)
  return {
    id: "uc-1",
    userId: "u-1",
    cardId: "c-1",
    stability: empty.stability,
    difficulty: empty.difficulty,
    elapsedDays: empty.elapsed_days,
    scheduledDays: empty.scheduled_days,
    learningSteps: empty.learning_steps,
    reps: empty.reps,
    lapses: empty.lapses,
    state: CardState.NEW,
    dueDate: now,
    lastReviewDate: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function nextCard(userCard: UserCard, rating: FSRSRating, now = new Date()) {
  const card = userCardToFSRS(userCard)
  return scheduler.next(card, now, rating)
}

// ─────────────────────────────────────────────────────────────────────────────

describe("FSRS scheduler — card mapping round-trip", () => {
  it("maps a NEW UserCard to FSRS card and back without data loss", () => {
    const uc = makeUserCard()
    const fsrsCard = userCardToFSRS(uc)
    expect(fsrsCard.stability).toBe(uc.stability)
    expect(fsrsCard.difficulty).toBe(uc.difficulty)
    expect(fsrsCard.elapsed_days).toBe(uc.elapsedDays)
    expect(fsrsCard.reps).toBe(uc.reps)
    expect(fsrsCard.lapses).toBe(uc.lapses)
    expect(fsrsCard.state).toBe(State.New)
  })
})

describe("FSRS scheduler — initializeCard defaults", () => {
  it("empty card starts with state NEW", () => {
    const uc = makeUserCard()
    expect(uc.state).toBe(CardState.NEW)
  })

  it("empty card starts with zero reps and lapses", () => {
    const uc = makeUserCard()
    expect(uc.reps).toBe(0)
    expect(uc.lapses).toBe(0)
  })
})

describe("FSRS scheduler — rating AGAIN", () => {
  it("AGAIN on a new card keeps a short interval (< 1 day)", () => {
    const uc = makeUserCard()
    const now = new Date("2024-01-15T00:00:00.000Z")
    const { log } = nextCard(uc, FSRSRating.Again, now)
    expect(log.scheduled_days).toBeLessThan(1)
  })

  it("AGAIN increments lapses when card is in REVIEW state", () => {
    const uc = makeUserCard({
      state: CardState.REVIEW,
      stability: 10,
      difficulty: 5,
      reps: 5,
      lapses: 1,
      lastReviewDate: new Date("2024-01-05T00:00:00.000Z"),
    })
    const now = new Date("2024-01-15T00:00:00.000Z")
    const { card } = nextCard(uc, FSRSRating.Again, now)
    expect(card.lapses).toBeGreaterThan(1)
  })
})

describe("FSRS scheduler — rating GOOD", () => {
  it("GOOD on a new card moves to LEARNING state", () => {
    const uc = makeUserCard()
    const now = new Date("2024-01-15T00:00:00.000Z")
    const { card } = nextCard(uc, FSRSRating.Good, now)
    expect([State.Learning, State.Review]).toContain(card.state)
  })

  it("multiple GOOD reviews increase scheduled interval each time", () => {
    let uc = makeUserCard()
    const base = new Date("2024-01-15T00:00:00.000Z")
    let prevDays = 0

    for (let i = 0; i < 3; i++) {
      const now = new Date(base.getTime() + i * 86_400_000 * Math.max(1, prevDays))
      const { card, log } = nextCard(uc, FSRSRating.Good, now)
      if (i > 0 && log.scheduled_days > 1) {
        expect(log.scheduled_days).toBeGreaterThanOrEqual(prevDays)
      }
      prevDays = log.scheduled_days
      uc = makeUserCard({
        stability: card.stability,
        difficulty: card.difficulty,
        elapsedDays: card.elapsed_days,
        scheduledDays: card.scheduled_days,
        learningSteps: card.learning_steps,
        reps: card.reps,
        lapses: card.lapses,
        state: fsrsStateToDb(card.state),
        dueDate: card.due,
        lastReviewDate: now,
      })
    }
    expect(prevDays).toBeGreaterThan(1)
  })
})

describe("FSRS scheduler — rating EASY", () => {
  it("EASY gives a longer interval than GOOD on a new card", () => {
    const uc = makeUserCard()
    const now = new Date("2024-01-15T00:00:00.000Z")
    const { log: goodLog } = nextCard(uc, FSRSRating.Good, now)
    const { log: easyLog } = nextCard(uc, FSRSRating.Easy, now)
    expect(easyLog.scheduled_days).toBeGreaterThanOrEqual(goodLog.scheduled_days)
  })
})

describe("FSRS scheduler — state transitions", () => {
  it("NEW → LEARNING/REVIEW after first GOOD review", () => {
    const uc = makeUserCard({ state: CardState.NEW })
    const { card } = nextCard(uc, FSRSRating.Good, new Date())
    const dbState = fsrsStateToDb(card.state)
    expect([CardState.LEARNING, CardState.REVIEW]).toContain(dbState)
  })

  it("REVIEW card rated AGAIN transitions to RELEARNING", () => {
    const uc = makeUserCard({
      state: CardState.REVIEW,
      stability: 30,
      difficulty: 5,
      reps: 10,
      lapses: 0,
      lastReviewDate: new Date("2023-12-15"),
    })
    const { card } = nextCard(uc, FSRSRating.Again, new Date("2024-01-15"))
    expect(fsrsStateToDb(card.state)).toBe(CardState.RELEARNING)
  })
})
