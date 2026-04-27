import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"
import { withHandler } from "@/lib/api/handler"
import { acceptInviteSchema } from "@/lib/schemas/api"
import type { Role } from "@prisma/client"

export const POST = withHandler<{ token: string }>(async (req: NextRequest, { params }) => {
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

  const parsed = acceptInviteSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }
  const { name, password } = parsed.data

  const existingUser = await prisma.user.findUnique({ where: { email: invite.email } })
  let userId: string

  if (existingUser) {
    const valid = await bcrypt.compare(password, existingUser.hashedPassword)
    if (!valid) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 })
    }
    userId = existingUser.id
  } else {
    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required for new accounts" }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)
    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: invite.email,
        hashedPassword,
        role: invite.role as Role,
        orgId: invite.team.orgId,
      },
      select: { id: true },
    })
    userId = newUser.id
  }

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
})
