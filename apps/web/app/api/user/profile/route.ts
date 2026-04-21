import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/auth/permissions"
import { prisma } from "@/lib/db"

const MAX_IMAGE_BYTES = 200 * 1024 // 200 KB after base64 (≈150 KB raw)

export async function PATCH(req: NextRequest) {
  const authResult = await requireRole("AGENT")
  if (!authResult.ok) return authResult.response
  const { session } = authResult

  const body: unknown = await req.json()
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  const { name, image } = body as Record<string, unknown>

  if (name !== undefined && (typeof name !== "string" || !name.trim())) {
    return NextResponse.json({ error: "Name must be a non-empty string" }, { status: 400 })
  }

  if (image !== undefined && image !== null) {
    if (typeof image !== "string") {
      return NextResponse.json({ error: "Image must be a data URL string" }, { status: 400 })
    }
    if (!image.startsWith("data:image/")) {
      return NextResponse.json({ error: "Image must be a data URL" }, { status: 400 })
    }
    if (Buffer.byteLength(image, "utf8") > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "Image too large (max 200 KB)" }, { status: 413 })
    }
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(typeof name === "string" ? { name: name.trim() } : {}),
      ...(image !== undefined ? { image: image === null ? null : (image as string) } : {}),
    },
    select: { id: true, name: true, image: true, email: true },
  })

  return NextResponse.json(updated)
}
