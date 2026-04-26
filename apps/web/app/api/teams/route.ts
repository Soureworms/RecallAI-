import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/auth/permissions"
import { prisma } from "@/lib/db"

export async function GET() {
  const auth = await requireRole("AGENT")
  if (!auth.ok) return auth.response
  const { session } = auth

  // Shared workspace: MANAGER+ sees all org teams.
  // AGENT sees only teams they belong to — prevents org-structure enumeration.
  const teams = await prisma.team.findMany({
    where: {
      orgId: session.user.orgId,
      ...(session.user.role === "AGENT"
        ? { members: { some: { userId: session.user.id } } }
        : {}),
    },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
      },
    },
    orderBy: { name: "asc" },
  })

  return NextResponse.json(teams)
}

export async function POST(req: NextRequest) {
  const auth = await requireRole("ADMIN")
  if (!auth.ok) return auth.response
  const { session } = auth

  const body = (await req.json()) as { name?: string }
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 })
  }

  const team = await prisma.team.create({
    data: {
      name: body.name.trim(),
      orgId: session.user.orgId,
    },
    include: { members: true },
  })

  return NextResponse.json(team, { status: 201 })
}
