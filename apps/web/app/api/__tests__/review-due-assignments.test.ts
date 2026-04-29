import { beforeEach, describe, expect, it, vi } from "vitest"

const mockAuth = vi.fn()
vi.mock("@/auth", () => ({ auth: mockAuth }))

const mockAssignCardsToUsers = vi.fn()
vi.mock("@/lib/services/user-card", () => ({ assignCardsToUsers: mockAssignCardsToUsers }))

vi.mock("@/lib/services/fsrs-optimizer", () => ({
  getUserFSRSConfig: vi.fn().mockResolvedValue(null),
}))

vi.mock("@/lib/services/scheduler", () => ({
  getNextReview: vi.fn(() => ({
    again: { nextDue: new Date("2026-01-01T00:00:00.000Z"), scheduledDays: 0 },
    hard: { nextDue: new Date("2026-01-02T00:00:00.000Z"), scheduledDays: 1 },
    good: { nextDue: new Date("2026-01-03T00:00:00.000Z"), scheduledDays: 2 },
    easy: { nextDue: new Date("2026-01-04T00:00:00.000Z"), scheduledDays: 3 },
  })),
}))

const mockPrisma = {
  organization: { findUnique: vi.fn() },
  deckAssignment: { findMany: vi.fn() },
  card: { findMany: vi.fn() },
  userCard: { findMany: vi.fn(), findFirst: vi.fn() },
}
vi.mock("@/lib/db", () => ({ prisma: mockPrisma }))

function makeSession(userId: string) {
  return { user: { id: userId, role: "AGENT", orgId: "org-1", email: `${userId}@example.com` } }
}

describe("GET /api/review/due assignment gating", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.organization.findUnique.mockResolvedValue({ studyMode: "AUTO_ROTATE" })
    mockPrisma.card.findMany.mockResolvedValue([{ id: "card-1" }])
    mockPrisma.userCard.findFirst.mockResolvedValue(null)
  })

  it("returns assigned deck cards for assigned user", async () => {
    mockAuth.mockResolvedValue(makeSession("assigned-user"))
    mockPrisma.deckAssignment.findMany.mockResolvedValue([{ deckId: "deck-1" }])
    mockPrisma.userCard.findMany.mockResolvedValue([
      {
        id: "uc-1",
        cardId: "card-1",
        reps: 0,
        card: { question: "Q", answer: "A", format: "QA", tags: [], deck: { name: "Deck A" } },
      },
    ])

    const { GET } = await import("../review/due/route")
    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.dueCards).toHaveLength(1)
    expect(mockAssignCardsToUsers).toHaveBeenCalledWith(["assigned-user"], ["card-1"])
  })

  it("returns no cards for unassigned user", async () => {
    mockAuth.mockResolvedValue(makeSession("unassigned-user"))
    mockPrisma.deckAssignment.findMany.mockResolvedValue([])

    const { GET } = await import("../review/due/route")
    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.dueCards).toEqual([])
    expect(body.nextDueDate).toBeNull()
    expect(mockAssignCardsToUsers).not.toHaveBeenCalled()
    expect(mockPrisma.card.findMany).not.toHaveBeenCalled()
  })
})
