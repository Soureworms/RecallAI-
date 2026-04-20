import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { requireRole } from "@/lib/auth/permissions"
import { prisma } from "@/lib/db"

export async function GET(
  _req: NextRequest,
  { params }: { params: { teamId: string } }
) {
  const auth = await requireRole("MANAGER")
  if (!auth.ok) return auth.response
  const { session } = auth

  const team = await prisma.team.findUnique({ where: { id: params.teamId } })
  if (!team || team.orgId !== session.user.orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const invites = await prisma.invite.findMany({
    where: { teamId: params.teamId, acceptedAt: null },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(invites)
}

export async function POST(
  req: NextRequest,
  { params }: { params: { teamId: string } }
) {
  const auth = await requireRole("MANAGER")
  if (!auth.ok) return auth.response
  const { session } = auth

  const team = await prisma.team.findUnique({ where: { id: params.teamId } })
  if (!team || team.orgId !== session.user.orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // Non-admin managers must be team members
  if (session.user.role !== "ADMIN") {
    const membership = await prisma.teamMember.findUnique({
      where: { userId_teamId: { userId: session.user.id, teamId: params.teamId } },
    })
    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  }

  const body = (await req.json()) as { email?: string; role?: string }

  if (!body.email?.trim()) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 })
  }

  const role = body.role
  if (role !== "MANAGER" && role !== "AGENT") {
    return NextResponse.json(
      { error: "Role must be MANAGER or AGENT" },
      { status: 400 }
    )
  }

  const email = body.email.trim().toLowerCase()

  // Check for existing pending (non-expired, non-accepted) invite for this email+team
  const existing = await prisma.invite.findFirst({
    where: {
      teamId: params.teamId,
      email,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
  })
  if (existing) {
    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000"
    return NextResponse.json({
      invite: existing,
      inviteUrl: `${baseUrl}/invite/${existing.token}`,
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

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000"
  return NextResponse.json(
    {
      invite,
      inviteUrl: `${baseUrl}/invite/${invite.token}`,
    },
    { status: 201 }
  )
}
