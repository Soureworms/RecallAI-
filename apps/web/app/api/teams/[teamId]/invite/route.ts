import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { canInviteTeamRole } from "@/lib/auth/capabilities"
import { requireRole, requireTeamAccess } from "@/lib/auth/permissions"
import { prisma } from "@/lib/db"
import { withHandler } from "@/lib/api/handler"
import { createInviteSchema } from "@/lib/schemas/api"
import { env } from "@/lib/env"

export const GET = withHandler<{ teamId: string }>(async (_req, { params }) => {
  const auth = await requireRole("MANAGER", { limiterKey: "api:manager", routeClass: "write" })
  if (!auth.ok) return auth.response
  const { session } = auth

  const teamAccess = await requireTeamAccess(session, params.teamId)
  if (!teamAccess.ok) return teamAccess.response

  const invites = await prisma.invite.findMany({
    where: { teamId: params.teamId, acceptedAt: null },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(invites)
})

export const POST = withHandler<{ teamId: string }>(async (req: NextRequest, { params }) => {
  const auth = await requireRole("MANAGER", { limiterKey: "api:manager", routeClass: "write" })
  if (!auth.ok) return auth.response
  const { session } = auth

  const teamAccess = await requireTeamAccess(session, params.teamId)
  if (!teamAccess.ok) return teamAccess.response

  const parsed = createInviteSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }
  const { email, role } = parsed.data
  if (!canInviteTeamRole(session.user.role, role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const existing = await prisma.invite.findFirst({
    where: {
      teamId: params.teamId,
      email,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
  })
  if (existing) {
    return NextResponse.json({
      invite: existing,
      inviteUrl: `${env.NEXTAUTH_URL}/invite/${existing.token}`,
    })
  }

  const token = randomUUID()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  const invite = await prisma.invite.create({
    data: {
      teamId: params.teamId,
      email,
      role,
      token,
      expiresAt,
      createdById: session.user.id,
    },
  })

  return NextResponse.json(
    { invite, inviteUrl: `${env.NEXTAUTH_URL}/invite/${invite.token}` },
    { status: 201 }
  )
})
