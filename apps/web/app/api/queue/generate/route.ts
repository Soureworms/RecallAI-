import { NextRequest, NextResponse } from "next/server"
import { Receiver } from "@upstash/qstash"
import { Redis } from "@upstash/redis"
import type { GenerateJobData, JobState } from "@/lib/queue/qstash"
import { env } from "@/lib/env"
import { runGenerateJob } from "@/lib/services/generate-job"
import { apiErrorResponse, getRequestId } from "@/lib/api/observability"

// QStash calls this endpoint when a job is ready to process.
// Signature verification ensures only QStash can trigger generation.
export async function POST(req: NextRequest) {
  const requestId = getRequestId(req)
  const currentKey = env.QSTASH_CURRENT_SIGNING_KEY
  const nextKey = env.QSTASH_NEXT_SIGNING_KEY

  if (!currentKey || !nextKey) {
    return NextResponse.json({ error: "QStash signing keys not configured" }, { status: 503 })
  }

  const receiver = new Receiver({ currentSigningKey: currentKey, nextSigningKey: nextKey })
  const rawBody = await req.text()

  const isValid = await receiver.verify({
    signature: req.headers.get("upstash-signature") ?? "",
    body: rawBody,
  }).catch(() => false)

  if (!isValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  const { jobId, deckId, documentId, orgId } = JSON.parse(rawBody) as GenerateJobData

  const redis = new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  })

  async function setStatus(patch: Partial<JobState>) {
    const current = (await redis.get<JobState>(`job:${jobId}`)) ?? {
      state: "active" as const,
      progress: 0,
      orgId,
    }
    await redis.setex(`job:${jobId}`, 3600, { ...current, ...patch })
  }

  try {
    await setStatus({ state: "active", progress: 5 })

    const result = await runGenerateJob({
      deckId,
      documentId,
      orgId,
      onProgress: async (pct) => {
        await setStatus({ progress: 10 + Math.round(pct * 0.7) })
      },
    })
    await setStatus({ progress: 85 })

    await redis.setex(`job:${jobId}`, 3600, {
      state: "completed",
      progress: 100,
      orgId,
      count: result.count,
      warning: result.warning,
      summary: result.summary,
    } satisfies JobState)

    return NextResponse.json({ ok: true })
  } catch (err) {
    const error = err instanceof Error ? err.message : "Generation failed"
    await redis.setex(`job:${jobId}`, 3600, {
      state: "failed",
      progress: 0,
      orgId,
      error,
      requestId,
    } satisfies JobState)

    // Return 500 so QStash retries the job automatically
    return apiErrorResponse(req, {
      code: "CARD_GENERATION_JOB_FAILED",
      status: 500,
      message: error,
      requestId,
      cause: err,
      context: { jobId, deckId, documentId },
    })
  }
}
