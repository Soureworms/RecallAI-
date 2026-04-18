import { initializeCard, submitReview, getNextReview } from "../lib/services/scheduler"
import { prisma } from "../lib/db"
import { Rating } from "@prisma/client"

async function verify() {
  const userId = "seed-user-agent"
  const cardId = "seed-card-001"

  await prisma.reviewLog.deleteMany({ where: { userId, cardId } })
  await prisma.userCard.deleteMany({ where: { userId, cardId } })

  // 1. initializeCard
  const uc1 = await initializeCard(userId, cardId)
  console.log("initializeCard  →", { state: uc1.state, dueDate: uc1.dueDate })
  console.assert(uc1.state === "NEW", "state should be NEW")
  console.assert(uc1.dueDate <= new Date(), "dueDate should be now or past")

  // 2. getNextReview preview
  const preview = getNextReview(uc1)
  console.log("preview scheduledDays →", {
    again: preview.again.scheduledDays,
    hard:  preview.hard.scheduledDays,
    good:  preview.good.scheduledDays,
    easy:  preview.easy.scheduledDays,
  })

  // 3. submitReview GOOD
  const uc2 = await submitReview(userId, cardId, Rating.GOOD)
  console.log("after GOOD      →", { state: uc2.state, scheduledDays: uc2.scheduledDays, reps: uc2.reps })
  console.assert(uc2.dueDate > new Date(), "dueDate should be in the future after GOOD")

  // 4. ReviewLog created
  const logs = await prisma.reviewLog.findMany({ where: { userId, cardId } })
  console.log("reviewLog count:", logs.length, "| rating:", logs[0]?.rating)
  console.assert(logs.length === 1, "exactly 1 ReviewLog row")

  // 5. Interval grows with repeated GOOD ratings
  const uc3 = await submitReview(userId, cardId, Rating.GOOD)
  const uc4 = await submitReview(userId, cardId, Rating.GOOD)
  console.log("intervals:      ", uc2.scheduledDays, "→", uc3.scheduledDays, "→", uc4.scheduledDays)
  console.assert(uc4.scheduledDays >= uc2.scheduledDays, "interval should grow")

  console.log("\n✓ All checks passed")
  await prisma.$disconnect()
}

verify().catch((e: unknown) => {
  console.error(e)
  process.exit(1)
})
