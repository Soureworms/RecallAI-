import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/auth/permissions"
import { prisma } from "@/lib/db"
import { getRedis } from "@/lib/redis"
import { publishGenerateJob, type JobState } from "@/lib/queue/qstash"

export async function POST(
  req: NextRequest,
  { params }: { params: { deckId: string } }
) {
  const auth = await requireRole("MANAGER")
  if (!auth.ok) return auth.response
  const { session } = auth

  const deck = await prisma.deck.findUnique({ where: { id: params.deckId } })
  if (!deck || deck.orgId !== session.user.orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const body = (await req.json()) as { sourceDocumentId?: string }
  if (!body.sourceDocumentId) {
    return NextResponse.json({ error: "sourceDocumentId is required" }, { status: 400 })
  }

  const doc = await prisma.sourceDocument.findUnique({
    where: { id: body.sourceDocumentId },
  })
  if (!doc || doc.orgId !== session.user.orgId || doc.status !== "READY") {
    return NextResponse.json(
      { error: "Document not found or not ready for generation" },
      { status: 404 }
    )
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "AI generation is not configured. Set ANTHROPIC_API_KEY." },
      { status: 503 }
    )
  }

  if (!process.env.QSTASH_TOKEN) {
    return NextResponse.json(
      { error: "Job queue is not configured. Set QSTASH_TOKEN." },
      { status: 503 }
    )
  }

  const jobId = crypto.randomUUID()

  // Store initial status so the polling endpoint can respond immediately
  const redis = getRedis()
  if (redis) {
    await redis.setex(`job:${jobId}`, 3600, {
      state: "queued",
      progress: 0,
    } satisfies JobState)
  }

  await publishGenerateJob({
    jobId,
    deckId: params.deckId,
    documentId: doc.id,
    orgId: session.user.orgId,
  })

  return NextResponse.json({ jobId, status: "queued" }, { status: 202 })
}
