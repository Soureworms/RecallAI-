import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/auth/permissions"
import { prisma } from "@/lib/db"

export async function GET() {
  const auth = await requireRole("AGENT")
  if (!auth.ok) return auth.response
  const { session } = auth

  const decks = await prisma.deck.findMany({
    where: { orgId: session.user.orgId, isArchived: false },
    include: {
      _count: { select: { cards: { where: { status: { not: "ARCHIVED" } } } } },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(decks)
}

export async function POST(req: NextRequest) {
  const auth = await requireRole("MANAGER")
  if (!auth.ok) return auth.response
  const { session } = auth

  const body = (await req.json()) as {
    name?: string
    description?: string
    isMandatory?: boolean
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 })
  }

  const deck = await prisma.deck.create({
    data: {
      name: body.name.trim(),
      description: body.description?.trim() ?? null,
      isMandatory: body.isMandatory ?? false,
      orgId: session.user.orgId,
      createdById: session.user.id,
    },
    include: {
      _count: { select: { cards: true } },
    },
  })

  return NextResponse.json(deck, { status: 201 })
}
