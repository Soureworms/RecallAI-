import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/auth/permissions"
import { getAiQueue } from "@/lib/queue/ai-queue"
import type { GenerateJobResult } from "@/lib/queue/ai-queue"

export async function GET(
  _req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const auth = await requireRole("MANAGER")
  if (!auth.ok) return auth.response

  if (!process.env.REDIS_URL) {
    return NextResponse.json({ error: "Queue not configured" }, { status: 503 })
  }

  const queue = getAiQueue()
  const job = await queue.getJob(params.jobId)

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 })
  }

  const state = await job.getState()
  const progress = typeof job.progress === "number" ? job.progress : 0
  const result = job.returnvalue as GenerateJobResult | undefined
  const failReason = job.failedReason ?? undefined

  return NextResponse.json({
    jobId: job.id,
    state,
    progress,
    count: result?.count,
    error: failReason,
  })
}
