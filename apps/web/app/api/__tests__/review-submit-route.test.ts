import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mockAuth = vi.fn()
vi.mock("@/auth", () => ({ auth: mockAuth }))

const mockPrisma = {
  userCard: { findUnique: vi.fn() },
}
vi.mock("@/lib/db", () => ({ prisma: mockPrisma }))

vi.mock("@/lib/services/fsrs-optimizer", () => ({
  getUserFSRSConfig: vi.fn().mockResolvedValue(null),
}))

const mockSubmitReview = vi.fn()
vi.mock("@/lib/services/scheduler", () => ({
  submitReview: mockSubmitReview,
}))

vi.mock("@prisma/client", () => ({
  CardFormat: {
    QA: "QA",
    TRUE_FALSE: "TRUE_FALSE",
    FILL_BLANK: "FILL_BLANK",
  },
  Rating: {
    AGAIN: "AGAIN",
    HARD: "HARD",
    GOOD: "GOOD",
    EASY: "EASY",
  },
}))

function makeSession() {
  return {
    user: {
      id: "user-1",
      role: "AGENT",
      orgId: "org-1",
      email: "agent@example.com",
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockAuth.mockResolvedValue(makeSession())
  mockPrisma.userCard.findUnique.mockResolvedValue({
    id: "uc-1",
    userId: "user-1",
    cardId: "card-1",
    card: {
      answer: "Manager approval is required before confirming a refund request over 500 rand.",
    },
  })
  mockSubmitReview.mockResolvedValue({ id: "uc-1", userId: "user-1", cardId: "card-1" })
})

describe("POST /api/review", () => {
  it("requires a typed answer before accepting a review", async () => {
    const { POST } = await import("../review/route")

    const res = await POST(
      new NextRequest("http://localhost/api/review", {
        method: "POST",
        body: JSON.stringify({ userCardId: "uc-1", rating: "GOOD" }),
        headers: { "Content-Type": "application/json" },
      })
    )

    expect(res.status).toBe(400)
    expect(mockSubmitReview).not.toHaveBeenCalled()
  })

  it("scores the typed answer and passes the assessment into the scheduler log write", async () => {
    const { POST } = await import("../review/route")

    const res = await POST(
      new NextRequest("http://localhost/api/review", {
        method: "POST",
        body: JSON.stringify({
          userCardId: "uc-1",
          rating: "GOOD",
          typedAnswer: "Manager approval is needed before refunds above 500 rand.",
        }),
        headers: { "Content-Type": "application/json" },
      })
    )

    expect(res.status).toBe(200)
    expect(mockPrisma.userCard.findUnique).toHaveBeenCalledWith({
      where: { id: "uc-1" },
      include: { card: { select: { answer: true } } },
    })
    expect(mockSubmitReview).toHaveBeenCalledWith(
      "user-1",
      "card-1",
      "GOOD",
      undefined,
      expect.objectContaining({
        typedAnswer: "Manager approval is needed before refunds above 500 rand.",
        answerPassed: true,
      })
    )
    const assessment = mockSubmitReview.mock.calls[0]?.[4]
    expect(assessment.answerScore).toBeGreaterThanOrEqual(70)
  })
})
