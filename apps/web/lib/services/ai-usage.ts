import { prisma } from "@/lib/db"
import type { Prisma } from "@prisma/client"

type UsageInput = {
  model: string
  operation: string
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
  orgId?: string
  userId?: string
  deckId?: string
  sourceDocumentId?: string
  requestId?: string
  metadata?: Record<string, unknown>
}

const PRICE_PER_1M_TOKENS: Record<string, { input: number; output: number }> = {
  "gpt-4.1-mini": { input: 0.4, output: 1.6 },
  "gpt-4.1": { input: 2.0, output: 8.0 },
}

function costUsd(tokens: number, perMillion: number): number {
  return Number(((tokens / 1_000_000) * perMillion).toFixed(6))
}

export function estimateCosts(model: string, promptTokens = 0, completionTokens = 0) {
  const pricing = PRICE_PER_1M_TOKENS[model]
  if (!pricing) return { inputCostUsd: null, outputCostUsd: null, totalCostUsd: null }
  const inputCostUsd = costUsd(promptTokens, pricing.input)
  const outputCostUsd = costUsd(completionTokens, pricing.output)
  return {
    inputCostUsd,
    outputCostUsd,
    totalCostUsd: Number((inputCostUsd + outputCostUsd).toFixed(6)),
  }
}

export async function recordOpenAIUsage(input: UsageInput) {
  const promptTokens = input.promptTokens ?? 0
  const completionTokens = input.completionTokens ?? 0
  const totalTokens = input.totalTokens ?? promptTokens + completionTokens
  const costs = estimateCosts(input.model, promptTokens, completionTokens)

  return prisma.aIUsageEvent.create({
    data: {
      provider: "openai",
      model: input.model,
      operation: input.operation,
      orgId: input.orgId,
      userId: input.userId,
      deckId: input.deckId,
      sourceDocumentId: input.sourceDocumentId,
      requestId: input.requestId,
      promptTokens,
      completionTokens,
      totalTokens,
      inputCostUsd: costs.inputCostUsd,
      outputCostUsd: costs.outputCostUsd,
      totalCostUsd: costs.totalCostUsd,
      metadata: input.metadata as Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue | undefined,
    },
  })
}
