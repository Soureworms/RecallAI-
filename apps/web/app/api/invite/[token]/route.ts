import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
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
}
