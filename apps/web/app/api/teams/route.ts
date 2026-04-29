import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/auth/permissions"
import { prisma } from "@/lib/db"
import { withHandlerSimple } from "@/lib/api/handler"
import { createTeamSchema } from "@/lib/schemas/api"

export const GET = withHandlerSimple(async () => {
  const auth = await requireRole("AGENT", { limiterKey: "api:agent", routeClass: "read" })
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
})

export const POST = withHandlerSimple(async (req: NextRequest) => {
  const auth = await requireRole("ADMIN", { limiterKey: "api:admin", routeClass: "write" })
  if (!auth.ok) return auth.response
  const { session } = auth

  const parsed = createTeamSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const team = await prisma.team.create({
    data: { name: parsed.data.name, orgId: session.user.orgId },
    include: { members: true },
  })

  return NextResponse.json(team, { status: 201 })
})
