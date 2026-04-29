import Anthropic from "@anthropic-ai/sdk"

const CHUNK_CHARS = 12_000 // ≈3 000 tokens
const OVERLAP_CHARS = 800  // ≈200 tokens overlap to avoid cutting mid-concept
const MODEL_NAME = "claude-sonnet-4-6"
const MAX_RETRIES = 3
const BASE_BACKOFF_MS = 250
const SUCCESS_WARNING_THRESHOLD = 0.7

export type RawGeneratedCard = {
  question: string
  answer: string
  format: "QA" | "TRUE_FALSE" | "FILL_BLANK"
  tags: string[]
  difficulty: 1 | 2 | 3
}

export type GenerationMetadata = {
  chunksTotal: number
  chunksSucceeded: number
  chunksFailed: number
  failedChunks: Array<{
    chunkIndex: number
    model: string
    errorClass: string
    errorMessage: string
  }>
  successRatio: number
  warning?: string
  quality: GenerationQualitySummary
}

export type GenerateCardsResult = {
  cards: RawGeneratedCard[]
  metadata: GenerationMetadata
}

type QualityIssueCode =
  | "QUESTION_TOO_LONG"
  | "ANSWER_TOO_LONG"
  | "EMPTY_TAGS"
  | "DUPLICATE_SEMANTIC_OVERLAP"
  | "MALFORMED_TRUE_FALSE"
  | "MALFORMED_FILL_BLANK"

type QualityIssue = {
  code: QualityIssueCode
  detail?: string
}

type CardQualityResult = {
  isValid: boolean
  score: number
  issues: QualityIssue[]
}

export type GenerationQualitySummary = {
  totalGenerated: number
  validCards: number
  rejectedCards: number
  avgQualityScore: number
  reasons: Record<QualityIssueCode, number>
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function countWords(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length
}

function normalizeForSemanticCompare(value: string): string {
  return value.toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim()
}

function jaccardSimilarity(a: string, b: string): number {
  const aSet = new Set(normalizeForSemanticCompare(a).split(" ").filter(Boolean))
  const bSet = new Set(normalizeForSemanticCompare(b).split(" ").filter(Boolean))
  if (aSet.size === 0 || bSet.size === 0) return 0
  const intersection = [...aSet].filter((token) => bSet.has(token)).length
  const union = new Set([...aSet, ...bSet]).size
  return union === 0 ? 0 : intersection / union
}

function validateCardQuality(card: RawGeneratedCard, acceptedCards: RawGeneratedCard[]): CardQualityResult {
  const issues: QualityIssue[] = []
  let score = 100

  if (countWords(card.question) > 15) {
    issues.push({ code: "QUESTION_TOO_LONG" })
    score -= 20
  }
  if (countWords(card.answer) > 40) {
    issues.push({ code: "ANSWER_TOO_LONG" })
    score -= 20
  }
  if (card.tags.length === 0 || card.tags.some((tag) => !tag.trim())) {
    issues.push({ code: "EMPTY_TAGS" })
    score -= 15
  }

  if (card.format === "TRUE_FALSE") {
    const isTrue = /^true\.$/i.test(card.answer.trim())
    const isFalse = /^false\.\s+\S.+/.test(card.answer.trim())
    if (!isTrue && !isFalse) {
      issues.push({ code: "MALFORMED_TRUE_FALSE" })
      score -= 30
    }
  }

  if (card.format === "FILL_BLANK") {
    if (!card.question.includes("___") || /[.!?]/.test(card.answer) || countWords(card.answer) > 8) {
      issues.push({ code: "MALFORMED_FILL_BLANK" })
      score -= 30
    }
  }

  const hasSemanticOverlap = acceptedCards.some((existing) => (
    jaccardSimilarity(existing.question, card.question) >= 0.8
      || jaccardSimilarity(existing.answer, card.answer) >= 0.85
  ))
  if (hasSemanticOverlap) {
    issues.push({ code: "DUPLICATE_SEMANTIC_OVERLAP" })
    score -= 40
  }

  return { isValid: issues.length === 0 && score >= 70, score: Math.max(0, score), issues }
}

function isRetryableError(error: unknown): boolean {
  const status = typeof error === "object" && error !== null && "status" in error
    ? (error as { status?: number }).status
    : undefined

  if (typeof status === "number" && [408, 409, 425, 429, 500, 502, 503, 504].includes(status)) {
    return true
  }

  const code = typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: unknown }).code)
    : ""

  if (["ETIMEDOUT", "ECONNRESET", "ECONNREFUSED", "EAI_AGAIN", "ENOTFOUND"].includes(code)) {
    return true
  }

  const message = error instanceof Error ? error.message.toLowerCase() : ""
  return message.includes("timeout") || message.includes("rate limit") || message.includes("network")
}

// prompts/tool unchanged
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
            question: { type: "string", maxLength: 120, description: "≤15 words" },
            answer: { type: "string", maxLength: 300, description: "≤40 words. TRUE_FALSE: 'True.' or 'False. [correction]'. FILL_BLANK: missing term only." },
            format: { type: "string", enum: ["QA", "TRUE_FALSE", "FILL_BLANK"] },
            tags: { type: "array", items: { type: "string", maxLength: 20 }, maxItems: 3 },
            difficulty: { type: "integer", enum: [1, 2, 3] },
          },
          required: ["question", "answer", "format", "tags", "difficulty"],
        },
      },
    },
    required: ["cards"],
  },
}

export async function generateCardsFromText(
  text: string,
  onProgress?: (pct: number) => Promise<void>
): Promise<GenerateCardsResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured")

  const client = new Anthropic({ apiKey })
  const chunks = chunkText(text.trim())
  const allCards: RawGeneratedCard[] = []
  const qualityScores: number[] = []
  const rejectedCards: CardQualityResult[] = []
  const rejectionReasons: Record<QualityIssueCode, number> = {
    QUESTION_TOO_LONG: 0,
    ANSWER_TOO_LONG: 0,
    EMPTY_TAGS: 0,
    DUPLICATE_SEMANTIC_OVERLAP: 0,
    MALFORMED_TRUE_FALSE: 0,
    MALFORMED_FILL_BLANK: 0,
  }
  const seenQuestions = new Set<string>()
  const failedChunks: GenerationMetadata["failedChunks"] = []
  let chunksSucceeded = 0

  for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
    let response: Anthropic.Message | undefined
    let lastError: unknown

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        response = await client.messages.create({
          model: MODEL_NAME,
          max_tokens: 1500,
          system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
          tools: [FLASHCARD_TOOL],
          tool_choice: { type: "tool", name: "create_flashcards" },
          messages: [{ role: "user", content: `Extract flashcards from this excerpt:\n\n${chunks[chunkIdx]}` }],
        })
        break
      } catch (error) {
        lastError = error
        const canRetry = attempt < MAX_RETRIES - 1 && isRetryableError(error)
        if (!canRetry) break
        await sleep(BASE_BACKOFF_MS * (2 ** attempt))
      }
    }

    if (!response) {
      failedChunks.push({
        chunkIndex: chunkIdx,
        model: MODEL_NAME,
        errorClass: lastError instanceof Error ? lastError.name : "UnknownError",
        errorMessage: lastError instanceof Error ? lastError.message : "Unknown failure",
      })
      continue
    }

    const block = response.content.find((b) => b.type === "tool_use")
    if (!block || block.type !== "tool_use") continue

    const input = block.input as { cards?: unknown[] }
    if (!Array.isArray(input.cards)) continue

    chunksSucceeded += 1

    for (const item of input.cards) {
      if (typeof item !== "object" || item === null) continue
      const c = item as Record<string, unknown>
      if (typeof c.question !== "string" || typeof c.answer !== "string") continue
      if (!["QA", "TRUE_FALSE", "FILL_BLANK"].includes(c.format as string)) continue

      const key = (c.question as string).toLowerCase().replace(/\s+/g, " ").trim()
      if (seenQuestions.has(key)) continue
      seenQuestions.add(key)

      const nextCard: RawGeneratedCard = {
        question: (c.question as string).trim(),
        answer: (c.answer as string).trim(),
        format: c.format as RawGeneratedCard["format"],
        tags: Array.isArray(c.tags)
          ? (c.tags as unknown[]).filter((t): t is string => typeof t === "string").slice(0, 3)
          : [],
        difficulty: ([1, 2, 3] as const).includes(c.difficulty as 1 | 2 | 3)
          ? (c.difficulty as 1 | 2 | 3)
          : 1,
      }
      const quality = validateCardQuality(nextCard, allCards)
      qualityScores.push(quality.score)
      if (!quality.isValid) {
        rejectedCards.push(quality)
        quality.issues.forEach((issue) => {
          rejectionReasons[issue.code] += 1
        })
        continue
      }
      allCards.push(nextCard)
    }

    if (onProgress) {
      await onProgress(Math.round(((chunkIdx + 1) / chunks.length) * 100))
    }
  }

  const chunksTotal = chunks.length
  const chunksFailed = chunksTotal - chunksSucceeded
  const successRatio = chunksTotal === 0 ? 0 : chunksSucceeded / chunksTotal
  const warning = successRatio < SUCCESS_WARNING_THRESHOLD
    ? `Card generation completed with partial coverage (${chunksSucceeded}/${chunksTotal} chunks succeeded). Output may be incomplete.`
    : undefined
  const totalGenerated = allCards.length + rejectedCards.length
  const avgQualityScore = qualityScores.length === 0
    ? 0
    : Number((qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length).toFixed(1))

  if (warning) {
    console.warn(warning, { chunksTotal, chunksSucceeded, chunksFailed, failedChunks })
  }

  return {
    cards: allCards,
    metadata: {
      chunksTotal,
      chunksSucceeded,
      chunksFailed,
      failedChunks,
      successRatio,
      warning,
      quality: {
        totalGenerated,
        validCards: allCards.length,
        rejectedCards: rejectedCards.length,
        avgQualityScore,
        reasons: rejectionReasons,
      },
    },
  }
}
