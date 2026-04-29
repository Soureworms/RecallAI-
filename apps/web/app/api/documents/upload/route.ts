import { NextResponse } from "next/server"
import { createHash } from "crypto"
import { requireRole } from "@/lib/auth/permissions"
import { checkRateLimit } from "@/lib/rate-limit"
import { prisma } from "@/lib/db"
import { verifyMagicBytes, sanitizeFilename } from "@/lib/security/file-validation"
import { withHandlerSimple } from "@/lib/api/handler"

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

const ALLOWED_EXTENSIONS = new Set([".pdf", ".docx", ".txt", ".md"])
const EXT_TO_MIME: Record<string, string> = {
  ".pdf":  "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".txt":  "text/plain",
  ".md":   "text/markdown",
}

function fileExt(name: string): string {
  return "." + (name.split(".").pop() ?? "").toLowerCase()
}

async function extractText(buffer: Buffer, ext: string): Promise<string> {
  if (ext === ".pdf") {
    const pdfParse = (await import("pdf-parse")).default
    const result = await pdfParse(buffer)
    return result.text
  }
  if (ext === ".docx") {
    const mammoth = await import("mammoth")
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  }
  return buffer.toString("utf-8")
}

export const POST = withHandlerSimple(async (req) => {
  // ── Auth & role ───────────────────────────────────────────────────────────
  const authResult = await requireRole("MANAGER", { limiterKey: "api:manager", routeClass: "write" })
  if (!authResult.ok) return authResult.response
  const { session } = authResult

  // ── Upload-specific rate limit: 10 per hour per user ─────────────────────
  const { allowed: uploadAllowed } = await checkRateLimit(
    `upload:${session.user.id}`,
    10,
    60 * 60 * 1000,
  )
  if (!uploadAllowed) {
    return NextResponse.json(
      { error: "Upload limit reached. You can upload up to 10 files per hour." },
      { status: 429 },
    )
  }

  // ── Parse multipart form ──────────────────────────────────────────────────
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: "Invalid multipart request" }, { status: 400 })
  }

  const file   = formData.get("file")   as File | null
  const deckId = formData.get("deckId") as string | null

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }

  // ── Extension allow-list ──────────────────────────────────────────────────
  const ext = fileExt(file.name)
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return NextResponse.json(
      { error: "Unsupported file type. Upload PDF, DOCX, TXT, or MD." },
      { status: 400 },
    )
  }

  // ── Read buffer & size check ──────────────────────────────────────────────
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  if (buffer.length > MAX_BYTES) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 10 MB." },
      { status: 400 },
    )
  }

  // ── Magic-byte verification: reject extension-renamed payloads ────────────
  if (!verifyMagicBytes(buffer, ext)) {
    return NextResponse.json(
      { error: "File content does not match its declared type." },
      { status: 400 },
    )
  }

  // ── Sanitize filename ─────────────────────────────────────────────────────
  const safeFilename = sanitizeFilename(file.name)

  // ── Verify deck ownership if deckId supplied ──────────────────────────────
  if (deckId) {
    const deck = await prisma.deck.findUnique({ where: { id: deckId } })
    if (!deck || deck.orgId !== session.user.orgId) {
      return NextResponse.json({ error: "Deck not found" }, { status: 404 })
    }
  }

  // ── Create record in PROCESSING state ────────────────────────────────────
  const doc = await prisma.sourceDocument.create({
    data: {
      orgId:        session.user.orgId,
      filename:     safeFilename,
      mimeType:     EXT_TO_MIME[ext] ?? "application/octet-stream",
      sizeBytes:    buffer.length,
      textContent:  "",
      contentHash:  "",
      status:       "PROCESSING",
      uploadedById: session.user.id,
      deckId:       deckId ?? null,
    },
  })

  // ── Extract text ──────────────────────────────────────────────────────────
  let textContent: string
  try {
    textContent = await extractText(buffer, ext)
  } catch (err) {
    await prisma.sourceDocument.update({
      where: { id: doc.id },
      data:  { status: "ERROR" },
    })
    const msg = err instanceof Error ? err.message : "Text extraction failed"
    return NextResponse.json({ error: msg }, { status: 422 })
  }

  const contentHash = createHash("sha256").update(textContent).digest("hex")

  // ── Duplicate detection: same text content already exists in this org ─────
  const duplicate = await prisma.sourceDocument.findFirst({
    where: {
      orgId:       session.user.orgId,
      contentHash,
      id:          { not: doc.id },
      status:      { not: "ERROR" },
    },
    select: { id: true, filename: true },
  })

  if (duplicate) {
    // Clean up the zombie PROCESSING record before rejecting
    await prisma.sourceDocument.delete({ where: { id: doc.id } })
    return NextResponse.json(
      { error: `Duplicate: this content was already uploaded as "${duplicate.filename}".` },
      { status: 409 },
    )
  }

  // ── Finalise ──────────────────────────────────────────────────────────────
  const updated = await prisma.sourceDocument.update({
    where: { id: doc.id },
    data:  { textContent, contentHash, status: "READY" },
  })

  return NextResponse.json(updated, { status: 201 })
})
