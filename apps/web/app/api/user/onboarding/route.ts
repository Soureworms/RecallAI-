import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth/permissions"
import { prisma } from "@/lib/db"
import { withHandlerSimple } from "@/lib/api/handler"

export const POST = withHandlerSimple(async () => {
  const authResult = await requireRole("AGENT", { limiterKey: "api:agent", routeClass: "read" })
  if (!authResult.ok) return authResult.response
  const { session } = authResult

  await prisma.user.update({
    where: { id: session.user.id },
    data: { onboardedAt: new Date() },
  })

  return NextResponse.json({ ok: true })
})
