import { beforeEach, describe, expect, it, vi } from "vitest"
import { CardState, Rating } from "@prisma/client"
import type { UserCard } from "@prisma/client"

const mockPrisma = {
  userCard: {
    findUniqueOrThrow: vi.fn(),
    update: vi.fn(),
  },
  reviewLog: {
    create: vi.fn(),
  },
  $transaction: vi.fn(),
}
vi.mock("@/lib/db", () => ({ prisma: mockPrisma }))

function makeUserCard(overrides: Partial<UserCard> = {}): UserCard {
  const now = new Date("2024-01-15T00:00:00.000Z")
  return {
    id: "uc-1",
    userId: "user-1",
    cardId: "card-1",
    stability: 0,
    difficulty: 0,
    elapsedDays: 0,
    scheduledDays: 0,
    learningSteps: 0,
    reps: 0,
    lapses: 0,
    state: CardState.NEW,
    dueDate: now,
    lastReviewDate: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockPrisma.userCard.findUniqueOrThrow.mockResolvedValue(makeUserCard())
  mockPrisma.userCard.update.mockResolvedValue(makeUserCard({ reps: 1 }))
  mockPrisma.reviewLog.create.mockResolvedValue({ id: "log-1" })
  mockPrisma.$transaction.mockImplementation((operations: Promise<unknown>[]) => Promise.all(operations))
})

describe("submitReview", () => {
  it("persists typed answer assessment fields on ReviewLog", async () => {
    const { submitReview } = await import("../scheduler")

    await submitReview("user-1", "card-1", Rating.GOOD, undefined, {
      typedAnswer: "Manager approval before refunds above 500 rand.",
      answerScore: 82,
      answerPassed: true,
    })

    expect(mockPrisma.reviewLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        cardId: "card-1",
        rating: "GOOD",
        typedAnswer: "Manager approval before refunds above 500 rand.",
        answerScore: 82,
        answerPassed: true,
      }),
    })
  })
})
