import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"

export async function POST(req: NextRequest) {
  const body: unknown = await req.json()

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).name !== "string" ||
    typeof (body as Record<string, unknown>).email !== "string" ||
    typeof (body as Record<string, unknown>).password !== "string"
  ) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const { name, email, password } = body as {
    name: string
    email: string
    password: string
  }

  if (!name.trim() || !email.trim() || password.length < 8) {
    return NextResponse.json(
      { error: "Name, email required; password must be ≥8 chars" },
      { status: 400 }
    )
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json(
      { error: "Email already registered" },
      { status: 409 }
    )
  }

  const hashedPassword = await bcrypt.hash(password, 12)

  let org = await prisma.organization.findFirst()
  if (!org) {
    org = await prisma.organization.create({
      data: { name: "Default Organization" },
    })
  }

  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      hashedPassword,
      role: "AGENT",
      orgId: org.id,
    },
    select: { id: true },
  })

  return NextResponse.json({ id: user.id }, { status: 201 })
}
