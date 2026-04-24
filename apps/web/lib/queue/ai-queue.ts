import { Queue } from "bullmq"
import { getRedis } from "@/lib/redis"

export type GenerateJobData = {
  deckId: string
  documentId: string
  orgId: string
}

export type GenerateJobResult = {
  count: number
}

const g = globalThis as unknown as {
  _aiQueue?: Queue<GenerateJobData, GenerateJobResult>
}

export function getAiQueue(): Queue<GenerateJobData, GenerateJobResult> {
  if (!g._aiQueue) {
    const conn = getRedis()
    if (!conn) throw new Error("REDIS_URL is required for the AI job queue")
    g._aiQueue = new Queue<GenerateJobData, GenerateJobResult>("card-generation", {
      connection: conn,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: { age: 3600 },
        removeOnFail: { age: 86400 },
      },
    })
  }
  return g._aiQueue
}
