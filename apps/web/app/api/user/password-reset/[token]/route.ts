import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"

  const { allowed } = checkRateLimit(`pwd-reset-confirm:${ip}`, 10, 60_000)
  if (!allowed) {
    return NextResponse.json({ error: "Too many attempts." }, { status: 429 })
  }

  const body: unknown = await req.json()
  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).password !== "string"
  ) {
    return NextResponse.json({ error: "password is required" }, { status: 400 })
  }

  const { password } = body as { password: string }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    )
  }

  const record = await prisma.passwordResetToken.findUnique({
    where: { token: params.token },
  })

  if (!record || record.usedAt !== null) {
    return NextResponse.json(
      { error: "Reset link is invalid or already used." },
      { status: 400 }
    )
  }

  if (new Date() > record.expiresAt) {
    return NextResponse.json(
      { error: "Reset link has expired. Please request a new one." },
      { status: 400 }
    )
  }

  const hashedPassword = await bcrypt.hash(password, 12)

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { hashedPassword },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ])

  return NextResponse.json({ ok: true })
}
