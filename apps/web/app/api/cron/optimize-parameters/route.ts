import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { optimizeUserParameters } from "@/lib/services/fsrs-optimizer"

/**
 * POST /api/cron/optimize-parameters
 * Runs the FSRS optimizer for all users who have enough review history.
 * Should be called by a cron job (e.g. daily via QStash or Vercel Cron).
 * Protected by CRON_SECRET env var.
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret")
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Find all users with at least 10 review logs
  const candidates = await prisma.reviewLog.groupBy({
    by: ["userId"],
    _count: { userId: true },
    having: { userId: { _count: { gte: 10 } } },
  })

  const results = { optimized: 0, skipped: 0, errors: 0 }

  for (const { userId } of candidates) {
    try {
      const ok = await optimizeUserParameters(userId)
      if (ok) results.optimized++
      else results.skipped++
    } catch {
      results.errors++
    }
  }

  return NextResponse.json(results)
}
