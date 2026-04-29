import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth/permissions"
import { getUserFSRSConfig } from "@/lib/services/fsrs-optimizer"
import { withHandlerSimple } from "@/lib/api/handler"
import { prisma } from "@/lib/db"

export const GET = withHandlerSimple(async () => {
  const authResult = await requireRole("AGENT", { limiterKey: "api:agent", routeClass: "read" })
  if (!authResult.ok) return authResult.response
  const { session } = authResult

  const [config, reviewCount] = await Promise.all([
    getUserFSRSConfig(session.user.id),
    prisma.reviewLog.count({ where: { userId: session.user.id } }),
  ])

  return NextResponse.json({
    hasCustomParams: config !== null,
    reviewCount,
    minReviewsRequired: 10,
    params: config
      ? {
          logLoss: config.logLoss,
          rmseBins: config.rmseBins,
          reviewCount: config.reviewCount,
          lastOptimizedAt: config.lastOptimizedAt.toISOString(),
          learningSteps: config.learningStepsSecs.map(formatSecs),
          relearningSteps: config.relearningStepsSecs.map(formatSecs),
        }
      : null,
  })
})

function formatSecs(s: number): string {
  if (s < 3600) return `${Math.round(s / 60)}m`
  if (s < 86400) return `${Math.round(s / 3600)}h`
  return `${Math.round(s / 86400)}d`
}
