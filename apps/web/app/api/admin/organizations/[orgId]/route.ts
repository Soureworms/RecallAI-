import { NextRequest, NextResponse } from "next/server"
import { requireSuperAdmin } from "@/lib/auth/permissions"
import { prisma } from "@/lib/db"

export async function PATCH(
  req: NextRequest,
  { params }: { params: { orgId: string } }
) {
  const auth = await requireSuperAdmin()
  if (!auth.ok) return auth.response

  const body = await req.json() as { name?: string }
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 })
  }

  const org = await prisma.organization.update({
    where: { id: params.orgId },
    data: { name: body.name.trim() },
    include: { _count: { select: { users: true, decks: true } } },
  })

  return NextResponse.json(org)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { orgId: string } }
) {
  const auth = await requireSuperAdmin()
  if (!auth.ok) return auth.response

  // Prevent deleting the system org
  const org = await prisma.organization.findUnique({ where: { id: params.orgId } })
  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (org.id === "system-org-001") {
    return NextResponse.json({ error: "Cannot delete the system organization" }, { status: 400 })
  }

  await prisma.organization.delete({ where: { id: params.orgId } })
  return new NextResponse(null, { status: 204 })
}
