import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/auth/permissions"
import { prisma } from "@/lib/db"
import { withHandler } from "@/lib/api/handler"
import { updateTeamSchema } from "@/lib/schemas/api"

export const PUT = withHandler<{ teamId: string }>(async (req: NextRequest, { params }) => {
  const auth = await requireRole("MANAGER")
  if (!auth.ok) return auth.response
  const { session } = auth

  const team = await prisma.team.findUnique({ where: { id: params.teamId } })
  if (!team || team.orgId !== session.user.orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  if (session.user.role !== "ADMIN") {
    const membership = await prisma.teamMember.findUnique({
      where: { userId_teamId: { userId: session.user.id, teamId: params.teamId } },
    })
    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  }

  const parsed = updateTeamSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const updated = await prisma.team.update({
    where: { id: params.teamId },
    data: { name: parsed.data.name },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
    },
  })

  return NextResponse.json(updated)
})

export const DELETE = withHandler<{ teamId: string }>(async (_req, { params }) => {
  const auth = await requireRole("ADMIN")
  if (!auth.ok) return auth.response
  const { session } = auth

  const team = await prisma.team.findUnique({ where: { id: params.teamId } })
  if (!team || team.orgId !== session.user.orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await prisma.team.delete({ where: { id: params.teamId } })
  return new NextResponse(null, { status: 204 })
})
