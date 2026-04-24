import Anthropic from "@anthropic-ai/sdk"

const CHUNK_CHARS = 12_000 // ≈3 000 tokens
const OVERLAP_CHARS = 800 // ≈200 tokens

export type RawGeneratedCard = {
  question: string
  answer: string
  format: "QA" | "TRUE_FALSE" | "FILL_BLANK"
  tags: string[]
  difficulty: 1 | 2 | 3
}

function chunkText(text: string): string[] {
  if (text.length <= CHUNK_CHARS) return [text]
  const chunks: string[] = []
  let i = 0
  while (i < text.length) {
    chunks.push(text.slice(i, i + CHUNK_CHARS))
    i += CHUNK_CHARS - OVERLAP_CHARS
  }
  return chunks
}

const SYSTEM_PROMPT = `You are an expert instructional designer creating flashcards for customer experience (CX) team training.

Given a document excerpt, generate flashcards as a JSON array. Each item must have:
- "question": a clear, specific question (string)
- "answer": a concise, complete answer (string)
- "format": one of "QA", "TRUE_FALSE", or "FILL_BLANK" (string)
- "tags": array of topic tag strings (string[])
- "difficulty": 1 (easy recall), 2 (requires understanding), or 3 (complex scenario) (number)

Types of questions to generate:
- Factual recall: "What is the refund window for Premium plans?"
- Procedural: "What are the steps to escalate a billing dispute?"
- Scenario: "A customer says they were charged twice. What should you do first?"

Rules:
- Do NOT ask about page numbers, headers, footers, or document structure
- Focus only on facts, policies, and procedures a CX agent needs to know
- Use TRUE_FALSE only for clear binary facts
- Use FILL_BLANK for key terms, thresholds, or values worth memorising
- Aim for 5-10 cards per excerpt; fewer is fine if content is sparse

Respond with ONLY a valid JSON array — no markdown fences, no explanation.`

function parseCards(raw: string): RawGeneratedCard[] {
  // Strip markdown code fences if present
  const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim()
  const parsed = JSON.parse(cleaned) as unknown[]
  if (!Array.isArray(parsed)) return []

  const cards: RawGeneratedCard[] = []
  for (const item of parsed) {
    if (typeof item !== "object" || item === null) continue
    const c = item as Record<string, unknown>
    if (typeof c.question !== "string" || typeof c.answer !== "string") continue
    if (!["QA", "TRUE_FALSE", "FILL_BLANK"].includes(c.format as string)) continue

    cards.push({
      question: (c.question as string).trim(),
      answer: (c.answer as string).trim(),
      format: c.format as "QA" | "TRUE_FALSE" | "FILL_BLANK",
      tags: Array.isArray(c.tags)
        ? (c.tags as unknown[]).filter((t): t is string => typeof t === "string")
        : [],
      difficulty: ([1, 2, 3] as const).includes(c.difficulty as 1 | 2 | 3)
        ? (c.difficulty as 1 | 2 | 3)
        : 1,
    })
  }
  return cards
}

export async function generateCardsFromText(
  text: string,
  onProgress?: (pct: number) => Promise<void>
): Promise<RawGeneratedCard[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured")

  const client = new Anthropic({ apiKey })
  const chunks = chunkText(text.trim())
  const allCards: RawGeneratedCard[] = []
  const seenQuestions = new Set<string>()

  for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
    const chunk = chunks[chunkIdx]
    let response: Anthropic.Message
    try {
      response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        system: [
          {
            type: "text",
            text: SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [
          {
            role: "user",
            content: `Generate flashcards from this training document excerpt:\n\n${chunk}`,
          },
        ],
      })
    } catch {
      continue
    }

    const block = response.content[0]
    if (block.type !== "text") continue

    let cards: RawGeneratedCard[]
    try {
      cards = parseCards(block.text)
    } catch {
      continue
    }

    for (const card of cards) {
      const key = card.question.toLowerCase().replace(/\s+/g, " ")
      if (seenQuestions.has(key)) continue
      seenQuestions.add(key)
      allCards.push(card)
    }

    if (onProgress) {
      await onProgress(Math.round(((chunkIdx + 1) / chunks.length) * 100))
    }
  }

  return allCards
}
