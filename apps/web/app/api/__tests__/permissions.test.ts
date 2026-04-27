import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// ── Auth mock ─────────────────────────────────────────────────────────────────

const mockAuth = vi.fn()
vi.mock("@/auth", () => ({ auth: mockAuth }))

// ── Prisma mock ────────────────────────────────────────────────────────────────

const mockPrisma = {
  deck: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
  team: { findUnique: vi.fn() },
  teamMember: { findUnique: vi.fn(), findMany: vi.fn() },
  user: { findUnique: vi.fn(), findMany: vi.fn() },
  userCard: { findMany: vi.fn() },
  reviewLog: { findMany: vi.fn() },
  card: { count: vi.fn(), findMany: vi.fn() },
  invite: { findUnique: vi.fn() },
}
vi.mock("@/lib/db", () => ({ prisma: mockPrisma }))

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeSession(role: string) {
  return {
    user: { id: "user-1", role, orgId: "org-1", email: "test@example.com" },
  }
}

function makeRequest(body?: unknown, url = "http://localhost/api/test") {
  return new NextRequest(url, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
    headers: { "Content-Type": "application/json" },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockPrisma.deck.findMany.mockResolvedValue([])
  mockPrisma.deck.findUnique.mockResolvedValue({ id: "d-1", orgId: "org-1" })
  mockPrisma.deck.create.mockResolvedValue({ id: "d-1" })
  mockPrisma.card.findMany.mockResolvedValue([])
})

// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/decks — create deck", () => {
  it("returns 403 when agent tries to create a deck", async () => {
    mockAuth.mockResolvedValue(makeSession("AGENT"))
    const { POST } = await import("../decks/route")
    const req = makeRequest({ name: "My Deck" })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it("returns 201 when manager creates a deck", async () => {
    mockAuth.mockResolvedValue(makeSession("MANAGER"))
    mockPrisma.deck.create.mockResolvedValue({
      id: "d-1",
      name: "My Deck",
      _count: { cards: 0 },
    })
    const { POST } = await import("../decks/route")
    const req = makeRequest({ name: "My Deck" })
    const res = await POST(req)
    expect(res.status).toBe(201)
  })

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const { POST } = await import("../decks/route")
    const req = makeRequest({ name: "Test" })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })
})

describe("GET /api/decks — list decks", () => {
  it("returns 200 for agents (they can list decks)", async () => {
    mockAuth.mockResolvedValue(makeSession("AGENT"))
    const { GET } = await import("../decks/route")
    const req = new NextRequest("http://localhost/api/decks")
    const res = await GET(req)
    expect(res.status).toBe(200)
  })
})

describe("GET /api/analytics/user/[userId]", () => {
  it("returns 403 when agent tries to view another user's analytics", async () => {
    mockAuth.mockResolvedValue(makeSession("AGENT"))
    mockPrisma.userCard.findMany.mockResolvedValue([])
    mockPrisma.reviewLog.findMany.mockResolvedValue([])
    const { GET } = await import("../analytics/user/[userId]/route")
    const req = new NextRequest("http://localhost/api/analytics/user/other-user")
    const res = await GET(req, { params: { userId: "other-user" } })
    expect(res.status).toBe(403)
  })

  it("returns 200 when agent views their own analytics", async () => {
    mockAuth.mockResolvedValue(makeSession("AGENT"))
    mockPrisma.userCard.findMany.mockResolvedValue([])
    mockPrisma.reviewLog.findMany.mockResolvedValue([])
    mockPrisma.user.findUnique.mockResolvedValue({ id: "user-1", orgId: "org-1", createdAt: new Date() })
    const { GET } = await import("../analytics/user/[userId]/route")
    const req = new NextRequest("http://localhost/api/analytics/user/user-1")
    const res = await GET(req, { params: { userId: "user-1" } })
    expect(res.status).toBe(200)
  })

  it("returns 401 for unauthenticated request", async () => {
    mockAuth.mockResolvedValue(null)
    const { GET } = await import("../analytics/user/[userId]/route")
    const req = new NextRequest("http://localhost/api/analytics/user/user-1")
    const res = await GET(req, { params: { userId: "user-1" } })
    expect(res.status).toBe(401)
  })
})

describe("GET /api/analytics/team/[teamId]", () => {
  it("returns 403 when agent tries to access team analytics", async () => {
    mockAuth.mockResolvedValue(makeSession("AGENT"))
    const { GET } = await import("../analytics/team/[teamId]/route")
    const req = new NextRequest("http://localhost/api/analytics/team/team-1")
    const res = await GET(req, { params: { teamId: "team-1" } })
    expect(res.status).toBe(403)
  })

  it("returns 404 when manager accesses a team from a different org", async () => {
    mockAuth.mockResolvedValue(makeSession("MANAGER"))
    mockPrisma.team.findUnique.mockResolvedValue({ id: "team-1", orgId: "other-org" })
    const { GET } = await import("../analytics/team/[teamId]/route")
    const req = new NextRequest("http://localhost/api/analytics/team/team-1")
    const res = await GET(req, { params: { teamId: "team-1" } })
    expect(res.status).toBe(404)
  })
})

describe("POST /api/documents/upload", () => {
  it("returns 403 when agent tries to upload a document", async () => {
    mockAuth.mockResolvedValue(makeSession("AGENT"))
    const { POST } = await import("../documents/upload/route")
    const req = new NextRequest("http://localhost/api/documents/upload", {
      method: "POST",
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })
})

describe("POST /api/teams — create team (admin only)", () => {
  it("returns 403 when manager tries to create a team", async () => {
    mockAuth.mockResolvedValue(makeSession("MANAGER"))
    const { POST } = await import("../teams/route")
    const req = makeRequest({ name: "New Team" })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const { POST } = await import("../teams/route")
    const req = makeRequest({ name: "New Team" })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })
})

describe("GET /api/invite/[token] — public endpoint", () => {
  it("returns 404 for unknown token", async () => {
    mockPrisma.invite.findUnique.mockResolvedValue(null)
    const { GET } = await import("../invite/[token]/route")
    const req = new NextRequest("http://localhost/api/invite/bad-token")
    const res = await GET(req, { params: { token: "bad-token" } })
    expect(res.status).toBe(404)
  })

  it("returns 410 for expired token", async () => {
    mockPrisma.invite.findUnique.mockResolvedValue({
      token: "t",
      acceptedAt: null,
      expiresAt: new Date("2020-01-01"),
      team: { name: "Support" },
    })
    const { GET } = await import("../invite/[token]/route")
    const req = new NextRequest("http://localhost/api/invite/t")
    const res = await GET(req, { params: { token: "t" } })
    expect(res.status).toBe(410)
  })
})
