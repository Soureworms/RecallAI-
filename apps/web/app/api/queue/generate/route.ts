import { NextRequest, NextResponse } from "next/server"
import { Receiver } from "@upstash/qstash"
import { Redis } from "@upstash/redis"
import { generateCardsFromText } from "@/lib/services/card-generator"
import { prisma } from "@/lib/db"
import type { GenerateJobData, JobState } from "@/lib/queue/qstash"

// QStash calls this endpoint when a job is ready to process.
// Signature verification ensures only QStash can trigger generation.
export async function POST(req: NextRequest) {
  // ── Verify QStash signature ───────────────────────────────────────────────
  const currentKey = process.env.QSTASH_CURRENT_SIGNING_KEY
  const nextKey = process.env.QSTASH_NEXT_SIGNING_KEY

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

  // ── Parse job data ────────────────────────────────────────────────────────
  const { jobId, deckId, documentId, orgId } = JSON.parse(rawBody) as GenerateJobData

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  })

  async function setStatus(patch: Partial<JobState>) {
    const current = (await redis.get<JobState>(`job:${jobId}`)) ?? {
      state: "active" as const,
      progress: 0,
      orgId,
    }
    await redis.setex(`job:${jobId}`, 3600, { ...current, ...patch })
  }

  // ── Process job ───────────────────────────────────────────────────────────
  try {
    await setStatus({ state: "active", progress: 5 })

    const doc = await prisma.sourceDocument.findUniqueOrThrow({
      where: { id: documentId, orgId },
      select: { textContent: true },
    })
    await setStatus({ progress: 10 })

    const rawCards = await generateCardsFromText(
      doc.textContent ?? "",
      async (pct) => {
        await setStatus({ progress: 10 + Math.round(pct * 0.7) })
      }
    )
    await setStatus({ progress: 85 })

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

    await redis.setex(`job:${jobId}`, 3600, {
      state: "completed",
      progress: 100,
      orgId,
      count: rawCards.length,
    } satisfies JobState)

    return NextResponse.json({ ok: true })
  } catch (err) {
    const error = err instanceof Error ? err.message : "Generation failed"
    await redis.setex(`job:${jobId}`, 3600, {
      state: "failed",
      progress: 0,
      orgId,
      error,
    } satisfies JobState)

    // Return 500 so QStash retries the job automatically
    return NextResponse.json({ error }, { status: 500 })
  }
}
