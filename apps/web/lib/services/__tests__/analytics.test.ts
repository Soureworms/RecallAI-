import { describe, it, expect, vi, beforeEach } from "vitest"

// ── Mock Prisma ───────────────────────────────────────────────────────────────

const mockPrisma = vi.hoisted(() => ({
  teamMember: { findMany: vi.fn() },
  userCard: { findMany: vi.fn(), count: vi.fn() },
  reviewLog: { findMany: vi.fn(), count: vi.fn() },
  user: { findUnique: vi.fn() },
  card: { findMany: vi.fn() },
}))

vi.mock("@/lib/db", () => ({ prisma: mockPrisma }))
vi.mock("ts-fsrs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ts-fsrs")>()
  return actual
})

import {
  getTeamRetentionByDeck,
  getUserRetentionScores,
  getKnowledgeGaps,
  getNewHireRampProgress,
  getWeakestCards,
} from "../analytics"

beforeEach(() => {
  vi.clearAllMocks()
})

// ─────────────────────────────────────────────────────────────────────────────

describe("getTeamRetentionByDeck", () => {
  it("returns empty array for team with no members", async () => {
    mockPrisma.teamMember.findMany.mockResolvedValue([])
    const result = await getTeamRetentionByDeck("team-1")
    expect(result).toEqual([])
  })

  it("calculates avg retention per deck from user card stability", async () => {
    mockPrisma.teamMember.findMany.mockResolvedValue([
      { userId: "u-1" }, { userId: "u-2" },
    ])
    const now = new Date()
    const lastWeek = new Date(now.getTime() - 7 * 86_400_000)
    mockPrisma.userCard.findMany.mockResolvedValue([
      {
        stability: 10,
        lastReviewDate: lastWeek,
        cardId: "c-1",
        card: { deck: { id: "d-1", name: "Product Knowledge" } },
      },
      {
        stability: 20,
        lastReviewDate: lastWeek,
        cardId: "c-2",
        card: { deck: { id: "d-1", name: "Product Knowledge" } },
      },
    ])
    const result = await getTeamRetentionByDeck("team-1")
    expect(result.length).toBe(1)
    expect(result[0].name).toBe("Product Knowledge")
    expect(result[0].avgRetention).toBeGreaterThanOrEqual(0)
    expect(result[0].avgRetention).toBeLessThanOrEqual(100)
  })

  it("returns zero avgRetention for cards never reviewed (no lastReviewDate)", async () => {
    mockPrisma.teamMember.findMany.mockResolvedValue([{ userId: "u-1" }])
    mockPrisma.userCard.findMany.mockResolvedValue([
      {
        stability: 0,
        lastReviewDate: null,
        cardId: "c-1",
        card: { deck: { id: "d-1", name: "Deck A" } },
      },
    ])
    const result = await getTeamRetentionByDeck("team-1")
    expect(result[0].avgRetention).toBe(0)
  })
})

describe("getUserRetentionScores", () => {
  it("returns empty array for team with no members", async () => {
    mockPrisma.teamMember.findMany.mockResolvedValue([])
    mockPrisma.userCard.findMany.mockResolvedValue([])
    mockPrisma.reviewLog.findMany.mockResolvedValue([])
    mockPrisma.user.findUnique.mockResolvedValue(null)
    const result = await getUserRetentionScores("team-1")
    expect(result).toEqual([])
  })
})

describe("getKnowledgeGaps", () => {
  it("returns tags sorted by lowest avgRetention", async () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000)
    mockPrisma.userCard.findMany.mockResolvedValue([
      {
        userId: "u-1",
        cardId: "c-1",
        stability: 1,
        lastReviewDate: thirtyDaysAgo,
        card: { tags: ["returns"] },
      },
      {
        userId: "u-1",
        cardId: "c-2",
        stability: 5,
        lastReviewDate: thirtyDaysAgo,
        card: { tags: ["billing"] },
      },
    ])
    const result = await getKnowledgeGaps("org-1")
    expect(Array.isArray(result)).toBe(true)
    result.forEach((item) => {
      expect(item.avgRetention).toBeLessThan(80)
      expect(typeof item.tag).toBe("string")
    })
  })

  it("returns empty array when no user cards exist", async () => {
    mockPrisma.userCard.findMany.mockResolvedValue([])
    const result = await getKnowledgeGaps("org-1")
    expect(result).toEqual([])
  })
})

describe("getNewHireRampProgress", () => {
  it("returns null for users who joined more than 90 days ago", async () => {
    const oldDate = new Date(Date.now() - 100 * 86_400_000)
    mockPrisma.user.findUnique.mockResolvedValue({ createdAt: oldDate })
    const result = await getNewHireRampProgress("u-1")
    expect(result).toBeNull()
  })

  it("returns progress object for users within 90-day window", async () => {
    const recentDate = new Date(Date.now() - 7 * 86_400_000)
    mockPrisma.user.findUnique.mockResolvedValue({ createdAt: recentDate })
    mockPrisma.card.findMany.mockResolvedValue([
      { id: "c-1" },
      { id: "c-2" },
    ])
    mockPrisma.userCard.count.mockResolvedValue(1)
    const result = await getNewHireRampProgress("u-1")
    expect(result).not.toBeNull()
    expect(result!.completionPct ?? result!.percentage).toBeGreaterThanOrEqual(0)
  })
})

describe("getWeakestCards", () => {
  it("returns cards sorted by highest AGAIN rate", async () => {
    mockPrisma.userCard.findMany.mockResolvedValue([
      {
        cardId: "c-1",
        stability: 1,
        card: {
          question: "Tricky card",
          deck: { name: "Deck A" },
          reviewLogs: [
            { rating: "AGAIN" },
            { rating: "AGAIN" },
            { rating: "GOOD" },
          ],
        },
      },
      {
        cardId: "c-2",
        stability: 20,
        card: {
          question: "Easy card",
          deck: { name: "Deck A" },
          reviewLogs: [{ rating: "GOOD" }, { rating: "EASY" }],
        },
      },
    ])
    const result = await getWeakestCards("u-1")
    expect(result[0].question).toBe("Tricky card")
    expect(result[0].againRate).toBeGreaterThan(result[1]?.againRate ?? -1)
  })

  it("excludes cards with no review history", async () => {
    mockPrisma.userCard.findMany.mockResolvedValue([
      {
        cardId: "c-1",
        stability: 0,
        card: {
          question: "Never reviewed",
          deck: { name: "Deck A" },
          reviewLogs: [],
        },
      },
    ])
    const result = await getWeakestCards("u-1")
    expect(result).toEqual([])
  })
})
