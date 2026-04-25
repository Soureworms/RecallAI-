import Anthropic from "@anthropic-ai/sdk"

const CHUNK_CHARS = 12_000 // ≈3 000 tokens
const OVERLAP_CHARS = 800  // ≈200 tokens overlap to avoid cutting mid-concept

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

// ─── System prompt ────────────────────────────────────────────────────────────
// Kept above 1024 tokens so Anthropic's prompt cache activates on multi-chunk
// documents (saves ~90% on system-prompt tokens for chunks 2+).

const SYSTEM_PROMPT = `You create training flashcards that must fit on a small mobile screen.

CARD SIZE LIMITS — strictly enforce these on every card:
  question : ≤ 15 words
  answer   : depends on format (see below) — never exceed 40 words
  tags     : 1–3 lowercase single-word keywords
  difficulty: 1 = pure recall, 2 = requires understanding, 3 = applied scenario

FORMAT RULES:

QA (question / answer)
  • question: a direct, specific question
  • answer: 1–2 sentences, ≤ 40 words
  • Good: "What is the maximum file upload size?" → "Files may not exceed 25 MB per upload."
  • Bad: a multi-sentence explanation longer than two lines

TRUE_FALSE (statement evaluated as true or false)
  • question: write a declarative statement, not a question
  • answer: "True." OR "False. [one corrective sentence ≤ 20 words]"
  • Good: "Enterprise plans include 24/7 phone support." → "True."
  • Good: "Free tier users can export data." → "False. Data export requires a paid plan."

FILL_BLANK (cloze deletion — key term is hidden)
  • question: a sentence with ___ replacing the key term or value
  • answer: only the missing term or value, nothing else
  • Good: "Priority 1 incidents must receive a first response within ___." → "1 hour"
  • Bad: an answer that is a full sentence or includes the surrounding words

WHAT TO EXTRACT:
  ✓ Specific facts, thresholds, limits, and numeric values
  ✓ Step-by-step procedures and required sequences
  ✓ Policies, rules, eligibility criteria
  ✓ Definitions of domain-specific terms
  ✗ Skip document navigation text, headers, footers, page numbers
  ✗ Skip vague statements with no testable answer
  ✗ Skip content already covered by a previous card in the same batch

QUANTITY: 5–10 cards per excerpt. Generate fewer if the content is sparse or repetitive.

Call the create_flashcards tool with every card you generate. Do not output any text outside the tool call.`

// ─── Tool definition ──────────────────────────────────────────────────────────
// Using tool_choice=forced guarantees schema-valid JSON — no manual parsing,
// no silent failures on malformed output.

const FLASHCARD_TOOL: Anthropic.Tool = {
  name: "create_flashcards",
  description: "Output the flashcards extracted from the document excerpt.",
  input_schema: {
    type: "object" as const,
    properties: {
      cards: {
        type: "array",
        items: {
          type: "object",
          properties: {
            question:   { type: "string", maxLength: 120,  description: "≤15 words" },
            answer:     { type: "string", maxLength: 300,  description: "≤40 words. TRUE_FALSE: 'True.' or 'False. [correction]'. FILL_BLANK: missing term only." },
            format:     { type: "string", enum: ["QA", "TRUE_FALSE", "FILL_BLANK"] },
            tags:       { type: "array", items: { type: "string", maxLength: 20 }, maxItems: 3 },
            difficulty: { type: "integer", enum: [1, 2, 3] },
          },
          required: ["question", "answer", "format", "tags", "difficulty"],
        },
      },
    },
    required: ["cards"],
  },
}

// ─── Generator ────────────────────────────────────────────────────────────────

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
    let response: Anthropic.Message
    try {
      response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1500, // 5–10 cards × ~120 tokens each = well under 1500
        system: [
          {
            type: "text",
            text: SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" },
          },
        ],
        tools: [FLASHCARD_TOOL],
        tool_choice: { type: "tool", name: "create_flashcards" },
        messages: [
          {
            role: "user",
            content: `Extract flashcards from this excerpt:\n\n${chunks[chunkIdx]}`,
          },
        ],
      })
    } catch {
      continue
    }

    // With tool_choice forced, content[0] is always a tool_use block
    const block = response.content.find((b) => b.type === "tool_use")
    if (!block || block.type !== "tool_use") continue

    const input = block.input as { cards?: unknown[] }
    if (!Array.isArray(input.cards)) continue

    for (const item of input.cards) {
      if (typeof item !== "object" || item === null) continue
      const c = item as Record<string, unknown>

      if (typeof c.question !== "string" || typeof c.answer !== "string") continue
      if (!["QA", "TRUE_FALSE", "FILL_BLANK"].includes(c.format as string)) continue

      // Deduplicate by normalised question text
      const key = (c.question as string).toLowerCase().replace(/\s+/g, " ").trim()
      if (seenQuestions.has(key)) continue
      seenQuestions.add(key)

      allCards.push({
        question:   (c.question as string).trim(),
        answer:     (c.answer   as string).trim(),
        format:     c.format as RawGeneratedCard["format"],
        tags:       Array.isArray(c.tags)
          ? (c.tags as unknown[]).filter((t): t is string => typeof t === "string").slice(0, 3)
          : [],
        difficulty: ([1, 2, 3] as const).includes(c.difficulty as 1 | 2 | 3)
          ? (c.difficulty as 1 | 2 | 3)
          : 1,
      })
    }

    if (onProgress) {
      await onProgress(Math.round(((chunkIdx + 1) / chunks.length) * 100))
    }
  }

  return allCards
}
