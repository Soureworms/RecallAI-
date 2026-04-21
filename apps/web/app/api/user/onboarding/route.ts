import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth/permissions"
import { prisma } from "@/lib/db"

export async function POST() {
  const authResult = await requireRole("AGENT")
  if (!authResult.ok) return authResult.response
  const { session } = authResult

  await prisma.user.update({
    where: { id: session.user.id },
    data: { onboardedAt: new Date() },
  })

  return NextResponse.json({ ok: true })
}
