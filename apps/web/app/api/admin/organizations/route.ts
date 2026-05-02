import { NextRequest, NextResponse } from "next/server"
import { requireSuperAdmin } from "@/lib/auth/permissions"
import { prisma } from "@/lib/db"
import { withHandlerSimple } from "@/lib/api/handler"
import { createOrgSchema } from "@/lib/schemas/api"

async function withOrgCounts<T extends { id: string }>(org: T) {
  const [users, decks] = await Promise.all([
    prisma.user.count({ where: { orgId: org.id } }),
    prisma.deck.count({ where: { orgId: org.id } }),
  ])
  return { ...org, _count: { users, decks } }
}

export const GET = withHandlerSimple(async () => {
  const auth = await requireSuperAdmin()
  if (!auth.ok) return auth.response

  const orgs = await prisma.organization.findMany({
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json(await Promise.all(orgs.map(withOrgCounts)))
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
  })

  return NextResponse.json(await withOrgCounts(org), { status: 201 })
})
