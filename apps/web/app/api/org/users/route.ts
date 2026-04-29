import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { requireRole } from "@/lib/auth/permissions"
import { prisma } from "@/lib/db"
import { withHandlerSimple } from "@/lib/api/handler"
import { createOrgUserSchema } from "@/lib/schemas/api"
import { sendWelcomeEmail } from "@/lib/emails/invite"

// GET /api/org/users — list all users in the caller's org (ADMIN+)
export const GET = withHandlerSimple(async () => {
  const auth = await requireRole("ADMIN", { limiterKey: "api:admin", routeClass: "write" })
  if (!auth.ok) return auth.response

  const users = await prisma.user.findMany({
    where: { orgId: auth.session.user.orgId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true, name: true, email: true, role: true,
      image: true, onboardedAt: true, createdAt: true,
    },
  })

  return NextResponse.json(users)
})

// POST /api/org/users — invite a new user into the caller's org (ADMIN+)
export const POST = withHandlerSimple(async (req: NextRequest) => {
  const auth = await requireRole("ADMIN", { limiterKey: "api:admin", routeClass: "write" })
  if (!auth.ok) return auth.response

  const parsed = createOrgUserSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }
  const { name, email, role } = parsed.data

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 })
  }

  const hashedPassword = await bcrypt.hash(crypto.randomUUID(), 12)

  const user = await prisma.user.create({
    data: { name, email, hashedPassword, role, orgId: auth.session.user.orgId },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  })

  const token = crypto.randomUUID()
  await prisma.passwordResetToken.create({
    data: { userId: user.id, token, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60_000) },
  })
  await sendWelcomeEmail({ name: user.name ?? name, email: user.email, role, token })

  return NextResponse.json(user, { status: 201 })
})
