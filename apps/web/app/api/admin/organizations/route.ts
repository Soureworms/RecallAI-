import { NextRequest, NextResponse } from "next/server"
import { requireSuperAdmin } from "@/lib/auth/permissions"
import { prisma } from "@/lib/db"
import { withHandlerSimple } from "@/lib/api/handler"
import { createOrgSchema } from "@/lib/schemas/api"

export const GET = withHandlerSimple(async () => {
  const auth = await requireSuperAdmin()
  if (!auth.ok) return auth.response

  const orgs = await prisma.organization.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { users: true, decks: true } },
    },
  })

  return NextResponse.json(orgs)
})

export const POST = withHandlerSimple(async (req: NextRequest) => {
  const auth = await requireSuperAdmin()
  if (!auth.ok) return auth.response

  const parsed = createOrgSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const org = await prisma.organization.create({
    data: { name: parsed.data.name },
    include: { _count: { select: { users: true, decks: true } } },
  })

  return NextResponse.json(org, { status: 201 })
})
