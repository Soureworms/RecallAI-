import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"
import type { Role } from "@prisma/client"

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const invite = await prisma.invite.findUnique({
    where: { token: params.token },
    include: { team: true },
  })

  if (!invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 })
  }
  if (invite.acceptedAt) {
    return NextResponse.json({ error: "Invite already accepted" }, { status: 410 })
  }
  if (invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "Invite has expired" }, { status: 410 })
  }

  const body = (await req.json()) as {
    name?: string
    password?: string
  }

  if (!body.password || body.password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    )
  }

  const existingUser = await prisma.user.findUnique({ where: { email: invite.email } })

  let userId: string

  if (existingUser) {
    // Verify password for existing user
    const valid = await bcrypt.compare(body.password, existingUser.hashedPassword)
    if (!valid) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 })
    }
    userId = existingUser.id
  } else {
    // New user — name is required
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Name is required for new accounts" }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(body.password, 12)

    const newUser = await prisma.user.create({
      data: {
        name: body.name.trim(),
        email: invite.email,
        hashedPassword,
        role: invite.role as Role,
        orgId: invite.team.orgId,
      },
      select: { id: true },
    })
    userId = newUser.id
  }

  // Add to team (idempotent) and mark invite accepted
  await prisma.$transaction([
    prisma.teamMember.upsert({
      where: { userId_teamId: { userId, teamId: invite.teamId } },
      create: { userId, teamId: invite.teamId },
      update: {},
    }),
    prisma.invite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    }),
  ])

  return NextResponse.json({ email: invite.email })
}
