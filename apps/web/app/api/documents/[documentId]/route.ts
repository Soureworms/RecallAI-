import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth/permissions"
import { prisma } from "@/lib/db"
import { withHandler } from "@/lib/api/handler"
import { deckAccessWhereForRole } from "@/lib/auth/deck-scope"

export const GET = withHandler<{ documentId: string }>(async (_req, { params }) => {
  const auth = await requireRole("MANAGER", { limiterKey: "api:manager", routeClass: "write" })
  if (!auth.ok) return auth.response
  const { session } = auth

  const doc = await prisma.sourceDocument.findUnique({
    where: { id: params.documentId },
  })

  if (!doc || doc.orgId !== session.user.orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  if (doc.deckId) {
    const deck = await prisma.deck.findFirst({
      where: deckAccessWhereForRole(session.user.role, session.user.id, session.user.orgId, doc.deckId),
    })
    if (!deck) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
  } else if (session.user.role === "MANAGER" && doc.uploadedById !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json(doc)
})
