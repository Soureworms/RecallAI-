import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/auth/permissions"
import { prisma } from "@/lib/db"
import { withHandler } from "@/lib/api/handler"
import type { Role } from "@prisma/client"

export const PATCH = withHandler<{ userId: string }>(async (req: NextRequest, { params }) => {
  const auth = await requireRole("ADMIN", { limiterKey: "api:admin", routeClass: "write" })
  if (!auth.ok) return auth.response

  const target = await prisma.user.findUnique({ where: { id: params.userId } })
  if (!target || target.orgId !== auth.session.user.orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

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
})

export const DELETE = withHandler<{ userId: string }>(async (_req, { params }) => {
  const auth = await requireRole("ADMIN", { limiterKey: "api:admin", routeClass: "write" })
  if (!auth.ok) return auth.response

  const target = await prisma.user.findUnique({ where: { id: params.userId } })
  if (!target || target.orgId !== auth.session.user.orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  if (target.role === "ADMIN" || target.role === "SUPER_ADMIN") {
    return NextResponse.json({ error: "Cannot delete admin accounts" }, { status: 403 })
  }
  if (params.userId === auth.session.user.id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 })
  }

  await prisma.user.delete({ where: { id: params.userId } })
  return new NextResponse(null, { status: 204 })
})
