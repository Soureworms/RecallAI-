import { NextRequest, NextResponse } from "next/server"
import { requireDeckContentManager, requireRole } from "@/lib/auth/permissions"
import { prisma } from "@/lib/db"
import { getRedis } from "@/lib/redis"
import { publishGenerateJob, type JobState } from "@/lib/queue/qstash"
import { withHandler } from "@/lib/api/handler"
import { apiErrorResponse, getRequestId, logApiError } from "@/lib/api/observability"
import { generateCardsSchema } from "@/lib/schemas/api"
import { env } from "@/lib/env"
import { runGenerateJob } from "@/lib/services/generate-job"
import { deckAccessWhereForRole } from "@/lib/auth/deck-scope"

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Generation failed"
}

async function setJobStatus(
  redis: ReturnType<typeof getRedis>,
  jobId: string,
  status: JobState
): Promise<boolean> {
  if (!redis) return false
  try {
    await redis.setex(`job:${jobId}`, 3600, status)
    return true
  } catch (err) {
    console.error("[generate] Failed to write job status", err)
    return false
  }
}

export const POST = withHandler<{ deckId: string }>(async (req: NextRequest, { params }) => {
  const requestId = getRequestId(req)
  const auth = await requireRole("MANAGER", { limiterKey: "api:manager", routeClass: "write" })
  if (!auth.ok) return auth.response
  const { session } = auth
  const contentAccess = requireDeckContentManager(session)
  if (!contentAccess.ok) return contentAccess.response

  const deck = await prisma.deck.findFirst({
    where: deckAccessWhereForRole(session.user.role, session.user.id, session.user.orgId, params.deckId),
  })
  if (!deck) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const parsed = generateCardsSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const doc = await prisma.sourceDocument.findUnique({
    where: { id: parsed.data.sourceDocumentId },
  })
  if (
    !doc ||
    doc.orgId !== session.user.orgId ||
    doc.status !== "READY" ||
    (doc.deckId !== null && doc.deckId !== params.deckId)
  ) {
    return NextResponse.json(
      { error: "Document not found or not ready for generation" },
      { status: 404 }
    )
  }

  if (!env.OPENAI_API_KEY) {
    return apiErrorResponse(req, {
      code: "AI_NOT_CONFIGURED",
      status: 503,
      message: "AI generation is not configured. Please check the OpenAI settings.",
      requestId,
    })
  }

  if (!env.QSTASH_TOKEN) {
    return apiErrorResponse(req, {
      code: "QUEUE_NOT_CONFIGURED",
      status: 503,
      message: "Card generation queue is not configured. Please check the queue settings.",
      requestId,
    })
  }

  const jobId = crypto.randomUUID()

  const redis = getRedis()
  await setJobStatus(redis, jobId, {
    state: "queued",
    progress: 0,
    orgId: session.user.orgId,
    requestId,
  } satisfies JobState)

  try {
    await publishGenerateJob({
      jobId,
      deckId: params.deckId,
      documentId: doc.id,
      orgId: session.user.orgId,
    })
  } catch (err) {
    logApiError(req, {
      code: "GENERATION_QUEUE_FALLBACK",
      status: 202,
      requestId,
      cause: err,
      context: {
        deckId: params.deckId,
        sourceDocumentId: doc.id,
        jobId,
      },
    })

    if (!redis) {
      return apiErrorResponse(req, {
        code: "QUEUE_STATUS_NOT_CONFIGURED",
        status: 503,
        message: "Card generation queue failed and job status storage is not configured.",
        requestId,
        cause: err,
        context: { deckId: params.deckId, sourceDocumentId: doc.id, jobId },
      })
    }

    try {
      await setJobStatus(redis, jobId, {
        state: "active",
        progress: 5,
        orgId: session.user.orgId,
        requestId,
      } satisfies JobState)

      const result = await runGenerateJob({
        deckId: params.deckId,
        documentId: doc.id,
        orgId: session.user.orgId,
        onProgress: async (pct) => {
          await setJobStatus(redis, jobId, {
            state: "active",
            progress: 10 + Math.round(pct * 0.8),
            orgId: session.user.orgId,
            requestId,
          } satisfies JobState)
        },
      })

      await setJobStatus(redis, jobId, {
        state: "completed",
        progress: 100,
        orgId: session.user.orgId,
        count: result.count,
        warning: result.warning,
        summary: result.summary,
        requestId,
      } satisfies JobState)

      return NextResponse.json(
        { jobId, status: "completed", count: result.count },
        { status: 200 }
      )
    } catch (fallbackErr) {
      const message = errorMessage(fallbackErr)
      await setJobStatus(redis, jobId, {
        state: "failed",
        progress: 0,
        orgId: session.user.orgId,
        error: message,
        requestId,
      } satisfies JobState)
      return apiErrorResponse(req, {
        code: "CARD_GENERATION_FAILED",
        status: 500,
        message,
        requestId,
        cause: fallbackErr,
        context: { deckId: params.deckId, sourceDocumentId: doc.id, jobId },
      })
    }
  }

  return NextResponse.json({ jobId, status: "queued" }, { status: 202 })
})
