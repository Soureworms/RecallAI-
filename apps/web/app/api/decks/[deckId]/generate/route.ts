import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/auth/permissions"
import { prisma } from "@/lib/db"
import { getRedis } from "@/lib/redis"
import { publishGenerateJob, type JobState } from "@/lib/queue/qstash"
import { withHandler } from "@/lib/api/handler"
import { generateCardsSchema } from "@/lib/schemas/api"
import { env } from "@/lib/env"

export const POST = withHandler<{ deckId: string }>(async (req: NextRequest, { params }) => {
  const auth = await requireRole("MANAGER")
  if (!auth.ok) return auth.response
  const { session } = auth

  const deck = await prisma.deck.findUnique({ where: { id: params.deckId } })
  if (!deck || deck.orgId !== session.user.orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const parsed = generateCardsSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const doc = await prisma.sourceDocument.findUnique({
    where: { id: parsed.data.sourceDocumentId },
  })
  if (!doc || doc.orgId !== session.user.orgId || doc.status !== "READY") {
    return NextResponse.json(
      { error: "Document not found or not ready for generation" },
      { status: 404 }
    )
  }

  if (!env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "AI generation is not configured. Set ANTHROPIC_API_KEY." },
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
  if (redis) {
    await redis.setex(`job:${jobId}`, 3600, {
      state: "queued",
      progress: 0,
      orgId: session.user.orgId,
    } satisfies JobState)
  }

  await publishGenerateJob({
    jobId,
    deckId: params.deckId,
    documentId: doc.id,
    orgId: session.user.orgId,
  })

  return NextResponse.json({ jobId, status: "queued" }, { status: 202 })
})
