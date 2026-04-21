import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/auth/permissions"
import { prisma } from "@/lib/db"

// PATCH /api/org/settings — rename the caller's organization (ADMIN+)
export async function PATCH(req: NextRequest) {
  const auth = await requireRole("ADMIN")
  if (!auth.ok) return auth.response

  const body = await req.json() as { name?: string }
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 })
  }

  const org = await prisma.organization.update({
    where: { id: auth.session.user.orgId },
    data: { name: body.name.trim() },
    select: { id: true, name: true },
  })

  return NextResponse.json(org)
}

// GET /api/org/settings — fetch the caller's org details (ADMIN+)
export async function GET() {
  const auth = await requireRole("ADMIN")
  if (!auth.ok) return auth.response

  const org = await prisma.organization.findUnique({
    where: { id: auth.session.user.orgId },
    select: {
      id: true,
      name: true,
      _count: { select: { users: true, decks: true } },
    },
  })

  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(org)
}
