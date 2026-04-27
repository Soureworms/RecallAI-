import { NextRequest, NextResponse } from "next/server"
import { requireSuperAdmin } from "@/lib/auth/permissions"
import { prisma } from "@/lib/db"
import { withHandler } from "@/lib/api/handler"
import type { Role } from "@prisma/client"

export const PATCH = withHandler<{ userId: string }>(async (req: NextRequest, { params }) => {
  const auth = await requireSuperAdmin()
  if (!auth.ok) return auth.response

  const body = await req.json() as { name?: string; role?: string; orgId?: string }
  const validRoles: Role[] = ["AGENT", "MANAGER", "ADMIN", "SUPER_ADMIN"]

  const data: Record<string, unknown> = {}
  if (body.name?.trim()) data.name = body.name.trim()
  if (body.orgId) data.orgId = body.orgId
  if (body.role && validRoles.includes(body.role as Role)) data.role = body.role

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
  }

  const user = await prisma.user.update({
    where: { id: params.userId },
    data,
    select: {
      id: true, name: true, email: true, role: true,
      org: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(user)
})

export const DELETE = withHandler<{ userId: string }>(async (_req, { params }) => {
  const auth = await requireSuperAdmin()
  if (!auth.ok) return auth.response

  if (params.userId === auth.session.user.id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 })
  }

  await prisma.user.delete({ where: { id: params.userId } })
  return new NextResponse(null, { status: 204 })
})
