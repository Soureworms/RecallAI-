import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/auth/permissions"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
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
}
