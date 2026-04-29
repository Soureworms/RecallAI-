import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth/permissions"
import { prisma } from "@/lib/db"
import { withHandler } from "@/lib/api/handler"

export const DELETE = withHandler<{ teamId: string; userId: string }>(async (_req, { params }) => {
  const auth = await requireRole("MANAGER", { limiterKey: "api:manager", routeClass: "write" })
  if (!auth.ok) return auth.response
  const { session } = auth

  const team = await prisma.team.findUnique({ where: { id: params.teamId } })
  if (!team || team.orgId !== session.user.orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  if (session.user.role !== "ADMIN") {
    const selfMembership = await prisma.teamMember.findUnique({
      where: { userId_teamId: { userId: session.user.id, teamId: params.teamId } },
    })
    if (!selfMembership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  }

  await prisma.teamMember.deleteMany({
    where: { teamId: params.teamId, userId: params.userId },
  })

  return new NextResponse(null, { status: 204 })
})
