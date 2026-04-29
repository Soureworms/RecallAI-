import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth/permissions"
import { getDocumentPerformance } from "@/lib/services/analytics"
import { withHandlerSimple } from "@/lib/api/handler"

export const GET = withHandlerSimple(async () => {
  const auth = await requireRole("MANAGER", { limiterKey: "api:manager", routeClass: "write" })
  if (!auth.ok) return auth.response

  const items = await getDocumentPerformance(auth.session.user.orgId)
  return NextResponse.json(items)
})
