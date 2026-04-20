import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/auth/permissions"
import { prisma } from "@/lib/db"

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { teamId: string; userId: string } }
) {
  const auth = await requireRole("MANAGER")
  if (!auth.ok) return auth.response
  const { session } = auth

  const team = await prisma.team.findUnique({ where: { id: params.teamId } })
  if (!team || team.orgId !== session.user.orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // Managers must be members of the team themselves
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
}
