import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/auth/permissions"
import { prisma } from "@/lib/db"
import type { Role } from "@prisma/client"

// PATCH /api/org/users/[userId] — update name or role (ADMIN only, own org)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const auth = await requireRole("ADMIN")
  if (!auth.ok) return auth.response

  // Verify target user is in caller's org
  const target = await prisma.user.findUnique({ where: { id: params.userId } })
  if (!target || target.orgId !== auth.session.user.orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // Cannot modify another ADMIN or SUPER_ADMIN
  if (target.role === "ADMIN" || target.role === "SUPER_ADMIN") {
    return NextResponse.json({ error: "Cannot modify admin accounts" }, { status: 403 })
  }

  const body = await req.json() as { name?: string; role?: string }
  const allowedRoles: Role[] = ["AGENT", "MANAGER"]
  const data: Record<string, unknown> = {}
  if (body.name?.trim()) data.name = body.name.trim()
  if (body.role && allowedRoles.includes(body.role as Role)) data.role = body.role

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
  }

  const user = await prisma.user.update({
    where: { id: params.userId },
    data,
    select: { id: true, name: true, email: true, role: true },
  })

  return NextResponse.json(user)
}

// DELETE /api/org/users/[userId] — remove user from org (ADMIN only, own org)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const auth = await requireRole("ADMIN")
  if (!auth.ok) return auth.response

  const target = await prisma.user.findUnique({ where: { id: params.userId } })
  if (!target || target.orgId !== auth.session.user.orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // Cannot delete admins or self
  if (target.role === "ADMIN" || target.role === "SUPER_ADMIN") {
    return NextResponse.json({ error: "Cannot delete admin accounts" }, { status: 403 })
  }
  if (params.userId === auth.session.user.id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 })
  }

  await prisma.user.delete({ where: { id: params.userId } })
  return new NextResponse(null, { status: 204 })
}
