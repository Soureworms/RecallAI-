import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { requireSuperAdmin } from "@/lib/auth/permissions"
import { prisma } from "@/lib/db"
import { withHandlerSimple } from "@/lib/api/handler"
import { createPlatformUserSchema } from "@/lib/schemas/api"
import { sendWelcomeEmail } from "@/lib/emails/invite"

export const GET = withHandlerSimple(async () => {
  const auth = await requireSuperAdmin()
  if (!auth.ok) return auth.response

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true, name: true, email: true, role: true, image: true,
      onboardedAt: true, createdAt: true,
      org: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(users)
})

export const POST = withHandlerSimple(async (req: NextRequest) => {
  const auth = await requireSuperAdmin()
  if (!auth.ok) return auth.response

  const parsed = createPlatformUserSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }
  const { name, email, role, orgId, sendWelcomeEmail: doSend } = parsed.data

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 })
  }

  const hashedPassword = await bcrypt.hash(crypto.randomUUID(), 12)

  const user = await prisma.user.create({
    data: { name, email, hashedPassword, role, orgId },
    select: {
      id: true, name: true, email: true, role: true, createdAt: true,
      org: { select: { id: true, name: true } },
    },
  })

  if (doSend) {
    const token = crypto.randomUUID()
    await prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60_000) },
    })
    await sendWelcomeEmail({ name: user.name ?? name, email: user.email, role, token })
  }

  return NextResponse.json(user, { status: 201 })
})
