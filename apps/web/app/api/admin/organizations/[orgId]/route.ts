import { NextRequest, NextResponse } from "next/server"
import { requireSuperAdmin } from "@/lib/auth/permissions"
import { prisma } from "@/lib/db"
import { withHandler } from "@/lib/api/handler"
import { orgSettingsSchema } from "@/lib/schemas/api"

export const PATCH = withHandler<{ orgId: string }>(async (req: NextRequest, { params }) => {
  const auth = await requireSuperAdmin()
  if (!auth.ok) return auth.response

  const parsed = orgSettingsSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const org = await prisma.organization.update({
    where: { id: params.orgId },
    data: { name: parsed.data.name },
    include: { _count: { select: { users: true, decks: true } } },
  })

  return NextResponse.json(org)
})

export const DELETE = withHandler<{ orgId: string }>(async (_req, { params }) => {
  const auth = await requireSuperAdmin()
  if (!auth.ok) return auth.response

  const org = await prisma.organization.findUnique({ where: { id: params.orgId } })
  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (org.id === "system-org-001") {
    return NextResponse.json({ error: "Cannot delete the system organization" }, { status: 400 })
  }

  await prisma.organization.delete({ where: { id: params.orgId } })
  return new NextResponse(null, { status: 204 })
})
