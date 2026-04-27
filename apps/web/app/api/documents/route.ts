import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/auth/permissions"
import { prisma } from "@/lib/db"
import { withHandlerSimple } from "@/lib/api/handler"

export const GET = withHandlerSimple(async (req: NextRequest) => {
  const auth = await requireRole("MANAGER")
  if (!auth.ok) return auth.response
  const { session } = auth

  const deckId = req.nextUrl.searchParams.get("deckId")

  const docs = await prisma.sourceDocument.findMany({
    where: {
      orgId: session.user.orgId,
      ...(deckId ? { deckId } : {}),
    },
    include: {
      _count: { select: { cards: true } },
      uploadedBy: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(docs)
})
