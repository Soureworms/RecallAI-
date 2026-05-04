import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mockAuth = vi.fn()
vi.mock("@/auth", () => ({ auth: mockAuth }))

const mockPrisma = {
  deck: { findFirst: vi.fn() },
  reviewLog: { findMany: vi.fn() },
  team: { findUnique: vi.fn() },
  teamMember: { findFirst: vi.fn(), findUnique: vi.fn() },
  user: { findUnique: vi.fn() },
}
vi.mock("@/lib/db", () => ({ prisma: mockPrisma }))

function makeSession(role: "MANAGER" | "ADMIN" = "MANAGER") {
  return {
    user: {
      id: "manager-1",
      role,
      orgId: "org-1",
      email: `${role.toLowerCase()}@example.com`,
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockAuth.mockResolvedValue(makeSession())
  mockPrisma.deck.findFirst.mockResolvedValue({ id: "deck-1" })
  mockPrisma.reviewLog.findMany.mockResolvedValue([
    {
      id: "log-1",
      rating: "GOOD",
      reviewedAt: new Date("2026-05-03T08:00:00.000Z"),
      typedAnswer: "Manager approval is required before refunds above 500 rand.",
      answerScore: 86,
      answerPassed: true,
      user: { id: "agent-1", name: "Agent One", email: "agent@example.com" },
      card: {
        id: "card-1",
        question: "What is required before refunds above 500 rand?",
        answer: "Manager approval is required.",
        deck: { id: "deck-1", name: "Refund SOP" },
      },
    },
  ])
  mockPrisma.team.findUnique.mockResolvedValue({ id: "team-1", orgId: "org-1" })
  mockPrisma.teamMember.findUnique.mockResolvedValue({ userId: "manager-1", teamId: "team-1" })
  mockPrisma.teamMember.findFirst.mockResolvedValue({ userId: "agent-1", teamId: "team-1" })
  mockPrisma.user.findUnique.mockResolvedValue({ id: "agent-1", orgId: "org-1" })
})

describe("GET /api/compliance/reviews", () => {
  it("returns typed-answer review evidence scoped to a manager's reachable decks", async () => {
    const { GET } = await import("../compliance/reviews/route")
    const res = await GET(new NextRequest("http://localhost/api/compliance/reviews?passed=false&limit=25"))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.summary).toEqual({
      total: 1,
      passed: 1,
      failed: 0,
      averageAnswerScore: 86,
    })
    expect(body.items[0]).toMatchObject({
      id: "log-1",
      typedAnswer: "Manager approval is required before refunds above 500 rand.",
      answerScore: 86,
      answerPassed: true,
      user: { id: "agent-1", email: "agent@example.com" },
      deck: { id: "deck-1", name: "Refund SOP" },
    })
    expect(mockPrisma.reviewLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 25,
        where: {
          answerScore: { not: null },
          answerPassed: false,
          user: { orgId: "org-1" },
          card: {
            deck: {
              orgId: "org-1",
              isArchived: false,
              OR: [
                { createdById: "manager-1" },
                { assignments: { some: { userId: "manager-1" } } },
                { assignments: { some: { team: { members: { some: { userId: "manager-1" } } } } } },
              ],
            },
          },
        },
      })
    )
  })

  it("blocks manager reports for inaccessible deck filters", async () => {
    mockPrisma.deck.findFirst.mockResolvedValue(null)

    const { GET } = await import("../compliance/reviews/route")
    const res = await GET(new NextRequest("http://localhost/api/compliance/reviews?deckId=deck-2"))

    expect(res.status).toBe(404)
    expect(mockPrisma.reviewLog.findMany).not.toHaveBeenCalled()
  })

  it("blocks manager reports for users outside shared teams", async () => {
    mockPrisma.teamMember.findFirst.mockResolvedValue(null)

    const { GET } = await import("../compliance/reviews/route")
    const res = await GET(new NextRequest("http://localhost/api/compliance/reviews?userId=agent-2"))

    expect(res.status).toBe(403)
    expect(mockPrisma.reviewLog.findMany).not.toHaveBeenCalled()
  })
})
