import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mockAuth = vi.fn()
vi.mock("@/auth", () => ({ auth: mockAuth }))

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimitWithPolicy: vi.fn().mockResolvedValue({ allowed: true, limit: 100, remaining: 99, reset: 0 }),
  rateLimitHeaders: vi.fn().mockReturnValue({}),
}))

vi.mock("@/lib/env", () => ({
  env: {
    OPENAI_API_KEY: "sk-test",
    QSTASH_TOKEN: "qstash-test",
    QSTASH_CURRENT_SIGNING_KEY: "current",
    QSTASH_NEXT_SIGNING_KEY: "next",
    UPSTASH_REDIS_REST_URL: "https://redis.example.com",
    UPSTASH_REDIS_REST_TOKEN: "redis-token",
  },
}))

const mockPrisma = {
  deck: { findUnique: vi.fn() },
  sourceDocument: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), update: vi.fn() },
  card: { create: vi.fn() },
  $transaction: vi.fn(),
}
vi.mock("@/lib/db", () => ({ prisma: mockPrisma }))

const mockPublishGenerateJob = vi.fn()
vi.mock("@/lib/queue/qstash", () => ({
  publishGenerateJob: mockPublishGenerateJob,
}))

const mockRedis = { setex: vi.fn(), get: vi.fn() }
vi.mock("@/lib/redis", () => ({
  getRedis: vi.fn(() => mockRedis),
}))

const mockGenerateCardsFromText = vi.fn()
vi.mock("@/lib/services/card-generator", () => ({
  generateCardsFromText: mockGenerateCardsFromText,
}))

function metadata() {
  return {
    chunksTotal: 1,
    chunksSucceeded: 1,
    chunksFailed: 0,
    failedChunks: [],
    successRatio: 1,
    quality: {
      totalGenerated: 1,
      validCards: 1,
      rejectedCards: 0,
      avgQualityScore: 96,
      reasons: {},
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockAuth.mockResolvedValue({
    user: {
      id: "manager-1",
      role: "MANAGER",
      orgId: "org-1",
      email: "manager@example.com",
    },
  })
  mockPrisma.deck.findUnique.mockResolvedValue({ id: "deck-1", orgId: "org-1" })
  mockPrisma.sourceDocument.findUnique.mockResolvedValue({
    id: "doc-1",
    orgId: "org-1",
    status: "READY",
    textContent: "Refund SOP",
  })
  mockPrisma.sourceDocument.findUniqueOrThrow.mockResolvedValue({ textContent: "Refund SOP" })
  mockPrisma.sourceDocument.update.mockResolvedValue({})
  mockPrisma.card.create.mockImplementation(({ data }) => ({ data }))
  mockPrisma.$transaction.mockResolvedValue([])
  mockPublishGenerateJob.mockResolvedValue(undefined)
  mockRedis.setex.mockResolvedValue("OK")
  mockGenerateCardsFromText.mockResolvedValue({
    cards: [
      {
        question: "What is the refund window?",
        answer: "30 days",
        format: "QA",
        tags: ["refund"],
        difficulty: 1,
      },
    ],
    metadata: metadata(),
  })
})

describe("POST /api/decks/[deckId]/generate", () => {
  it("falls back to inline generation when QStash enqueue fails", async () => {
    mockPublishGenerateJob.mockRejectedValue(new Error("QStash unauthorized"))

    const { POST } = await import("../decks/[deckId]/generate/route")
    const res = await POST(
      new NextRequest("http://localhost/api/decks/deck-1/generate", {
        method: "POST",
        body: JSON.stringify({ sourceDocumentId: "doc-1" }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: { deckId: "deck-1" } }
    )

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      jobId: expect.any(String),
      status: "completed",
      count: 1,
    })
    expect(mockGenerateCardsFromText).toHaveBeenCalledWith("Refund SOP", expect.any(Function))
    expect(mockPrisma.card.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        deckId: "deck-1",
        sourceDocumentId: "doc-1",
        question: "What is the refund window?",
      }),
    })
    expect(mockRedis.setex).toHaveBeenLastCalledWith(
      expect.stringMatching(/^job:/),
      3600,
      expect.objectContaining({ state: "completed", count: 1 })
    )
  })

  it("does not fail generation when the initial Redis status write fails", async () => {
    mockRedis.setex.mockRejectedValueOnce(new Error("Redis unauthorized")).mockResolvedValue("OK")

    const { POST } = await import("../decks/[deckId]/generate/route")
    const res = await POST(
      new NextRequest("http://localhost/api/decks/deck-1/generate", {
        method: "POST",
        body: JSON.stringify({ sourceDocumentId: "doc-1" }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: { deckId: "deck-1" } }
    )

    expect(res.status).toBe(202)
    await expect(res.json()).resolves.toMatchObject({
      jobId: expect.any(String),
      status: "queued",
    })
    expect(mockPublishGenerateJob).toHaveBeenCalledOnce()
  })
})
