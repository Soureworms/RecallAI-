import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth/permissions"
import { prisma } from "@/lib/db"
import { sendEmail } from "@/lib/email"
import { checkRateLimit } from "@/lib/rate-limit"
import { withHandlerSimple } from "@/lib/api/handler"
import { env } from "@/lib/env"

export const POST = withHandlerSimple(async () => {
  const authResult = await requireRole("AGENT")
  if (!authResult.ok) return authResult.response
  const { session } = authResult

  const { allowed } = await checkRateLimit(`pwd-reset:${session.user.id}`, 3, 10 * 60_000)
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many reset requests. Please wait before trying again." },
      { status: 429 }
    )
  }

  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 60 * 60_000)

  await prisma.passwordResetToken.deleteMany({
    where: { userId: session.user.id, usedAt: null },
  })

  await prisma.passwordResetToken.create({
    data: { userId: session.user.id, token, expiresAt },
  })

  const resetUrl = `${env.NEXTAUTH_URL}/reset-password/${token}`

  await sendEmail({
    to: session.user.email,
    subject: "Reset your RecallAI password",
    html: `
      <p>Hi ${session.user.name ?? "there"},</p>
      <p>You requested a password reset for your RecallAI account.</p>
      <p><a href="${resetUrl}" style="color:#4f46e5;font-weight:bold">Reset my password</a></p>
      <p>This link expires in <strong>1 hour</strong>. If you didn't request this, you can safely ignore this email.</p>
      <p>— The RecallAI team</p>
    `,
    text: `Reset your RecallAI password\n\nVisit this link to reset your password (expires in 1 hour):\n${resetUrl}\n\nIf you didn't request this, ignore this email.`,
  })

  return NextResponse.json({ ok: true })
})
