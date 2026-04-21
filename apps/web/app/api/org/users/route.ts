import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { requireRole } from "@/lib/auth/permissions"
import { prisma } from "@/lib/db"
import { sendEmail } from "@/lib/email"
import type { Role } from "@prisma/client"

// GET /api/org/users — list all users in the caller's org (ADMIN+)
export async function GET() {
  const auth = await requireRole("ADMIN")
  if (!auth.ok) return auth.response

  const users = await prisma.user.findMany({
    where: { orgId: auth.session.user.orgId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      image: true,
      onboardedAt: true,
      createdAt: true,
    },
  })

  return NextResponse.json(users)
}

// POST /api/org/users — invite a new user into the caller's org (ADMIN+)
export async function POST(req: NextRequest) {
  const auth = await requireRole("ADMIN")
  if (!auth.ok) return auth.response

  const body = await req.json() as { name?: string; email?: string; role?: string }

  if (!body.email?.trim() || !body.name?.trim()) {
    return NextResponse.json({ error: "name and email are required" }, { status: 400 })
  }

  // ADMIN can only create AGENT or MANAGER in their own org
  const allowedRoles: Role[] = ["AGENT", "MANAGER"]
  const role: Role = allowedRoles.includes(body.role as Role) ? (body.role as Role) : "AGENT"

  const existing = await prisma.user.findUnique({ where: { email: body.email.trim().toLowerCase() } })
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 })
  }

  const tempPassword = crypto.randomUUID()
  const hashedPassword = await bcrypt.hash(tempPassword, 12)

  const user = await prisma.user.create({
    data: {
      name: body.name.trim(),
      email: body.email.trim().toLowerCase(),
      hashedPassword,
      role,
      orgId: auth.session.user.orgId,
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  })

  const token = crypto.randomUUID()
  await prisma.passwordResetToken.create({
    data: { userId: user.id, token, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60_000) },
  })
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000"
  const setupUrl = `${baseUrl}/reset-password/${token}`

  await sendEmail({
    to: user.email,
    subject: "You've been invited to RecallAI",
    html: `
      <p>Hi ${user.name},</p>
      <p>Your team admin has created a RecallAI account for you.</p>
      <p><a href="${setupUrl}" style="color:#4f46e5;font-weight:bold">Set up your password and sign in</a></p>
      <p>This link expires in <strong>7 days</strong>.</p>
      <p>— The RecallAI team</p>
    `,
    text: `You've been invited to RecallAI.\n\nSet your password here (link expires in 7 days):\n${setupUrl}`,
  })

  return NextResponse.json(user, { status: 201 })
}
