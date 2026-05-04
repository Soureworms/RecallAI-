import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mockAuth = vi.fn()
vi.mock("@/auth", () => ({ auth: mockAuth }))

const mockPrisma = {
  deck: { count: vi.fn() },
  organization: { findUnique: vi.fn(), update: vi.fn() },
  user: { count: vi.fn() },
}
vi.mock("@/lib/db", () => ({ prisma: mockPrisma }))

function makeSession(role: "ADMIN" | "MANAGER" = "ADMIN") {
  return {
    user: {
      id: "admin-1",
      role,
      orgId: "org-1",
      email: `${role.toLowerCase()}@example.com`,
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockAuth.mockResolvedValue(makeSession())
  mockPrisma.deck.count.mockResolvedValue(2)
  mockPrisma.user.count.mockResolvedValue(3)
  mockPrisma.organization.findUnique.mockResolvedValue({
    id: "org-1",
    name: "Recall Test Org",
    studyMode: "AUTO_ROTATE",
    complianceAnswerThreshold: 80,
    complianceCompletionThreshold: 95,
  })
  mockPrisma.organization.update.mockResolvedValue({
    id: "org-1",
    name: "Recall Test Org",
    studyMode: "AUTO_ROTATE",
    complianceAnswerThreshold: 88,
    complianceCompletionThreshold: 92,
  })
})

describe("/api/org/settings compliance thresholds", () => {
  it("returns compliance thresholds with org settings", async () => {
    const { GET } = await import("../org/settings/route")
    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.complianceAnswerThreshold).toBe(80)
    expect(body.complianceCompletionThreshold).toBe(95)
  })

  it("lets admins update compliance thresholds", async () => {
    const { PATCH } = await import("../org/settings/route")
    const res = await PATCH(
      new NextRequest("http://localhost/api/org/settings", {
        method: "PATCH",
        body: JSON.stringify({
          complianceAnswerThreshold: 88,
          complianceCompletionThreshold: 92,
        }),
        headers: { "Content-Type": "application/json" },
      })
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(mockPrisma.organization.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          complianceAnswerThreshold: 88,
          complianceCompletionThreshold: 92,
        },
      })
    )
    expect(body.complianceAnswerThreshold).toBe(88)
    expect(body.complianceCompletionThreshold).toBe(92)
  })
})
