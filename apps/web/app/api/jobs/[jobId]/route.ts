import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth/permissions"
import { getRedis } from "@/lib/redis"
import type { JobState } from "@/lib/queue/qstash"
import { withHandler } from "@/lib/api/handler"

export const GET = withHandler<{ jobId: string }>(async (_req, { params }) => {
  const auth = await requireRole("MANAGER", { limiterKey: "api:manager", routeClass: "write" })
  if (!auth.ok) return auth.response
  const { session } = auth

  const redis = getRedis()
  if (!redis) {
    return NextResponse.json({ error: "Queue not configured" }, { status: 503 })
  }

  const status = await redis.get<JobState>(`job:${params.jobId}`)
  if (!status) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 })
  }

  if (status.orgId && status.orgId !== session.user.orgId) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 })
  }

  return NextResponse.json({ jobId: params.jobId, ...status })
})
