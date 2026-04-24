import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/auth/permissions"
import { getRedis } from "@/lib/redis"
import type { JobState } from "@/lib/queue/qstash"

export async function GET(
  _req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const auth = await requireRole("MANAGER")
  if (!auth.ok) return auth.response

  const redis = getRedis()
  if (!redis) {
    return NextResponse.json({ error: "Queue not configured" }, { status: 503 })
  }

  const status = await redis.get<JobState>(`job:${params.jobId}`)
  if (!status) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 })
  }

  return NextResponse.json({ jobId: params.jobId, ...status })
}
