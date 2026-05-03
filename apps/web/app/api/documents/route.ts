import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/auth/permissions"
import { prisma } from "@/lib/db"
import { withHandlerSimple } from "@/lib/api/handler"
import { deckAccessWhereForRole, deckReadWhereForRole } from "@/lib/auth/deck-scope"

export const GET = withHandlerSimple(async (req: NextRequest) => {
  const auth = await requireRole("MANAGER", { limiterKey: "api:manager", routeClass: "write" })
  if (!auth.ok) return auth.response
  const { session } = auth

  const deckId = req.nextUrl.searchParams.get("deckId")
  if (deckId) {
    const deck = await prisma.deck.findFirst({
      where: deckAccessWhereForRole(session.user.role, session.user.id, session.user.orgId, deckId),
    })
    if (!deck) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
  }

  const docs = await prisma.sourceDocument.findMany({
    where: {
      orgId: session.user.orgId,
      ...(deckId
        ? { deckId }
        : session.user.role === "MANAGER"
        ? {
            OR: [
              { uploadedById: session.user.id, deckId: null },
              { deck: deckReadWhereForRole(session.user.role, session.user.id) },
            ],
          }
        : {}),
    },
    include: {
      uploadedBy: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  const counts = await Promise.all(
    docs.map((doc) => prisma.card.count({ where: { sourceDocumentId: doc.id } }))
  )

  return NextResponse.json(
    docs.map((doc, index) => ({ ...doc, _count: { cards: counts[index] } }))
  )
})
