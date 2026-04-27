import { createEmptyCard } from "ts-fsrs"
import { prisma } from "@/lib/db"

/**
 * Assigns a set of cards to a set of users using FSRS initial state.
 * Silently skips already-assigned pairs via skipDuplicates.
 * Returns the count of newly created rows.
 */
export async function assignCardsToUsers(
  userIds: string[],
  cardIds: string[]
): Promise<number> {
  if (userIds.length === 0 || cardIds.length === 0) return 0

  const empty = createEmptyCard(new Date())
  const now = new Date()

  const result = await prisma.userCard.createMany({
    data: userIds.flatMap((userId) =>
      cardIds.map((cardId) => ({
        userId,
        cardId,
        stability:     empty.stability,
        difficulty:    empty.difficulty,
        elapsedDays:   empty.elapsed_days,
        scheduledDays: empty.scheduled_days,
        learningSteps: empty.learning_steps,
        reps:          empty.reps,
        lapses:        empty.lapses,
        state:         "NEW" as const,
        dueDate:       now,
      }))
    ),
    skipDuplicates: true,
  })

  return result.count
}
