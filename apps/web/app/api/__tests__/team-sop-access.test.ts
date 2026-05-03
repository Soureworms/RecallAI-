import { beforeEach, describe, expect, it, vi } from "vitest"
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
  deck: { findFirst: vi.fn(), findMany: vi.fn(), findUnique: vi.fn() },
  deckAssignment: { findMany: vi.fn(), findUnique: vi.fn(), createMany: vi.fn(), deleteMany: vi.fn() },
  card: { count: vi.fn(), create: vi.fn(), findMany: vi.fn() },
  sourceDocument: { findMany: vi.fn(), findUnique: vi.fn() },
  team: { findUnique: vi.fn() },
  user: { findMany: vi.fn() },
  userCard: { count: vi.fn(), findFirst: vi.fn() },
  reviewLog: { count: vi.fn(), findMany: vi.fn() },
}
vi.mock("@/lib/db", () => ({ prisma: mockPrisma }))

const mockAssignCardsToUsers = vi.fn()
vi.mock("@/lib/services/user-card", () => ({ assignCardsToUsers: mockAssignCardsToUsers }))

function makeSession(role: "AGENT" | "MANAGER" | "ADMIN" = "AGENT") {
  return {
    user: {
      id: "user-1",
      role,
      orgId: "org-1",
      email: `${role.toLowerCase()}@example.com`,
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockAuth.mockResolvedValue(makeSession())
  mockPrisma.deck.findFirst.mockResolvedValue({ id: "deck-1", orgId: "org-1", isArchived: false })
  mockPrisma.deck.findMany.mockResolvedValue([])
  mockPrisma.deck.findUnique.mockResolvedValue({ id: "deck-1", orgId: "org-1", isArchived: false })
  mockPrisma.deckAssignment.findMany.mockResolvedValue([])
  mockPrisma.deckAssignment.findUnique.mockResolvedValue({ userId: "user-1", deckId: "deck-1" })
  mockPrisma.deckAssignment.createMany.mockResolvedValue({ count: 2 })
  mockPrisma.deckAssignment.deleteMany.mockResolvedValue({ count: 1 })
  mockPrisma.card.count.mockResolvedValue(0)
  mockPrisma.card.create.mockResolvedValue({ id: "card-1" })
  mockPrisma.card.findMany.mockResolvedValue([])
  mockPrisma.sourceDocument.findMany.mockResolvedValue([])
  mockPrisma.sourceDocument.findUnique.mockResolvedValue({
    id: "doc-1",
    orgId: "org-1",
    deckId: "deck-1",
    status: "READY",
  })
  mockPrisma.team.findUnique.mockResolvedValue({
    id: "team-support",
    orgId: "org-1",
    members: [{ userId: "user-1" }, { userId: "user-2" }],
  })
  mockPrisma.user.findMany.mockResolvedValue([])
  mockPrisma.userCard.count.mockResolvedValue(0)
  mockPrisma.userCard.findFirst.mockResolvedValue(null)
  mockPrisma.reviewLog.count.mockResolvedValue(0)
  mockPrisma.reviewLog.findMany.mockResolvedValue([])
  mockAssignCardsToUsers.mockResolvedValue(0)
})

describe("team-scoped SOP access", () => {
  it("lists only decks assigned to an agent", async () => {
    const { GET } = await import("../decks/route")
    const res = await GET(new NextRequest("http://localhost/api/decks"))

    expect(res.status).toBe(200)
    expect(mockPrisma.deck.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          orgId: "org-1",
          isArchived: false,
          assignments: { some: { userId: "user-1" } },
        }),
      })
    )
  })

  it("does not allow an agent to read cards from an unassigned deck", async () => {
    mockPrisma.deckAssignment.findUnique.mockResolvedValue(null)
    mockPrisma.deck.findFirst.mockResolvedValue(null)

    const { GET } = await import("../decks/[deckId]/cards/route")
    const res = await GET(new NextRequest("http://localhost/api/decks/deck-1/cards"), {
      params: { deckId: "deck-1" },
    })

    expect(res.status).toBe(404)
    expect(mockPrisma.card.findMany).not.toHaveBeenCalled()
  })

  it("counts review stats only for decks assigned to the current agent", async () => {
    const { GET } = await import("../review/stats/route")
    const res = await GET()

    expect(res.status).toBe(200)
    expect(mockPrisma.userCard.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        userId: "user-1",
        card: {
          status: "ACTIVE",
          deck: {
            orgId: "org-1",
            isArchived: false,
            assignments: { some: { userId: "user-1" } },
          },
        },
      }),
    })
  })

  it("reports deck assignment rows created for a team assignment", async () => {
    mockAuth.mockResolvedValue(makeSession("MANAGER"))
    mockPrisma.card.findMany.mockResolvedValue([{ id: "card-1" }])
    mockAssignCardsToUsers.mockResolvedValue(2)

    const { POST } = await import("../decks/[deckId]/assign/route")
    const res = await POST(
      new NextRequest("http://localhost/api/decks/deck-1/assign", {
        method: "POST",
        body: JSON.stringify({ teamId: "team-support" }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: { deckId: "deck-1" } }
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ created: 2, assignmentRecordsCreated: 2 })
    expect(mockPrisma.deckAssignment.createMany).toHaveBeenCalledTimes(1)
    expect(mockPrisma.deckAssignment.createMany).toHaveBeenCalledWith({
      data: [
        { userId: "user-1", deckId: "deck-1", assignedById: "user-1", teamId: "team-support" },
        { userId: "user-2", deckId: "deck-1", assignedById: "user-1", teamId: "team-support" },
      ],
      skipDuplicates: true,
    })
  })

  it("lists only decks a manager created or can reach through team assignments", async () => {
    mockAuth.mockResolvedValue(makeSession("MANAGER"))

    const { GET } = await import("../decks/route")
    const res = await GET(new NextRequest("http://localhost/api/decks"))

    expect(res.status).toBe(200)
    expect(mockPrisma.deck.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          orgId: "org-1",
          isArchived: false,
          OR: [
            { createdById: "user-1" },
            { assignments: { some: { userId: "user-1" } } },
            { assignments: { some: { team: { members: { some: { userId: "user-1" } } } } } },
          ],
        }),
      })
    )
  })

  it("does not let a manager assign a deck to a team they do not belong to", async () => {
    mockAuth.mockResolvedValue(makeSession("MANAGER"))
    mockPrisma.team.findUnique.mockResolvedValue({
      id: "team-success",
      orgId: "org-1",
      members: [{ userId: "user-2" }],
    })

    const { POST } = await import("../decks/[deckId]/assign/route")
    const res = await POST(
      new NextRequest("http://localhost/api/decks/deck-1/assign", {
        method: "POST",
        body: JSON.stringify({ teamId: "team-success" }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: { deckId: "deck-1" } }
    )

    expect(res.status).toBe(403)
    expect(mockPrisma.deckAssignment.createMany).not.toHaveBeenCalled()
  })

  it("does not let a manager read a deck outside their team scope", async () => {
    mockAuth.mockResolvedValue(makeSession("MANAGER"))
    mockPrisma.deck.findFirst.mockResolvedValue(null)

    const { GET } = await import("../decks/[deckId]/route")
    const res = await GET(new NextRequest("http://localhost/api/decks/deck-1"), {
      params: { deckId: "deck-1" },
    })

    expect(res.status).toBe(404)
    expect(mockPrisma.card.count).not.toHaveBeenCalled()
  })

  it("does not let a manager read cards from a deck outside their team scope", async () => {
    mockAuth.mockResolvedValue(makeSession("MANAGER"))
    mockPrisma.deck.findFirst.mockResolvedValue(null)

    const { GET } = await import("../decks/[deckId]/cards/route")
    const res = await GET(new NextRequest("http://localhost/api/decks/deck-1/cards"), {
      params: { deckId: "deck-1" },
    })

    expect(res.status).toBe(404)
    expect(mockPrisma.card.findMany).not.toHaveBeenCalled()
  })

  it("does not let a manager add cards to a deck outside their team scope", async () => {
    mockAuth.mockResolvedValue(makeSession("MANAGER"))
    mockPrisma.deck.findFirst.mockResolvedValue(null)

    const { POST } = await import("../decks/[deckId]/cards/route")
    const res = await POST(
      new NextRequest("http://localhost/api/decks/deck-1/cards", {
        method: "POST",
        body: JSON.stringify({ question: "Q?", answer: "A" }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: { deckId: "deck-1" } }
    )

    expect(res.status).toBe(404)
    expect(mockPrisma.card.create).not.toHaveBeenCalled()
  })

  it("does not let a manager list documents for a deck outside their team scope", async () => {
    mockAuth.mockResolvedValue(makeSession("MANAGER"))
    mockPrisma.deck.findFirst.mockResolvedValue(null)

    const { GET } = await import("../documents/route")
    const res = await GET(new NextRequest("http://localhost/api/documents?deckId=deck-1"))

    expect(res.status).toBe(404)
    expect(mockPrisma.sourceDocument.findMany).not.toHaveBeenCalled()
  })

  it("does not let a manager read a document attached to a deck outside their team scope", async () => {
    mockAuth.mockResolvedValue(makeSession("MANAGER"))
    mockPrisma.deck.findFirst.mockResolvedValue(null)

    const { GET } = await import("../documents/[documentId]/route")
    const res = await GET(new NextRequest("http://localhost/api/documents/doc-1"), {
      params: { documentId: "doc-1" },
    })

    expect(res.status).toBe(404)
  })

  it("does not let a manager generate cards from a deck outside their team scope", async () => {
    mockAuth.mockResolvedValue(makeSession("MANAGER"))
    mockPrisma.deck.findFirst.mockResolvedValue(null)

    const { POST } = await import("../decks/[deckId]/generate/route")
    const res = await POST(
      new NextRequest("http://localhost/api/decks/deck-1/generate", {
        method: "POST",
        body: JSON.stringify({ sourceDocumentId: "doc-1" }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: { deckId: "deck-1" } }
    )

    expect(res.status).toBe(404)
  })

  it("does not let a manager directly assign a deck to users outside their teams", async () => {
    mockAuth.mockResolvedValue(makeSession("MANAGER"))
    mockPrisma.user.findMany.mockResolvedValue([])

    const { POST } = await import("../decks/[deckId]/assign/route")
    const res = await POST(
      new NextRequest("http://localhost/api/decks/deck-1/assign", {
        method: "POST",
        body: JSON.stringify({ userIds: ["user-2"] }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: { deckId: "deck-1" } }
    )

    expect(res.status).toBe(403)
    expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["user-2"] },
        orgId: "org-1",
        teams: {
          some: {
            team: { members: { some: { userId: "user-1" } } },
          },
        },
      },
      select: { id: true },
    })
    expect(mockPrisma.deckAssignment.createMany).not.toHaveBeenCalled()
  })

  it("does not let a manager remove deck assignments for users outside their teams", async () => {
    mockAuth.mockResolvedValue(makeSession("MANAGER"))
    mockPrisma.user.findMany.mockResolvedValue([])

    const { DELETE } = await import("../decks/[deckId]/assign/route")
    const res = await DELETE(
      new NextRequest("http://localhost/api/decks/deck-1/assign", {
        method: "DELETE",
        body: JSON.stringify({ userIds: ["user-2"] }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: { deckId: "deck-1" } }
    )

    expect(res.status).toBe(403)
    expect(mockPrisma.deckAssignment.deleteMany).not.toHaveBeenCalled()
  })
})
