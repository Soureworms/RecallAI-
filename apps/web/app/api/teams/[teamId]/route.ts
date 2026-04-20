import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/auth/permissions"
import { prisma } from "@/lib/db"

export async function PUT(
  req: NextRequest,
  { params }: { params: { teamId: string } }
) {
  const auth = await requireRole("MANAGER")
  if (!auth.ok) return auth.response
  const { session } = auth

  const team = await prisma.team.findUnique({ where: { id: params.teamId } })
  if (!team || team.orgId !== session.user.orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // Managers can only update their own teams; admins can update any org team
  if (session.user.role !== "ADMIN") {
    const membership = await prisma.teamMember.findUnique({
      where: { userId_teamId: { userId: session.user.id, teamId: params.teamId } },
    })
    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  }

  const body = (await req.json()) as { name?: string }
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 })
  }

  const updated = await prisma.team.update({
    where: { id: params.teamId },
    data: { name: body.name.trim() },
    include: { members: { include: { user: { select: { id: true, name: true, email: true, role: true } } } } },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { teamId: string } }
) {
  const auth = await requireRole("ADMIN")
  if (!auth.ok) return auth.response
  const { session } = auth

  const team = await prisma.team.findUnique({ where: { id: params.teamId } })
  if (!team || team.orgId !== session.user.orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await prisma.team.delete({ where: { id: params.teamId } })
  return new NextResponse(null, { status: 204 })
}
