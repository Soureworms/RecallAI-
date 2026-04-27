import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { sendEmail } from "@/lib/email"
import { dailyDigestEmail } from "@/lib/emails/daily-digest"
import { withHandlerSimple } from "@/lib/api/handler"
import { env } from "@/lib/env"

// Called daily by QStash cron (or any scheduler).
// Schedule via QStash dashboard: cron "0 8 * * *" → POST /api/cron/daily-digest
// with header  Authorization: Bearer <CRON_SECRET>

export const POST = withHandlerSimple(async (req: NextRequest) => {
  if (!env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 })
  }
  const authHeader = req.headers.get("authorization") ?? ""
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const appUrl = env.NEXTAUTH_URL.replace(/\/$/, "")
  const now = new Date()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  const agents = await prisma.user.findMany({
    where: {
      role: "AGENT",
      userCards: {
        some: {
          card: { status: "ACTIVE", deck: { isArchived: false } },
          OR: [
            { dueDate: { lte: now } },
            { createdAt: { gte: yesterday } },
          ],
        },
      },
    },
    select: {
      id: true,
      email: true,
      name: true,
      userCards: {
        where: {
          card: { status: "ACTIVE", deck: { isArchived: false } },
        },
        select: {
          dueDate: true,
          createdAt: true,
          card: {
            select: {
              deckId: true,
              deck: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  })

  let sent = 0
  let skipped = 0

  for (const agent of agents) {
    const dueCards = agent.userCards.filter((uc) => uc.dueDate <= now)
    const newCards = agent.userCards.filter((uc) => uc.createdAt >= yesterday)

    const dueCount = dueCards.length
    const newCount = newCards.length

    if (dueCount === 0 && newCount === 0) {
      skipped++
      continue
    }

    const deckMap = new Map<string, { name: string; newCards: number; dueCards: number }>()
    for (const uc of agent.userCards) {
      const { id, name } = uc.card.deck
      if (!deckMap.has(id)) deckMap.set(id, { name, newCards: 0, dueCards: 0 })
      const entry = deckMap.get(id)!
      if (uc.dueDate <= now) entry.dueCards++
      if (uc.createdAt >= yesterday) entry.newCards++
    }
    const deckSummaries = Array.from(deckMap.values())
      .filter((d) => d.dueCards > 0 || d.newCards > 0)
      .sort((a, b) => b.newCards - a.newCards || b.dueCards - a.dueCards)

    const { subject, html, text } = dailyDigestEmail({
      name: agent.name,
      dueCount,
      newCount,
      deckSummaries,
      appUrl,
    })

    await sendEmail({ to: agent.email, subject, html, text })
    sent++
  }

  return NextResponse.json({ sent, skipped, total: agents.length })
})
