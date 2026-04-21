import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { requireSuperAdmin } from "@/lib/auth/permissions"
import { prisma } from "@/lib/db"
import { sendEmail } from "@/lib/email"
import type { Role } from "@prisma/client"

export async function GET() {
  const auth = await requireSuperAdmin()
  if (!auth.ok) return auth.response

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      image: true,
      onboardedAt: true,
      createdAt: true,
      org: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(users)
}

export async function POST(req: NextRequest) {
  const auth = await requireSuperAdmin()
  if (!auth.ok) return auth.response

  const body = await req.json() as {
    name?: string
    email?: string
    role?: string
    orgId?: string
    sendWelcomeEmail?: boolean
  }

  if (!body.email?.trim() || !body.name?.trim() || !body.orgId) {
    return NextResponse.json({ error: "name, email, and orgId are required" }, { status: 400 })
  }

  const validRoles: Role[] = ["AGENT", "MANAGER", "ADMIN", "SUPER_ADMIN"]
  const role: Role = validRoles.includes(body.role as Role) ? (body.role as Role) : "AGENT"

  const existing = await prisma.user.findUnique({ where: { email: body.email.trim() } })
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 })
  }

  // Create with a secure random temp password — user will set their own via reset email
  const tempPassword = crypto.randomUUID()
  const hashedPassword = await bcrypt.hash(tempPassword, 12)

  const user = await prisma.user.create({
    data: {
      name: body.name.trim(),
      email: body.email.trim().toLowerCase(),
      hashedPassword,
      role,
      orgId: body.orgId,
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true, org: { select: { id: true, name: true } } },
  })

  // Send a password reset email so the new user can set their own password
  if (body.sendWelcomeEmail !== false) {
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
        <p>A RecallAI account has been created for you${role !== "AGENT" ? ` with the <strong>${role}</strong> role` : ""}.</p>
        <p><a href="${setupUrl}" style="color:#4f46e5;font-weight:bold">Set up your password and sign in</a></p>
        <p>This link expires in <strong>7 days</strong>.</p>
        <p>— The RecallAI team</p>
      `,
      text: `You've been invited to RecallAI.\n\nSet your password here (link expires in 7 days):\n${setupUrl}`,
    })
  }

  return NextResponse.json(user, { status: 201 })
}
