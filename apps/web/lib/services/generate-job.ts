import { prisma } from "@/lib/db"
import {
  CardGenerationError,
  generateCardsFromText,
  type GenerationMetadata,
} from "@/lib/services/card-generator"

type GenerateJobInput = {
  deckId: string
  documentId: string
  orgId: string
  onProgress?: (pct: number) => Promise<void>
}

export type GenerateJobResult = {
  count: number
  warning?: string
  summary: {
    validCards: number
    rejectedCards: number
    avgQualityScore: number
    reasons: Record<string, number>
  }
}

function toGenerationQuality(metadata: GenerationMetadata) {
  return {
    chunksTotal: metadata.chunksTotal,
    chunksSucceeded: metadata.chunksSucceeded,
    chunksFailed: metadata.chunksFailed,
    failedChunks: metadata.failedChunks,
    successRatio: metadata.successRatio,
    warning: metadata.warning ?? null,
    quality: metadata.quality,
    capturedAt: new Date().toISOString(),
  }
}

async function updateGenerationQuality(documentId: string, orgId: string, metadata: GenerationMetadata) {
  await prisma.sourceDocument.update({
    where: { id: documentId, orgId },
    data: {
      generationQuality: toGenerationQuality(metadata),
    },
  })
}

export async function runGenerateJob({
  deckId,
  documentId,
  orgId,
  onProgress,
}: GenerateJobInput): Promise<GenerateJobResult> {
  const doc = await prisma.sourceDocument.findUniqueOrThrow({
    where: { id: documentId, orgId },
    select: { textContent: true },
  })

  let generated: Awaited<ReturnType<typeof generateCardsFromText>>
  try {
    generated = await generateCardsFromText(doc.textContent ?? "", onProgress)
  } catch (error) {
    if (error instanceof CardGenerationError) {
      await updateGenerationQuality(documentId, orgId, error.metadata)
    }
    throw error
  }

  const { cards: rawCards, metadata } = generated

  if (rawCards.length > 0) {
    await prisma.$transaction(
      rawCards.map((c) =>
        prisma.card.create({
          data: {
            deckId,
            sourceDocumentId: documentId,
            question: c.question,
            answer: c.answer,
            format: c.format,
            tags: c.tags,
            difficulty: c.difficulty,
            status: "DRAFT",
          },
        })
      )
    )
  }

  await updateGenerationQuality(documentId, orgId, metadata)

  if (rawCards.length === 0) {
    const rejectedCards = metadata.quality.rejectedCards
    const reasons = Object.entries(metadata.quality.reasons)
      .filter(([, count]) => count > 0)
      .map(([reason, count]) => `${reason}: ${count}`)
      .join(", ")
    throw new Error(
      rejectedCards > 0
        ? `AI generated ${rejectedCards} cards, but none passed quality checks (${reasons || "no reason recorded"}).`
        : "AI generation completed but produced no cards."
    )
  }

  return {
    count: rawCards.length,
    warning: metadata.warning,
    summary: {
      validCards: metadata.quality.validCards,
      rejectedCards: metadata.quality.rejectedCards,
      avgQualityScore: metadata.quality.avgQualityScore,
      reasons: metadata.quality.reasons,
    },
  }
}
