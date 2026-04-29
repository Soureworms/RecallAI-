import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { sendEmail } from "@/lib/email"
import { checkRateLimit } from "@/lib/rate-limit"
import { withHandlerSimple } from "@/lib/api/handler"
import { env } from "@/lib/env"

export const POST = withHandlerSimple(async (req: NextRequest) => {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"

  const { allowed } = await checkRateLimit(`forgot-password:${ip}`, 5, 10 * 60_000)
  if (!allowed) {
    return NextResponse.json({ error: "Too many attempts. Please wait before trying again." }, { status: 429 })
  }

  const body = await req.json().catch(() => null) as { email?: string } | null
  const email = body?.email?.trim().toLowerCase()

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { email } })

  if (user) {
    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 60 * 60_000)

    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } })
    await prisma.passwordResetToken.create({ data: { userId: user.id, token, expiresAt } })

    const resetUrl = `${env.NEXTAUTH_URL}/reset-password/${token}`

    await sendEmail({
      to: user.email,
      subject: "Reset your RecallAI password",
      html: `
        <p>Hi ${user.name ?? "there"},</p>
        <p>You requested a password reset for your RecallAI account.</p>
        <p><a href="${resetUrl}" style="color:#4f46e5;font-weight:bold">Reset my password</a></p>
        <p>This link expires in <strong>1 hour</strong>. If you didn't request this, you can safely ignore this email.</p>
        <p>The RecallAI team</p>
      `,
      text: `Reset your RecallAI password\n\nVisit this link to reset your password (expires in 1 hour):\n${resetUrl}\n\nIf you didn't request this, ignore this email.`,
    })
  }

  return NextResponse.json({ ok: true })
})
