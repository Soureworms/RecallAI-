import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

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
