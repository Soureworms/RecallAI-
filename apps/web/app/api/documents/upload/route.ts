import { NextRequest, NextResponse } from "next/server"
import { createHash } from "crypto"
import { requireRole } from "@/lib/auth/permissions"
import { prisma } from "@/lib/db"

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

const ALLOWED_EXTENSIONS = new Set([".pdf", ".docx", ".txt", ".md"])
const EXT_TO_MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".txt": "text/plain",
  ".md": "text/markdown",
}

function fileExt(name: string): string {
  return "." + (name.split(".").pop() ?? "").toLowerCase()
}

async function extractText(buffer: Buffer, ext: string): Promise<string> {
  if (ext === ".pdf") {
    const { PDFParse } = await import("pdf-parse")
    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    return result.text
  }
  if (ext === ".docx") {
    const mammoth = await import("mammoth")
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  }
  return buffer.toString("utf-8")
}

export async function POST(req: NextRequest) {
  const authResult = await requireRole("MANAGER")
  if (!authResult.ok) return authResult.response
  const { session } = authResult

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: "Invalid multipart request" }, { status: 400 })
  }

  const file = formData.get("file") as File | null
  const deckId = formData.get("deckId") as string | null

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }

  const ext = fileExt(file.name)
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return NextResponse.json(
      { error: "Unsupported file type. Upload PDF, DOCX, TXT, or MD." },
      { status: 400 }
    )
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  if (buffer.length > MAX_BYTES) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 10 MB." },
      { status: 400 }
    )
  }

  // Verify deck ownership if provided
  if (deckId) {
    const deck = await prisma.deck.findUnique({ where: { id: deckId } })
    if (!deck || deck.orgId !== session.user.orgId) {
      return NextResponse.json({ error: "Deck not found" }, { status: 404 })
    }
  }

  // Create record in PROCESSING state first
  const doc = await prisma.sourceDocument.create({
    data: {
      orgId: session.user.orgId,
      filename: file.name,
      mimeType: file.type || EXT_TO_MIME[ext] || "application/octet-stream",
      sizeBytes: buffer.length,
      textContent: "",
      contentHash: "",
      status: "PROCESSING",
      uploadedById: session.user.id,
      deckId: deckId ?? null,
    },
  })

  // Extract text
  let textContent: string
  try {
    textContent = await extractText(buffer, ext)
  } catch (err) {
    await prisma.sourceDocument.update({
      where: { id: doc.id },
      data: { status: "ERROR" },
    })
    const msg = err instanceof Error ? err.message : "Text extraction failed"
    return NextResponse.json({ error: msg }, { status: 422 })
  }

  const contentHash = createHash("sha256").update(textContent).digest("hex")

  const updated = await prisma.sourceDocument.update({
    where: { id: doc.id },
    data: { textContent, contentHash, status: "READY" },
  })

  return NextResponse.json(updated, { status: 201 })
}
