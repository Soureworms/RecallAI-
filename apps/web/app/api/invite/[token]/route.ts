import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withHandler } from "@/lib/api/handler"

export const GET = withHandler<{ token: string }>(async (_req, { params }) => {
  const invite = await prisma.invite.findUnique({
    where: { token: params.token },
    include: { team: { select: { name: true } } },
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

  return NextResponse.json({
    teamName: invite.team.name,
    email: invite.email,
    role: invite.role,
    expiresAt: invite.expiresAt,
  })
})
