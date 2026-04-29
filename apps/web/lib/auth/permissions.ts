import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import {
  checkRateLimitWithPolicy,
  rateLimitHeaders,
  type RouteClass,
} from "@/lib/rate-limit"

const ROLE_RANK: Record<string, number> = {
  AGENT: 0,
  MANAGER: 1,
  ADMIN: 2,
  SUPER_ADMIN: 3,
}

export async function requireSuperAdmin(): Promise<PermResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }
  if (session.user.role !== "SUPER_ADMIN") {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }
  return { ok: true, session: session as AuthSession }
}

export type MinRole = "AGENT" | "MANAGER" | "ADMIN"

export type AuthSession = {
  user: { id: string; role: string; orgId: string; email: string; name?: string | null }
}

type PermOk = { ok: true; session: AuthSession }
type PermErr = { ok: false; response: NextResponse }
export type PermResult = PermOk | PermErr

type RequireRoleOptions = {
  limiterKey: string
  routeClass?: RouteClass
}

export async function requireRole(minRole: MinRole, options: RequireRoleOptions): Promise<PermResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }

  const result = await checkRateLimitWithPolicy(
    `${options.limiterKey}:${session.user.id}`,
    options.routeClass ?? "read"
  )
  if (!result.allowed) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Rate limit exceeded. Slow down." },
        { status: 429, headers: rateLimitHeaders(result) }
      ),
    }
  }

  const userRank = ROLE_RANK[session.user.role] ?? 0
  const minRank = ROLE_RANK[minRole]
  if (userRank < minRank) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }
  return { ok: true, session: session as AuthSession }
}

export async function requireTeamAccess(session: AuthSession, teamId: string): Promise<PermResult> {
  const team = await prisma.team.findUnique({ where: { id: teamId } })
  if (!team || team.orgId !== session.user.orgId) {
    return { ok: false, response: NextResponse.json({ error: "Not found" }, { status: 404 }) }
  }
  if (session.user.role === "ADMIN") return { ok: true, session }

  const membership = await prisma.teamMember.findUnique({
    where: { userId_teamId: { userId: session.user.id, teamId } },
  })
  if (!membership) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }
  return { ok: true, session }
}

export async function requireOrgAccess(session: AuthSession, targetUserId: string): Promise<PermResult> {
  const target = await prisma.user.findUnique({ where: { id: targetUserId } })
  if (!target || target.orgId !== session.user.orgId) {
    return { ok: false, response: NextResponse.json({ error: "Not found" }, { status: 404 }) }
  }
  return { ok: true, session }
}

export function isManagerPlus(role: string): boolean {
  return (ROLE_RANK[role] ?? 0) >= ROLE_RANK.MANAGER
}

export function isAdmin(role: string): boolean {
  return role === "ADMIN"
}
