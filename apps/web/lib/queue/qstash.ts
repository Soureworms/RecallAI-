import { Client } from "@upstash/qstash"

export type GenerateJobData = {
  jobId: string
  deckId: string
  documentId: string
  orgId: string
}

export type JobState = {
  state: "queued" | "active" | "completed" | "failed"
  progress: number
  orgId: string   // stored so the jobs endpoint can verify the caller's org
  count?: number
  error?: string
  requestId?: string
  warning?: string
  summary?: {
    validCards: number
    rejectedCards: number
    avgQualityScore: number
    reasons: Record<string, number>
  }
}

// QStash delivers messages to your endpoint — no persistent worker needed.
// Rate limiting is handled by QStash's parallelism config (set in the dashboard).
export async function publishGenerateJob(
  data: GenerateJobData
): Promise<void> {
  const token = process.env.QSTASH_TOKEN
  if (!token) throw new Error("QSTASH_TOKEN is not configured")

  const baseUrl = process.env.NEXTAUTH_URL
  if (!baseUrl) throw new Error("NEXTAUTH_URL is not configured")

  const client = new Client({
    token,
    ...(process.env.QSTASH_URL ? { baseUrl: process.env.QSTASH_URL } : {}),
  })
  await client.publishJSON({
    url: `${baseUrl}/api/queue/generate`,
    body: data,
    retries: 3,
  })
}
