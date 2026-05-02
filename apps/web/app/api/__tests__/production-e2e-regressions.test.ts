import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

const mockAuth = vi.fn()
vi.mock("@/auth", () => ({ auth: mockAuth }))

vi.mock("@prisma/client", () => ({
  CardFormat: {
    QA: "QA",
    TRUE_FALSE: "TRUE_FALSE",
    FILL_BLANK: "FILL_BLANK",
  },
}))

const mockPrisma = {
  deck: { findMany: vi.fn() },
  organization: { findUnique: vi.fn() },
  deckAssignment: { findMany: vi.fn() },
  card: { count: vi.fn(), findMany: vi.fn() },
  userCard: { findMany: vi.fn(), findFirst: vi.fn() },
}
vi.mock("@/lib/db", () => ({ prisma: mockPrisma }))

const mockAssignCardsToUsers = vi.fn()
vi.mock("@/lib/services/user-card", () => ({
  assignCardsToUsers: mockAssignCardsToUsers,
}))

vi.mock("@/lib/services/fsrs-optimizer", () => ({
  getUserFSRSConfig: vi.fn().mockResolvedValue(null),
}))

vi.mock("@/lib/services/scheduler", () => ({
  getNextReview: vi.fn(),
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
  mockPrisma.deck.findMany.mockResolvedValue([])
  mockPrisma.organization.findUnique.mockResolvedValue({ studyMode: "AUTO_ROTATE" })
  mockPrisma.deckAssignment.findMany.mockResolvedValue([{ deckId: "deck-1" }])
  mockPrisma.card.count.mockResolvedValue(0)
  mockPrisma.card.findMany.mockResolvedValue([])
  mockPrisma.userCard.findMany.mockResolvedValue([])
  mockPrisma.userCard.findFirst.mockResolvedValue(null)
  mockAssignCardsToUsers.mockResolvedValue(0)
})

describe("production e2e regressions", () => {
  it("GET /api/decks returns the dashboard response contract", async () => {
    const deck = {
      id: "deck-1",
      name: "Escalation Procedures",
    }
    mockPrisma.deck.findMany.mockResolvedValue([deck])
    mockPrisma.card.count.mockResolvedValue(8)

    const { GET } = await import("../decks/route")
    const res = await GET(new NextRequest("http://localhost/api/decks"))

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ decks: [{ ...deck, _count: { cards: 8 } }] })
    expect(mockPrisma.card.count).toHaveBeenCalledWith({ where: { deckId: "deck-1" } })
  })

  it("GET /api/review/due does not fail the review flow when auto-assignment fails", async () => {
    mockPrisma.card.findMany.mockResolvedValue([{ id: "card-1" }])
    mockAssignCardsToUsers.mockRejectedValue(new Error("production schema mismatch"))

    const { GET } = await import("../review/due/route")
    const res = await GET(new NextRequest("http://localhost/api/review/due"))

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ dueCards: [], nextDueDate: null })
  })
})
