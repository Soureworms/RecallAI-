import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/auth/permissions"
import { prisma } from "@/lib/db"
import { submitReview } from "@/lib/services/scheduler"
import { getUserFSRSConfig } from "@/lib/services/fsrs-optimizer"
import { Rating } from "@prisma/client"
import { withHandlerSimple } from "@/lib/api/handler"
import { submitReviewSchema } from "@/lib/schemas/api"

export const POST = withHandlerSimple(async (req: NextRequest) => {
  const authResult = await requireRole("AGENT")
  if (!authResult.ok) return authResult.response
  const { session } = authResult

  const parsed = submitReviewSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }
  const { userCardId, rating } = parsed.data

  const userCard = await prisma.userCard.findUnique({ where: { id: userCardId } })
  if (!userCard || userCard.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const fsrsConfig = await getUserFSRSConfig(session.user.id)
  const schedulerConfig = fsrsConfig
    ? { w: fsrsConfig.w, learningStepsSecs: fsrsConfig.learningStepsSecs, relearningStepsSecs: fsrsConfig.relearningStepsSecs }
    : undefined

  const updated = await submitReview(userCard.userId, userCard.cardId, rating as Rating, schedulerConfig)
  return NextResponse.json(updated)
})
