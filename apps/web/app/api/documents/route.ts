import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/auth/permissions"
import { prisma } from "@/lib/db"
import { withHandlerSimple } from "@/lib/api/handler"

export const GET = withHandlerSimple(async (req: NextRequest) => {
  const auth = await requireRole("MANAGER", { limiterKey: "api:manager", routeClass: "write" })
  if (!auth.ok) return auth.response
  const { session } = auth

  const deckId = req.nextUrl.searchParams.get("deckId")

  const docs = await prisma.sourceDocument.findMany({
    where: {
      orgId: session.user.orgId,
      ...(deckId ? { deckId } : {}),
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
