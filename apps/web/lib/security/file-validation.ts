// File signature bytes (magic bytes) for each accepted binary format.
// Checking actual bytes prevents extension-renamed payloads (e.g. malware.exe → malware.pdf).
const MAGIC_BYTES: Record<string, readonly number[]> = {
  // %PDF
  ".pdf":  [0x25, 0x50, 0x44, 0x46],
  // PK\x03\x04 — ZIP-based format used by OOXML (.docx, .xlsx, etc.)
  ".docx": [0x50, 0x4B, 0x03, 0x04],
}

export function verifyMagicBytes(buffer: Buffer, ext: string): boolean {
  const sig = MAGIC_BYTES[ext]
  if (!sig) return true // .txt / .md have no fixed binary signature
  if (buffer.length < sig.length) return false
  return sig.every((byte, i) => buffer[i] === byte)
}

// Remove path-traversal characters and OS-reserved names before storing.
export function sanitizeFilename(name: string): string {
  return (
    name
      .replace(/[/\\:*?"<>|]/g, "_")  // OS-special / path separator chars
      .replace(/\.{2,}/g, "_")        // .. directory traversal
      .replace(/^[.\s]+/, "_")        // leading dots / spaces
      .slice(0, 200)
      .trim() || "upload"
  )
}

// Sanitize and cap the tags array from user / AI input.
// Returns a clean array: lowercase, deduplicated, max 10 items, each ≤ 50 chars.
export function sanitizeTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const t of raw) {
    if (typeof t !== "string") continue
    const clean = t.trim().toLowerCase().slice(0, 50)
    if (!clean || /[\x00-\x1f\x7f]/.test(clean) || seen.has(clean)) continue
    seen.add(clean)
    out.push(clean)
    if (out.length === 10) break
  }
  return out
}
