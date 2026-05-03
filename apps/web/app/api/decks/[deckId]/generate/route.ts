import { NextRequest, NextResponse } from "next/server"
import { requireDeckContentManager, requireRole } from "@/lib/auth/permissions"
import { prisma } from "@/lib/db"
import { getRedis } from "@/lib/redis"
import { publishGenerateJob, type JobState } from "@/lib/queue/qstash"
import { withHandler } from "@/lib/api/handler"
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
    return NextResponse.json(
      { error: "AI generation is not configured. Set OPENAI_API_KEY." },
      { status: 503 }
    )
  }

  if (!env.QSTASH_TOKEN) {
    return NextResponse.json(
      { error: "Job queue is not configured. Set QSTASH_TOKEN." },
      { status: 503 }
    )
  }

  const jobId = crypto.randomUUID()

  const redis = getRedis()
  await setJobStatus(redis, jobId, {
    state: "queued",
    progress: 0,
    orgId: session.user.orgId,
  } satisfies JobState)

  try {
    await publishGenerateJob({
      jobId,
      deckId: params.deckId,
      documentId: doc.id,
      orgId: session.user.orgId,
    })
  } catch (err) {
    console.error("[generate] QStash enqueue failed; running inline fallback", err)

    if (!redis) {
      return NextResponse.json(
        { error: "AI generation queue failed and job status storage is not configured." },
        { status: 503 }
      )
    }

    try {
      await setJobStatus(redis, jobId, {
        state: "active",
        progress: 5,
        orgId: session.user.orgId,
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
      } satisfies JobState)
      return NextResponse.json({ error: message }, { status: 500 })
    }
  }

  return NextResponse.json({ jobId, status: "queued" }, { status: 202 })
})
