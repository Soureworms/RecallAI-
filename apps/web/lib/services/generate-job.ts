import { prisma } from "@/lib/db"
import { generateCardsFromText } from "@/lib/services/card-generator"

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

  const { cards: rawCards, metadata } = await generateCardsFromText(doc.textContent ?? "", onProgress)

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

  await prisma.sourceDocument.update({
    where: { id: documentId, orgId },
    data: {
      generationQuality: {
        chunksTotal: metadata.chunksTotal,
        chunksSucceeded: metadata.chunksSucceeded,
        chunksFailed: metadata.chunksFailed,
        successRatio: metadata.successRatio,
        warning: metadata.warning ?? null,
        quality: metadata.quality,
        capturedAt: new Date().toISOString(),
      },
    },
  })

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
