import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"

// ─── Role hierarchy ───────────────────────────────────────────────────────────

const ROLE_RANK: Record<string, number> = {
  AGENT: 0,
  MANAGER: 1,
  ADMIN: 2,
}

export type MinRole = "AGENT" | "MANAGER" | "ADMIN"

export type AuthSession = {
  user: {
    id: string
    role: string
    orgId: string
    email: string
    name?: string | null
  }
}

type PermOk = { ok: true; session: AuthSession }
type PermErr = { ok: false; response: NextResponse }
export type PermResult = PermOk | PermErr

// ─── Core utilities ────────────────────────────────────────────────────────────

export async function requireRole(minRole: MinRole): Promise<PermResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    }
  }
  const { allowed } = checkRateLimit(`api:${session.user.id}`, 100, 60_000)
  if (!allowed) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Rate limit exceeded. Slow down." }, { status: 429 }),
    }
  }

  const userRank = ROLE_RANK[session.user.role] ?? 0
  const minRank = ROLE_RANK[minRole]
  if (userRank < minRank) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    }
  }
  return { ok: true, session: session as AuthSession }
}

// Verify team belongs to user's org and (for non-admins) user is a member.
export async function requireTeamAccess(
  session: AuthSession,
  teamId: string
): Promise<PermResult> {
  const team = await prisma.team.findUnique({ where: { id: teamId } })
  if (!team || team.orgId !== session.user.orgId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Not found" }, { status: 404 }),
    }
  }
  if (session.user.role === "ADMIN") return { ok: true, session }

  const membership = await prisma.teamMember.findUnique({
    where: { userId_teamId: { userId: session.user.id, teamId } },
  })
  if (!membership) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    }
  }
  return { ok: true, session }
}

// Verify that a userId belongs to the calling user's org.
export async function requireOrgAccess(
  session: AuthSession,
  targetUserId: string
): Promise<PermResult> {
  const target = await prisma.user.findUnique({ where: { id: targetUserId } })
  if (!target || target.orgId !== session.user.orgId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Not found" }, { status: 404 }),
    }
  }
  return { ok: true, session }
}

// ─── Pure helpers (no I/O) ────────────────────────────────────────────────────

export function isManagerPlus(role: string): boolean {
  return (ROLE_RANK[role] ?? 0) >= ROLE_RANK.MANAGER
}

export function isAdmin(role: string): boolean {
  return role === "ADMIN"
}
