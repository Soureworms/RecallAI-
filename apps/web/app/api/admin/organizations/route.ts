import { NextRequest, NextResponse } from "next/server"
import { requireSuperAdmin } from "@/lib/auth/permissions"
import { prisma } from "@/lib/db"

export async function GET() {
  const auth = await requireSuperAdmin()
  if (!auth.ok) return auth.response

  const orgs = await prisma.organization.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { users: true, decks: true } },
    },
  })

  return NextResponse.json(orgs)
}

export async function POST(req: NextRequest) {
  const auth = await requireSuperAdmin()
  if (!auth.ok) return auth.response

  const body = await req.json() as { name?: string }
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 })
  }

  const org = await prisma.organization.create({
    data: { name: body.name.trim() },
    include: { _count: { select: { users: true, decks: true } } },
  })

  return NextResponse.json(org, { status: 201 })
}
