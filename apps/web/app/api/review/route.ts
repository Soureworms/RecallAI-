import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { submitReview } from "@/lib/services/scheduler"
import { Rating } from "@prisma/client"

const VALID_RATINGS = new Set<string>(Object.values(Rating))

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await req.json()) as {
    userCardId?: string
    rating?: string
  }

  if (!body.userCardId || !body.rating) {
    return NextResponse.json(
      { error: "userCardId and rating are required" },
      { status: 400 }
    )
  }

  if (!VALID_RATINGS.has(body.rating)) {
    return NextResponse.json({ error: "Invalid rating" }, { status: 400 })
  }

  const userCard = await prisma.userCard.findUnique({
    where: { id: body.userCardId },
  })

  if (!userCard || userCard.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const updated = await submitReview(
    userCard.userId,
    userCard.cardId,
    body.rating as Rating
  )

  return NextResponse.json(updated)
}
