import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth/permissions"
import { optimizeUserParameters } from "@/lib/services/fsrs-optimizer"
import { withHandlerSimple } from "@/lib/api/handler"

export const POST = withHandlerSimple(async () => {
  const authResult = await requireRole("AGENT", { limiterKey: "api:agent", routeClass: "read" })
  if (!authResult.ok) return authResult.response
  const { session } = authResult

  const optimized = await optimizeUserParameters(session.user.id)

  if (!optimized) {
    return NextResponse.json(
      { error: "Not enough review history to optimize. Complete at least 10 reviews first." },
      { status: 422 }
    )
  }

  return NextResponse.json({ success: true })
})
