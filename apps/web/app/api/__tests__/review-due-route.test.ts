import { beforeEach, describe, expect, it, vi } from "vitest"

const mockRequireRole = vi.fn()
vi.mock("@/lib/auth/permissions", () => ({ requireRole: mockRequireRole }))

const mockAssignCardsToUsers = vi.fn()
vi.mock("@/lib/services/user-card", () => ({ assignCardsToUsers: mockAssignCardsToUsers }))

const mockGetUserFSRSConfig = vi.fn()
vi.mock("@/lib/services/fsrs-optimizer", () => ({ getUserFSRSConfig: mockGetUserFSRSConfig }))

vi.mock("@/lib/services/scheduler", () => ({
  getNextReview: vi.fn(() => {
    const nextDue = new Date("2026-01-01T00:00:00.000Z")
    return {
      again: { nextDue, scheduledDays: 0 },
      hard: { nextDue, scheduledDays: 1 },
      good: { nextDue, scheduledDays: 2 },
      easy: { nextDue, scheduledDays: 3 },
    }
  }),
}))

vi.mock("@/lib/api/handler", () => ({ withHandlerSimple: (handler: () => unknown) => handler }))

const mockPrisma = {
  organization: { findUnique: vi.fn() },
  deckAssignment: { findMany: vi.fn() },
  card: { findMany: vi.fn() },
  userCard: { findMany: vi.fn(), findFirst: vi.fn() },
}
vi.mock("@/lib/db", () => ({ prisma: mockPrisma }))

describe("GET /api/review/due", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireRole.mockResolvedValue({ ok: true, session: { user: { id: "user-1", orgId: "org-1" } } })
    mockGetUserFSRSConfig.mockResolvedValue(null)
    mockPrisma.deckAssignment.findMany.mockResolvedValue([{ deckId: "deck-1" }])
    mockPrisma.card.findMany.mockResolvedValue([])
    mockPrisma.userCard.findMany.mockResolvedValue([])
    mockPrisma.userCard.findFirst.mockResolvedValue(null)
    mockAssignCardsToUsers.mockResolvedValue(undefined)
  })

  it("enforces mandatory-or-rotation deck filter in MANUAL mode for due cards and next due", async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({ studyMode: "MANUAL" })

    const { GET } = await import("../review/due/route")
    const response = await GET()
    const payload = await response.json()

    expect(payload.dueCards).toEqual([])
    const manualDeckFilter = {
      id: { in: ["deck-1"] },
      orgId: "org-1",
      isArchived: false,
      OR: [{ isMandatory: true }, { inRotation: true }],
    }

    expect(mockPrisma.card.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: "ACTIVE", deck: manualDeckFilter } }),
    )
    expect(mockPrisma.userCard.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          card: { status: "ACTIVE", deck: manualDeckFilter },
        }),
      }),
    )
    expect(mockPrisma.userCard.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          card: { status: "ACTIVE", deck: manualDeckFilter },
        }),
      }),
    )
  })

  it("keeps AUTO_ROTATE deck filter unchanged", async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({ studyMode: "AUTO_ROTATE" })

    const { GET } = await import("../review/due/route")
    await GET()

    const autoRotateDeckFilter = { id: { in: ["deck-1"] }, orgId: "org-1", isArchived: false }

    expect(mockPrisma.card.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: "ACTIVE", deck: autoRotateDeckFilter } }),
    )
    expect(mockPrisma.userCard.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          card: { status: "ACTIVE", deck: autoRotateDeckFilter },
        }),
      }),
    )
    expect(mockPrisma.userCard.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          card: { status: "ACTIVE", deck: autoRotateDeckFilter },
        }),
      }),
    )
  })
})
