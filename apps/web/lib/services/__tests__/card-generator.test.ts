import { describe, it, expect, vi, beforeEach } from "vitest"

const mockCreate = vi.fn()
vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = { create: mockCreate }
  },
}))

import { generateCardsFromText } from "../card-generator"

function makeAnthropicResponse(cards: unknown[]) {
  return {
    content: [{ type: "tool_use", input: { cards } }],
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
    answer: "True",
    format: "TRUE_FALSE",
    tags: ["premium"],
    difficulty: 1,
  },
]

beforeEach(() => {
  vi.clearAllMocks()
  process.env.ANTHROPIC_API_KEY = "sk-test"
  mockCreate.mockResolvedValue(makeAnthropicResponse(SAMPLE_CARDS))
})

describe("generateCardsFromText", () => {
  it("returns cards and metadata for a successful single chunk", async () => {
    const result = await generateCardsFromText("Customers get a 30-day refund window.")

    expect(mockCreate).toHaveBeenCalledTimes(1)
    expect(result.cards.length).toBe(2)
    expect(result.metadata).toMatchObject({
      chunksTotal: 1,
      chunksSucceeded: 1,
      chunksFailed: 0,
      successRatio: 1,
    })
  })

  it("retries transient failures and eventually succeeds", async () => {
    const timeoutError = Object.assign(new Error("network timeout"), { code: "ETIMEDOUT" })
    mockCreate
      .mockRejectedValueOnce(timeoutError)
      .mockRejectedValueOnce(timeoutError)
      .mockResolvedValueOnce(makeAnthropicResponse(SAMPLE_CARDS))

    const result = await generateCardsFromText("single chunk")

    expect(mockCreate).toHaveBeenCalledTimes(3)
    expect(result.metadata.chunksSucceeded).toBe(1)
    expect(result.metadata.chunksFailed).toBe(0)
  })

  it("captures structured failures and emits warning when success ratio is below threshold", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

    mockCreate
      .mockResolvedValueOnce(makeAnthropicResponse(SAMPLE_CARDS))
      .mockRejectedValue(new Error("upstream unavailable"))

    const text = "x".repeat(25_000) // 3 chunks
    const result = await generateCardsFromText(text)

    expect(result.metadata.chunksTotal).toBe(3)
    expect(result.metadata.chunksSucceeded).toBe(1)
    expect(result.metadata.chunksFailed).toBe(2)
    expect(result.metadata.failedChunks).toHaveLength(2)
    expect(result.metadata.failedChunks[0]).toMatchObject({
      chunkIndex: 1,
      model: "claude-sonnet-4-6",
      errorClass: "Error",
      errorMessage: "upstream unavailable",
    })
    expect(result.metadata.warning).toContain("Output may be incomplete")
    expect(warnSpy).toHaveBeenCalledOnce()

    warnSpy.mockRestore()
  })

  it("deduplicates cards with identical questions across chunks", async () => {
    mockCreate.mockResolvedValue(makeAnthropicResponse(SAMPLE_CARDS))

    const result = await generateCardsFromText("x".repeat(25_000))
    const questions = result.cards.map((c) => c.question)

    expect(new Set(questions).size).toBe(questions.length)
  })
})
