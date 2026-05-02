import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/auth/permissions"
import { prisma } from "@/lib/db"
import { withHandlerSimple } from "@/lib/api/handler"
import { createDeckSchema } from "@/lib/schemas/api"

export const GET = withHandlerSimple(async () => {
  const auth = await requireRole("AGENT", { limiterKey: "api:agent", routeClass: "read" })
  if (!auth.ok) return auth.response
  const { session } = auth

  const decks = await prisma.deck.findMany({
    where: { orgId: session.user.orgId, isArchived: false },
    include: {
      _count: { select: { cards: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ decks })
})

export const POST = withHandlerSimple(async (req: NextRequest) => {
  const auth = await requireRole("MANAGER", { limiterKey: "api:manager", routeClass: "write" })
  if (!auth.ok) return auth.response
  const { session } = auth

  const parsed = createDeckSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }
  const { name, description, isMandatory } = parsed.data

  const deck = await prisma.deck.create({
    data: {
      name,
      description: description ?? null,
      isMandatory,
      orgId: session.user.orgId,
      createdById: session.user.id,
    },
    include: { _count: { select: { cards: true } } },
  })

  return NextResponse.json(deck, { status: 201 })
})
