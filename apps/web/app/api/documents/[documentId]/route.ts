import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/auth/permissions"
import { prisma } from "@/lib/db"

export async function GET(
  _req: NextRequest,
  { params }: { params: { documentId: string } }
) {
  const auth = await requireRole("MANAGER")
  if (!auth.ok) return auth.response
  const { session } = auth

  // Shared workspace: org-scoped isolation is the boundary here.
  // Any MANAGER in the org can retrieve any org document — intentional under Option A.
  const doc = await prisma.sourceDocument.findUnique({
    where: { id: params.documentId },
  })

  if (!doc || doc.orgId !== session.user.orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json(doc)
}
