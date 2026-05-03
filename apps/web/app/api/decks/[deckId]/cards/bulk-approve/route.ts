import { NextRequest, NextResponse } from "next/server"
import { requireDeckContentManager, requireRole } from "@/lib/auth/permissions"
import { prisma } from "@/lib/db"
import { withHandler } from "@/lib/api/handler"
import { bulkApproveSchema } from "@/lib/schemas/api"
import { assignCardsToUsers } from "@/lib/services/user-card"
import { deckAccessWhereForRole } from "@/lib/auth/deck-scope"

// Shared workspace: any MANAGER in the org can bulk-approve cards in any deck.
export const POST = withHandler<{ deckId: string }>(async (req: NextRequest, { params }) => {
  const auth = await requireRole("MANAGER", { limiterKey: "api:manager", routeClass: "write" })
  if (!auth.ok) return auth.response
  const { session } = auth
  const contentAccess = requireDeckContentManager(session)
  if (!contentAccess.ok) return contentAccess.response

  const deck = await prisma.deck.findFirst({
    where: deckAccessWhereForRole(session.user.role, session.user.id, session.user.orgId, params.deckId),
  })
  if (!deck) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const parsed = bulkApproveSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  let cardIds: string[]
  if ("approveAll" in parsed.data) {
    const drafts = await prisma.card.findMany({
      where: { deckId: params.deckId, status: "DRAFT" },
      select: { id: true },
    })
    cardIds = drafts.map((c) => c.id)
  } else {
    const found = await prisma.card.findMany({
      where: { id: { in: parsed.data.cardIds }, deckId: params.deckId, status: "DRAFT" },
      select: { id: true },
    })
    cardIds = found.map((c) => c.id)
  }

  if (cardIds.length === 0) return NextResponse.json({ approved: 0 })

  await prisma.card.updateMany({
    where: { id: { in: cardIds } },
    data: { status: "ACTIVE" },
  })

  // Auto-assign to users already assigned to this deck
  const assignedUsers = await prisma.userCard.findMany({
    where: { card: { deckId: params.deckId }, cardId: { notIn: cardIds } },
    select: { userId: true },
    distinct: ["userId"],
  })

  if (assignedUsers.length > 0) {
    await assignCardsToUsers(assignedUsers.map((u) => u.userId), cardIds)
  }

  return NextResponse.json({ approved: cardIds.length })
})
