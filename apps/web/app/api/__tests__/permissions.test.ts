import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"
import { assertRole, type Role } from "@/lib/auth/roles"

// ── Auth mock ─────────────────────────────────────────────────────────────────

const mockAuth = vi.fn()
vi.mock("@/auth", () => ({ auth: mockAuth }))

// ── Prisma mock ────────────────────────────────────────────────────────────────

const mockPrisma = {
  deck: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
  team: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
  teamMember: { findFirst: vi.fn(), findUnique: vi.fn(), findMany: vi.fn() },
  user: { findUnique: vi.fn(), findMany: vi.fn() },
  userCard: { findMany: vi.fn() },
  reviewLog: { findMany: vi.fn() },
  card: { count: vi.fn(), findMany: vi.fn() },
  invite: { findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
}
vi.mock("@/lib/db", () => ({ prisma: mockPrisma }))

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeSession(role: Role) {
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
  mockPrisma.team.findMany.mockResolvedValue([])
  mockPrisma.team.findUnique.mockResolvedValue({ id: "team-1", orgId: "org-1" })
  mockPrisma.team.create.mockResolvedValue({ id: "team-1", name: "New Team", members: [] })
  mockPrisma.teamMember.findUnique.mockResolvedValue({ userId: "user-1", teamId: "team-1" })
  mockPrisma.teamMember.findFirst.mockResolvedValue({ userId: "other-user", teamId: "team-1" })
  mockPrisma.invite.findMany.mockResolvedValue([])
  mockPrisma.invite.findFirst.mockResolvedValue(null)
  mockPrisma.invite.create.mockResolvedValue({
    id: "invite-1",
    token: "token-1",
    email: "agent@example.com",
    role: "AGENT",
    expiresAt: new Date(),
  })
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

  it("returns 403 when customer admin tries to create a deck", async () => {
    mockAuth.mockResolvedValue(makeSession("ADMIN"))
    const { POST } = await import("../decks/route")
    const req = makeRequest({ name: "Admin Deck" })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const { POST } = await import("../decks/route")
    const req = makeRequest({ name: "Test" })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it("throws for invalid session role values", async () => {
    mockAuth.mockResolvedValue(makeSession("OWNER" as Role))
    const { POST } = await import("../decks/route")
    const req = makeRequest({ name: "My Deck" })
    const res = await POST(req)
    expect(res.status).toBe(500)
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

  it("returns 403 when manager views a user outside their shared teams", async () => {
    mockAuth.mockResolvedValue(makeSession("MANAGER"))
    mockPrisma.user.findUnique.mockResolvedValue({ id: "success-agent", orgId: "org-1", createdAt: new Date() })
    mockPrisma.teamMember.findFirst.mockResolvedValue(null)

    const { GET } = await import("../analytics/user/[userId]/route")
    const req = new NextRequest("http://localhost/api/analytics/user/success-agent")
    const res = await GET(req, { params: { userId: "success-agent" } })

    expect(res.status).toBe(403)
    expect(mockPrisma.teamMember.findFirst).toHaveBeenCalledWith({
      where: {
        userId: "success-agent",
        team: { members: { some: { userId: "user-1" } } },
      },
    })
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

  it("returns 403 when customer admin tries to upload a document", async () => {
    mockAuth.mockResolvedValue(makeSession("ADMIN"))
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

describe("GET /api/teams — list teams by role", () => {
  it("limits managers to teams they belong to", async () => {
    mockAuth.mockResolvedValue(makeSession("MANAGER"))
    const { GET } = await import("../teams/route")
    const res = await GET()
    expect(res.status).toBe(200)
    expect(mockPrisma.team.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          orgId: "org-1",
          members: { some: { userId: "user-1" } },
        },
      })
    )
  })

  it("lets customer admins see all teams in their org", async () => {
    mockAuth.mockResolvedValue(makeSession("ADMIN"))
    const { GET } = await import("../teams/route")
    const res = await GET()
    expect(res.status).toBe(200)
    expect(mockPrisma.team.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { orgId: "org-1" },
      })
    )
  })
})

describe("GET /api/teams/[teamId]/invite — list team invites", () => {
  it("returns 403 when manager is not a member of the team", async () => {
    mockAuth.mockResolvedValue(makeSession("MANAGER"))
    mockPrisma.teamMember.findUnique.mockResolvedValue(null)
    const { GET } = await import("../teams/[teamId]/invite/route")
    const req = new NextRequest("http://localhost/api/teams/team-1/invite")
    const res = await GET(req, { params: { teamId: "team-1" } })
    expect(res.status).toBe(403)
  })
})

describe("POST /api/teams/[teamId]/invite — create team invite", () => {
  it("returns 403 when manager tries to invite another manager", async () => {
    mockAuth.mockResolvedValue(makeSession("MANAGER"))
    const { POST } = await import("../teams/[teamId]/invite/route")
    const req = makeRequest({ email: "lead@example.com", role: "MANAGER" })
    const res = await POST(req, { params: { teamId: "team-1" } })
    expect(res.status).toBe(403)
  })

  it("lets customer admins invite managers to a team", async () => {
    mockAuth.mockResolvedValue(makeSession("ADMIN"))
    mockPrisma.invite.create.mockResolvedValue({
      id: "invite-1",
      token: "token-1",
      email: "lead@example.com",
      role: "MANAGER",
      expiresAt: new Date(),
    })
    const { POST } = await import("../teams/[teamId]/invite/route")
    const req = makeRequest({ email: "lead@example.com", role: "MANAGER" })
    const res = await POST(req, { params: { teamId: "team-1" } })
    expect(res.status).toBe(201)
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


describe("role helper checks", () => {
  it("enforces manager-plus hierarchy", async () => {
    const { isManagerPlus } = await import("@/lib/auth/permissions")
    expect(isManagerPlus("AGENT")).toBe(false)
    expect(isManagerPlus("MANAGER")).toBe(true)
    expect(isManagerPlus("ADMIN")).toBe(true)
    expect(isManagerPlus("SUPER_ADMIN")).toBe(true)
  })

  it("enforces admin-only check", async () => {
    const { isAdmin } = await import("@/lib/auth/permissions")
    expect(isAdmin("ADMIN")).toBe(true)
    expect(isAdmin("MANAGER")).toBe(false)
  })
})


describe("role parsing", () => {
  it("rejects unknown roles", () => {
    expect(() => assertRole("OWNER", "test role")).toThrow("Invalid test role: OWNER")
  })
})
