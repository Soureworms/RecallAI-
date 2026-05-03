import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import {
  checkRateLimitWithPolicy,
  rateLimitHeaders,
  type RouteClass,
} from "@/lib/rate-limit"

import { ROLE_RANK, assertRole, type Role } from "@/lib/auth/roles"
import { canManageDeckContent } from "@/lib/auth/capabilities"

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

export type MinRole = Exclude<Role, "SUPER_ADMIN">

export type AuthSession = {
  user: { id: string; role: Role; orgId: string; email: string; name?: string | null }
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

  const role = assertRole(session.user.role, "session user role")
  const userRank = ROLE_RANK[role]
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

export function requireDeckContentManager(session: AuthSession): PermResult {
  if (!canManageDeckContent(session.user.role)) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }
  return { ok: true, session }
}

export function isManagerPlus(role: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK.MANAGER
}

export function isAdmin(role: Role): boolean {
  return role === "ADMIN"
}
