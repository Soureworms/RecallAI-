import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}

function isManagerPlus(role: string) {
  return role === "MANAGER" || role === "ADMIN"
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

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
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!isManagerPlus(session.user.role)) return forbidden()

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
