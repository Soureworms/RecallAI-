import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/auth/permissions"
import { prisma } from "@/lib/db"
import { withHandlerSimple } from "@/lib/api/handler"
import { orgSettingsSchema } from "@/lib/schemas/api"

export const PATCH = withHandlerSimple(async (req: NextRequest) => {
  const auth = await requireRole("ADMIN", { limiterKey: "api:admin", routeClass: "write" })
  if (!auth.ok) return auth.response

  const parsed = orgSettingsSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { name, studyMode } = parsed.data
  const org = await prisma.organization.update({
    where: { id: auth.session.user.orgId },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(studyMode !== undefined ? { studyMode } : {}),
    },
    select: { id: true, name: true, studyMode: true },
  })

  return NextResponse.json(org)
})

export const GET = withHandlerSimple(async () => {
  const auth = await requireRole("ADMIN", { limiterKey: "api:admin", routeClass: "write" })
  if (!auth.ok) return auth.response

  const org = await prisma.organization.findUnique({
    where: { id: auth.session.user.orgId },
    select: {
      id: true,
      name: true,
      studyMode: true,
    },
  })

  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const [users, decks] = await Promise.all([
    prisma.user.count({ where: { orgId: org.id } }),
    prisma.deck.count({ where: { orgId: org.id } }),
  ])

  return NextResponse.json({ ...org, _count: { users, decks } })
})
