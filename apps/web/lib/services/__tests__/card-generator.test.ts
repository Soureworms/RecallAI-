import { describe, it, expect, vi, beforeEach } from "vitest"

// ── Mock @anthropic-ai/sdk ─────────────────────────────────────────────────────

const mockCreate = vi.fn()
vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = { create: mockCreate }
  },
}))

import { generateCardsFromText } from "../card-generator"

function makeAnthropicResponse(text: string) {
  return {
    content: [{ type: "text", text }],
  }
}

const SAMPLE_CARD_JSON = JSON.stringify([
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
])

beforeEach(() => {
  vi.clearAllMocks()
  process.env.ANTHROPIC_API_KEY = "sk-test"
  mockCreate.mockResolvedValue(makeAnthropicResponse(SAMPLE_CARD_JSON))
})

describe("generateCardsFromText", () => {
  it("short text produces cards without chunking (single API call)", async () => {
    const text = "Customers get a 30-day refund window."
    const cards = await generateCardsFromText(text)
    expect(mockCreate).toHaveBeenCalledTimes(1)
    expect(cards.length).toBeGreaterThan(0)
  })

  it("long text (>12000 chars) is chunked into multiple API calls", async () => {
    // CHUNK_CHARS=12000, OVERLAP=800, step=11200 → 13001 chars = 2 chunks
    const text = "x".repeat(13_001)
    await generateCardsFromText(text)
    expect(mockCreate).toHaveBeenCalledTimes(2)
  })

  it("deduplicates cards with identical questions across chunks", async () => {
    // Each chunk returns the same card
    mockCreate.mockResolvedValue(makeAnthropicResponse(SAMPLE_CARD_JSON))
    const text = "x".repeat(25_000)
    const cards = await generateCardsFromText(text)
    const questions = cards.map((c) => c.question)
    const unique = new Set(questions)
    expect(unique.size).toBe(questions.length)
  })

  it("invalid JSON from API is handled gracefully (returns empty array)", async () => {
    mockCreate.mockResolvedValue(makeAnthropicResponse("NOT VALID JSON!!!"))
    const cards = await generateCardsFromText("some text")
    expect(cards).toEqual([])
  })

  it("empty document produces zero cards without throwing", async () => {
    mockCreate.mockResolvedValue(makeAnthropicResponse("[]"))
    const cards = await generateCardsFromText("")
    expect(cards).toEqual([])
  })

  it("markdown-fenced JSON response is stripped and parsed correctly", async () => {
    const fenced = "```json\n" + SAMPLE_CARD_JSON + "\n```"
    mockCreate.mockResolvedValue(makeAnthropicResponse(fenced))
    const cards = await generateCardsFromText("some text")
    expect(cards.length).toBe(2)
    expect(cards[0].question).toBe("What is the refund window?")
  })

  it("cards missing required fields are filtered out", async () => {
    const malformed = JSON.stringify([
      { question: "Valid?", answer: "Yes", format: "QA", tags: [], difficulty: 1 },
      { answer: "No question field", format: "QA", tags: [], difficulty: 1 },
      { question: "No answer field", format: "QA", tags: [], difficulty: 1 },
    ])
    mockCreate.mockResolvedValue(makeAnthropicResponse(malformed))
    const cards = await generateCardsFromText("text")
    expect(cards.length).toBe(1)
    expect(cards[0].question).toBe("Valid?")
  })
})
