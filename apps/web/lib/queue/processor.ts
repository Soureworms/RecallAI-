import { Worker, type Job } from "bullmq"
import IORedis from "ioredis"
import { generateCardsFromText } from "@/lib/services/card-generator"
import { prisma } from "@/lib/db"
import type { GenerateJobData, GenerateJobResult } from "@/lib/queue/ai-queue"

async function processJob(
  job: Job<GenerateJobData, GenerateJobResult>
): Promise<GenerateJobResult> {
  const { deckId, documentId, orgId } = job.data

  const doc = await prisma.sourceDocument.findUniqueOrThrow({
    where: { id: documentId, orgId },
    select: { textContent: true },
  })
  await job.updateProgress(10)

  const rawCards = await generateCardsFromText(
    doc.textContent ?? "",
    async (pct) => {
      // Map 0–100% chunk progress into the 10–80% window of the overall job
      await job.updateProgress(10 + Math.round(pct * 0.7))
    }
  )
  await job.updateProgress(80)

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

  await job.updateProgress(100)
  return { count: rawCards.length }
}

export function createWorker(redisUrl: string): Worker<GenerateJobData, GenerateJobResult> {
  const conn = new IORedis(redisUrl, { maxRetriesPerRequest: null })

  const worker = new Worker<GenerateJobData, GenerateJobResult>(
    "card-generation",
    processJob,
    {
      connection: conn,
      concurrency: 3,
      limiter: { max: 30, duration: 60_000 },
    }
  )

  worker.on("completed", (job, result) => {
    console.log(`[worker] Job ${job.id} completed — ${result.count} cards created`)
  })

  worker.on("failed", (job, err) => {
    console.error(`[worker] Job ${job?.id} failed:`, err.message)
  })

  return worker
}
