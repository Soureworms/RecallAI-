import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("../ai-usage", () => ({
  recordOpenAIUsage: vi.fn(),
}))

import { generateCardsFromText } from "../card-generator"

const mockFetch = vi.fn()
global.fetch = mockFetch

function makeOpenAIResponse(cards: unknown[]) {
  return {
    ok: true,
    json: async () => ({
      id: "chatcmpl-test",
      choices: [{ message: { content: JSON.stringify({ cards }) } }],
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
    }),
  }
}

const SAMPLE_CARDS = [
  {
    question: "What is the refund window?",
    answer: "30 days",
    format: "QA",
    tags: ["refund", "policy"],
    difficulty: 1,
  },
  {
    question: "Premium plans include priority support.",
    answer: "True.",
    format: "TRUE_FALSE",
    tags: ["premium"],
    difficulty: 1,
  },
]

beforeEach(() => {
  vi.clearAllMocks()
  process.env.OPENAI_API_KEY = "sk-test"
  mockFetch.mockResolvedValue(makeOpenAIResponse(SAMPLE_CARDS))
})

describe("generateCardsFromText", () => {
  it("returns cards and metadata for a successful single chunk", async () => {
    const result = await generateCardsFromText("Customers get a 30-day refund window.")

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(result.cards.length).toBe(2)
    expect(result.metadata).toMatchObject({
      chunksTotal: 1,
      chunksSucceeded: 1,
      chunksFailed: 0,
      successRatio: 1,
      quality: {
        totalGenerated: 2,
        validCards: 2,
        rejectedCards: 0,
      },
    })
  })

  it("uses a strict OpenAI JSON schema with additionalProperties disabled", async () => {
    await generateCardsFromText("Customers get a 30-day refund window.")

    const request = JSON.parse(mockFetch.mock.calls[0][1].body as string)
    const schema = request.response_format.json_schema.schema

    expect(schema.additionalProperties).toBe(false)
    expect(schema.properties.cards.items.additionalProperties).toBe(false)
  })

  it("retries transient failures and eventually succeeds", async () => {
    const timeoutError = Object.assign(new Error("network timeout"), { code: "ETIMEDOUT" })
    mockFetch
      .mockRejectedValueOnce(timeoutError)
      .mockRejectedValueOnce(timeoutError)
      .mockResolvedValueOnce(makeOpenAIResponse(SAMPLE_CARDS))

    const result = await generateCardsFromText("single chunk")

    expect(mockFetch).toHaveBeenCalledTimes(3)
    expect(result.metadata.chunksSucceeded).toBe(1)
    expect(result.metadata.chunksFailed).toBe(0)
  })

  it("captures structured failures and emits warning when success ratio is below threshold", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

    mockFetch
      .mockResolvedValueOnce(makeOpenAIResponse(SAMPLE_CARDS))
      .mockRejectedValue(new Error("upstream unavailable"))

    const text = "x".repeat(25_000) // 3 chunks
    const result = await generateCardsFromText(text)

    expect(result.metadata.chunksTotal).toBe(3)
    expect(result.metadata.chunksSucceeded).toBe(1)
    expect(result.metadata.chunksFailed).toBe(2)
    expect(result.metadata.failedChunks).toHaveLength(2)
    expect(result.metadata.failedChunks[0]).toMatchObject({
      chunkIndex: 1,
      model: "gpt-4.1-mini",
      errorClass: "Error",
      errorMessage: "upstream unavailable",
    })
    expect(result.metadata.warning).toContain("Output may be incomplete")
    expect(warnSpy).toHaveBeenCalledOnce()

    warnSpy.mockRestore()
  })

  it("throws when every chunk fails to generate cards", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => "invalid schema",
    })

    await expect(generateCardsFromText("single chunk")).rejects.toThrow("Card generation failed for every document chunk")
  })

  it("deduplicates cards with identical questions across chunks", async () => {
    mockFetch.mockResolvedValue(makeOpenAIResponse(SAMPLE_CARDS))

    const result = await generateCardsFromText("x".repeat(25_000))
    const questions = result.cards.map((c) => c.question)

    expect(new Set(questions).size).toBe(questions.length)
  })

  it("rejects malformed TRUE_FALSE and FILL_BLANK cards", async () => {
    mockFetch.mockResolvedValue(makeOpenAIResponse([
      { question: "All free plans have SSO access.", answer: "maybe", format: "TRUE_FALSE", tags: ["plans"], difficulty: 1 },
      { question: "The SLA target is ___", answer: "The SLA target is 4 hours.", format: "FILL_BLANK", tags: ["sla"], difficulty: 1 },
    ]))

    const result = await generateCardsFromText("single chunk")
    expect(result.cards).toHaveLength(0)
    expect(result.metadata.quality.rejectedCards).toBe(2)
    expect(result.metadata.quality.reasons.MALFORMED_TRUE_FALSE).toBe(1)
    expect(result.metadata.quality.reasons.MALFORMED_FILL_BLANK).toBe(1)
  })

  it("rejects duplicate-heavy outputs based on semantic overlap", async () => {
    mockFetch.mockResolvedValue(makeOpenAIResponse([
      { question: "What is the refund window?", answer: "30 days", format: "QA", tags: ["refund"], difficulty: 1 },
      { question: "What is refund window", answer: "30 day period", format: "QA", tags: ["refund"], difficulty: 1 },
      { question: "How long is the refund window?", answer: "30 days", format: "QA", tags: ["refund"], difficulty: 1 },
    ]))

    const result = await generateCardsFromText("single chunk")
    expect(result.cards).toHaveLength(1)
    expect(result.metadata.quality.rejectedCards).toBe(2)
    expect(result.metadata.quality.reasons.DUPLICATE_SEMANTIC_OVERLAP).toBeGreaterThanOrEqual(1)
  })
})
