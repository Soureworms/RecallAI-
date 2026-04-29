import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/auth/permissions"
import { prisma } from "@/lib/db"
import { withHandlerSimple } from "@/lib/api/handler"
import { updateProfileSchema } from "@/lib/schemas/api"

const MAX_IMAGE_BYTES = 200 * 1024

export const PATCH = withHandlerSimple(async (req: NextRequest) => {
  const authResult = await requireRole("AGENT", { limiterKey: "api:agent", routeClass: "read" })
  if (!authResult.ok) return authResult.response
  const { session } = authResult

  const parsed = updateProfileSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }
  const { name, image } = parsed.data

  if (image && Buffer.byteLength(image, "utf8") > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "Image too large (max 200 KB)" }, { status: 413 })
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(image !== undefined ? { image: image ?? null } : {}),
    },
    select: { id: true, name: true, image: true, email: true },
  })

  return NextResponse.json(updated)
})
