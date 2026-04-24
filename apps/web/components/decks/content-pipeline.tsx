"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Upload, Sparkles, CheckCheck, X, FileText } from "lucide-react"
import { Modal } from "@/components/ui/modal"

type PipelineStep = 1 | 2 | 3

type SourceDoc = {
  id: string
  filename: string
  status: string
  textContent?: string
}

type Props = {
  deckId: string
}

const STEPS = [
  { n: 1 as PipelineStep, label: "Upload" },
  { n: 2 as PipelineStep, label: "Generate" },
  { n: 3 as PipelineStep, label: "Review" },
]

export function ContentPipeline({ deckId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<PipelineStep>(1)

  // Step 1
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadedDoc, setUploadedDoc] = useState<SourceDoc | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Step 2
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  const [genCount, setGenCount] = useState<number | null>(null)

  function openWizard() {
    setStep(1)
    setUploadedDoc(null)
    setGenCount(null)
    setUploadError(null)
    setGenError(null)
    setOpen(true)
  }

  async function handleFile(file: File) {
    setUploading(true)
    setUploadError(null)
    const fd = new FormData()
    fd.append("file", file)
    fd.append("deckId", deckId)

    const res = await fetch("/api/documents/upload", { method: "POST", body: fd })
    setUploading(false)

    if (!res.ok) {
      const d = (await res.json()) as { error?: string }
      setUploadError(d.error ?? "Upload failed")
      return
    }

    const doc = await res.json() as SourceDoc
    setUploadedDoc(doc)
    setStep(2)
    void triggerGenerate(doc.id)
  }

  async function triggerGenerate(sourceDocumentId: string) {
    setGenerating(true)
    setGenError(null)

    const res = await fetch(`/api/decks/${deckId}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceDocumentId }),
    })

    setGenerating(false)

    if (!res.ok) {
      const d = (await res.json()) as { error?: string }
      setGenError(d.error ?? "Generation failed")
      return
    }

    const data = await res.json() as { count: number }
    setGenCount(data.count)
    setStep(3)
  }

  function finish() {
    setOpen(false)
    router.push(`/decks/${deckId}/review-cards`)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) void handleFile(file)
  }

  return (
    <>
      <button
        onClick={openWizard}
        className="flex items-center gap-2 rounded-lg border border-ds-blue-100 bg-ds-blue-50 px-4 py-2 text-sm font-medium text-ds-blue-ink hover:bg-ds-blue-100"
      >
        <Sparkles className="h-4 w-4" />
        Add Content
      </button>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Add Content" size="lg">
        {/* Step indicator */}
        <div className="mb-6 flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s.n} className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                  step === s.n
                    ? "bg-ink-1 text-white"
                    : step > s.n
                    ? "bg-ds-green-500 text-white"
                    : "bg-ink-6 text-ink-4"
                }`}
              >
                {step > s.n ? "✓" : s.n}
              </div>
              <span
                className={`text-sm ${step === s.n ? "font-medium text-ink-1" : "text-ink-4"}`}
              >
                {s.label}
              </span>
              {i < STEPS.length - 1 && (
                <div className={`h-px w-8 ${step > s.n ? "bg-ds-green-500" : "bg-ink-6"}`} />
              )}
            </div>
          ))}
        </div>

        {/* ── Step 1: Upload ─────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-4">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-12 transition-colors ${
                dragging ? "border-ds-blue-500 bg-ds-blue-50" : "border-ink-6 hover:border-ink-6"
              }`}
            >
              {uploading ? (
                <>
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-ds-blue-500 border-t-transparent" />
                  <p className="text-sm text-ink-3">Uploading and extracting text…</p>
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-ink-5" />
                  <p className="text-sm font-medium text-ink-2">
                    Drop a file here or click to browse
                  </p>
                  <p className="text-xs text-ink-4">PDF, DOCX, TXT, MD · max 10 MB</p>
                </>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.docx,.txt,.md"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void handleFile(file)
              }}
            />
            {uploadError && (
              <p className="flex items-center gap-2 rounded-lg bg-ds-red-50 px-3 py-2 text-sm text-ds-red-ink">
                <X className="h-4 w-4 shrink-0" />
                {uploadError}
              </p>
            )}
          </div>
        )}

        {/* ── Step 2: Generating ─────────────────────────────────────────── */}
        {step === 2 && (
          <div className="flex flex-col items-center gap-5 py-10">
            {generating ? (
              <>
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-ds-blue-500 border-t-transparent" />
                <div className="text-center">
                  <p className="font-medium text-ink-1">Generating cards with AI…</p>
                  {uploadedDoc && (
                    <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-ink-4">
                      <FileText className="h-4 w-4" />
                      {uploadedDoc.filename}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-ink-4">
                    This may take a moment for longer documents.
                  </p>
                </div>
              </>
            ) : genError ? (
              <div className="w-full space-y-3">
                <p className="rounded-lg bg-ds-red-50 px-4 py-3 text-sm text-ds-red-ink">{genError}</p>
                <button
                  onClick={() => { if (uploadedDoc) void triggerGenerate(uploadedDoc.id) }}
                  className="rounded-lg bg-ink-1 px-4 py-2 text-sm font-medium text-white hover:bg-ink-2"
                >
                  Retry
                </button>
              </div>
            ) : null}
          </div>
        )}

        {/* ── Step 3: Review ─────────────────────────────────────────────── */}
        {step === 3 && (
          <div className="flex flex-col items-center gap-5 py-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ds-green-100">
              <CheckCheck className="h-7 w-7 text-ds-green-ink" />
            </div>
            <div>
              <p className="text-lg font-semibold text-ink-1">
                Generation complete!
              </p>
              <p className="mt-1 text-sm text-ink-3">
                {genCount ?? 0} draft card{genCount !== 1 ? "s" : ""} created.
                Review and approve them before they go live.
              </p>
            </div>
            <button
              onClick={finish}
              className="rounded-xl bg-ink-1 px-6 py-2.5 text-sm font-semibold text-white hover:bg-ink-2"
            >
              Review Cards →
            </button>
          </div>
        )}
      </Modal>
    </>
  )
}
