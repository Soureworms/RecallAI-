import { recordOpenAIUsage } from "@/lib/services/ai-usage"

const CHUNK_CHARS = 12_000 // ≈3 000 tokens
const OVERLAP_CHARS = 800  // ≈200 tokens overlap to avoid cutting mid-concept
const MODEL_NAME = process.env.OPENAI_MODEL || "gpt-4.1-mini"
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

export class CardGenerationError extends Error {
  metadata: GenerationMetadata

  constructor(message: string, metadata: GenerationMetadata) {
    super(message)
    this.name = "CardGenerationError"
    this.metadata = metadata
  }
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
  const aTokens = Array.from(aSet)
  const bTokens = Array.from(bSet)
  const intersection = aTokens.filter((token) => bSet.has(token)).length
  const union = new Set([...aTokens, ...bTokens]).size
  return union === 0 ? 0 : intersection / union
}

function validateCardQuality(card: RawGeneratedCard, acceptedCards: RawGeneratedCard[]): CardQualityResult {
  const issues: QualityIssue[] = []
  let score = 100
  if (countWords(card.question) > 15) { issues.push({ code: "QUESTION_TOO_LONG" }); score -= 20 }
  if (countWords(card.answer) > 40) { issues.push({ code: "ANSWER_TOO_LONG" }); score -= 20 }
  if (card.tags.length === 0 || card.tags.some((tag) => !tag.trim())) { issues.push({ code: "EMPTY_TAGS" }); score -= 15 }
  if (card.format === "TRUE_FALSE") {
    const isTrue = /^true\.$/i.test(card.answer.trim())
    const isFalse = /^false\.\s+\S.+/.test(card.answer.trim())
    if (!isTrue && !isFalse) { issues.push({ code: "MALFORMED_TRUE_FALSE" }); score -= 30 }
  }
  if (card.format === "FILL_BLANK") {
    if (!card.question.includes("___") || /[.!?]/.test(card.answer) || countWords(card.answer) > 8) {
      issues.push({ code: "MALFORMED_FILL_BLANK" }); score -= 30
    }
  }
  const hasSemanticOverlap = acceptedCards.some((existing) => (
    jaccardSimilarity(existing.question, card.question) >= 0.8 || jaccardSimilarity(existing.answer, card.answer) >= 0.85
  ))
  if (hasSemanticOverlap) { issues.push({ code: "DUPLICATE_SEMANTIC_OVERLAP" }); score -= 40 }
  return { isValid: issues.length === 0 && score >= 70, score: Math.max(0, score), issues }
}

function isRetryableError(error: unknown): boolean {
  const status = typeof error === "object" && error !== null && "status" in error
    ? (error as { status?: number }).status
    : undefined
  if (typeof status === "number" && [408, 409, 425, 429, 500, 502, 503, 504].includes(status)) return true
  const message = error instanceof Error ? error.message.toLowerCase() : ""
  return message.includes("timeout") || message.includes("rate limit") || message.includes("network")
}

const SYSTEM_PROMPT = `You create training flashcards that must fit on a small mobile screen. Return only JSON matching schema.`

type OpenAIUsage = { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
type OpenAIChunkResult = { cards?: unknown[]; usage?: OpenAIUsage; requestId?: string }

async function requestOpenAI(apiKey: string, chunk: string): Promise<OpenAIChunkResult> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL_NAME,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Extract flashcards from this excerpt:\n\n${chunk}` },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "flashcards",
          schema: {
            type: "object",
            properties: {
              cards: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    question: { type: "string" },
                    answer: { type: "string" },
                    format: { type: "string", enum: ["QA", "TRUE_FALSE", "FILL_BLANK"] },
                    tags: { type: "array", items: { type: "string" } },
                    difficulty: { type: "integer", enum: [1, 2, 3] },
                  },
                  required: ["question", "answer", "format", "tags", "difficulty"],
                  additionalProperties: false,
                },
              },
            },
            required: ["cards"],
            additionalProperties: false,
          },
          strict: true,
        },
      },
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    const err = new Error(`OpenAI request failed: ${res.status} ${body}`) as Error & { status?: number }
    err.status = res.status
    throw err
  }

  const data = await res.json() as {
    id?: string
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = data.choices?.[0]?.message?.content
  if (!content) return {}
  return { ...(JSON.parse(content) as { cards?: unknown[] }), usage: data.usage, requestId: data.id }
}

export async function generateCardsFromText(text: string, onProgress?: (pct: number) => Promise<void>): Promise<GenerateCardsResult> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured")
  const chunks = chunkText(text.trim())
  const allCards: RawGeneratedCard[] = []
  const qualityScores: number[] = []
  const rejectedCards: CardQualityResult[] = []
  const rejectionReasons: Record<QualityIssueCode, number> = { QUESTION_TOO_LONG: 0, ANSWER_TOO_LONG: 0, EMPTY_TAGS: 0, DUPLICATE_SEMANTIC_OVERLAP: 0, MALFORMED_TRUE_FALSE: 0, MALFORMED_FILL_BLANK: 0 }
  const seenQuestions = new Set<string>()
  const failedChunks: GenerationMetadata["failedChunks"] = []
  let chunksSucceeded = 0

  for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
    let input: OpenAIChunkResult | undefined
    let lastError: unknown
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try { input = await requestOpenAI(apiKey, chunks[chunkIdx]); break } catch (error) {
        lastError = error
        const canRetry = attempt < MAX_RETRIES - 1 && isRetryableError(error)
        if (!canRetry) break
        await sleep(BASE_BACKOFF_MS * (2 ** attempt))
      }
    }
    if (!input) {
      failedChunks.push({ chunkIndex: chunkIdx, model: MODEL_NAME, errorClass: lastError instanceof Error ? lastError.name : "UnknownError", errorMessage: lastError instanceof Error ? lastError.message : "Unknown failure" })
      continue
    }
    if (!Array.isArray(input.cards)) continue
    await recordOpenAIUsage({
      model: MODEL_NAME,
      operation: "card_generation",
      promptTokens: input.usage?.prompt_tokens ?? 0,
      completionTokens: input.usage?.completion_tokens ?? 0,
      totalTokens: input.usage?.total_tokens ?? 0,
      requestId: input.requestId,
      metadata: { chunkIndex: chunkIdx, chunkCount: chunks.length },
    })
    chunksSucceeded += 1
    for (const item of input.cards) {
      if (typeof item !== "object" || item === null) continue
      const c = item as Record<string, unknown>
      if (typeof c.question !== "string" || typeof c.answer !== "string") continue
      if (!["QA", "TRUE_FALSE", "FILL_BLANK"].includes(c.format as string)) continue
      const key = (c.question as string).toLowerCase().replace(/\s+/g, " ").trim()
      if (seenQuestions.has(key)) continue
      seenQuestions.add(key)
      const nextCard: RawGeneratedCard = { question: (c.question as string).trim(), answer: (c.answer as string).trim(), format: c.format as RawGeneratedCard["format"], tags: Array.isArray(c.tags) ? (c.tags as unknown[]).filter((t): t is string => typeof t === "string").slice(0, 3) : [], difficulty: ([1, 2, 3] as const).includes(c.difficulty as 1 | 2 | 3) ? (c.difficulty as 1 | 2 | 3) : 1 }
      const quality = validateCardQuality(nextCard, allCards)
      qualityScores.push(quality.score)
      if (!quality.isValid) { rejectedCards.push(quality); quality.issues.forEach((issue) => { rejectionReasons[issue.code] += 1 }); continue }
      allCards.push(nextCard)
    }
    if (onProgress) await onProgress(Math.round(((chunkIdx + 1) / chunks.length) * 100))
  }

  const chunksTotal = chunks.length
  const chunksFailed = chunksTotal - chunksSucceeded
  const successRatio = chunksTotal === 0 ? 0 : chunksSucceeded / chunksTotal
  const warning = successRatio < SUCCESS_WARNING_THRESHOLD ? `Card generation completed with partial coverage (${chunksSucceeded}/${chunksTotal} chunks succeeded). Output may be incomplete.` : undefined
  const totalGenerated = allCards.length + rejectedCards.length
  const avgQualityScore = qualityScores.length === 0 ? 0 : Number((qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length).toFixed(1))
  if (warning) console.warn(warning, { chunksTotal, chunksSucceeded, chunksFailed, failedChunks })
  const metadata = { chunksTotal, chunksSucceeded, chunksFailed, failedChunks, successRatio, warning, quality: { totalGenerated, validCards: allCards.length, rejectedCards: rejectedCards.length, avgQualityScore, reasons: rejectionReasons } }
  if (chunksSucceeded === 0) {
    const firstError = failedChunks[0]?.errorMessage ? ` First error: ${failedChunks[0].errorMessage}` : ""
    throw new CardGenerationError(`Card generation failed for every document chunk.${firstError}`, metadata)
  }
  return { cards: allCards, metadata }
}
