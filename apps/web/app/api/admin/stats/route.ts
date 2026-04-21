import { NextResponse } from "next/server"
import { requireSuperAdmin } from "@/lib/auth/permissions"
import { prisma } from "@/lib/db"

export async function GET() {
  const auth = await requireSuperAdmin()
  if (!auth.ok) return auth.response

  const [orgs, users, decks, reviews] = await Promise.all([
    prisma.organization.count(),
    prisma.user.count(),
    prisma.deck.count(),
    prisma.reviewLog.count(),
  ])

  return NextResponse.json({ orgs, users, decks, reviews })
}
