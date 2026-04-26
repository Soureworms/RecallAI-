import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { sendEmail } from "@/lib/email"
import { dailyDigestEmail } from "@/lib/emails/daily-digest"

// Called daily by QStash cron (or any scheduler).
// Schedule via QStash dashboard: cron "0 8 * * *" → POST /api/cron/daily-digest
// with header  Authorization: Bearer <CRON_SECRET>
//
// To register programmatically with QStash:
//   const client = new Client({ token: process.env.QSTASH_TOKEN! })
//   await client.schedules.create({
//     destination: `${process.env.NEXTAUTH_URL}/api/cron/daily-digest`,
//     cron: "0 8 * * *",
//     headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
//   })

export async function POST(req: NextRequest) {
  // ── Authenticate ────────────────────────────────────────────────────────────
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 })
  }
  const auth = req.headers.get("authorization") ?? ""
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const appUrl = (process.env.NEXTAUTH_URL ?? "").replace(/\/$/, "")
  const now = new Date()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  // ── Find agents who have cards due or newly assigned ────────────────────────
  // A UserCard is "new" if it was created in the last 24 hours (just approved/assigned).
  // A UserCard is "due" if its dueDate is at or before now.
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

    // Skip if nothing is actually due or new (shouldn't happen given WHERE clause, but defensive)
    if (dueCount === 0 && newCount === 0) {
      skipped++
      continue
    }

    // Build per-deck summary
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
}
