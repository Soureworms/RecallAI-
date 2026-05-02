"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Plus, Layers, Lock, FileText, RotateCcw } from "lucide-react"
import { Modal } from "@/components/ui/modal"
import { usePermissions } from "@/hooks/use-permissions"
import { toast } from "sonner"

type DeckWithCount = {
  id: string
  name: string
  description: string | null
  isMandatory: boolean
  isArchived: boolean
  inRotation: boolean
  _count: { cards: number }
}

function unwrapDecksResponse(data: DeckWithCount[] | { decks?: DeckWithCount[] }): DeckWithCount[] {
  return Array.isArray(data) ? data : data.decks ?? []
}

export default function DecksPage() {
  const router = useRouter()
  const { canManageContent: isManager } = usePermissions()
  const [decks, setDecks] = useState<DeckWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: "", description: "", isMandatory: false })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [studyMode, setStudyMode] = useState<"AUTO_ROTATE" | "MANUAL">("AUTO_ROTATE")
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const fetchDecks = useCallback(async () => {
    const [decksRes, settingsRes] = await Promise.all([
      fetch("/api/decks"),
      fetch("/api/org/settings"),
    ])
    if (decksRes.ok) setDecks(unwrapDecksResponse(await decksRes.json() as DeckWithCount[] | { decks?: DeckWithCount[] }))
    if (settingsRes.ok) {
      const s = await settingsRes.json() as { studyMode?: "AUTO_ROTATE" | "MANUAL" }
      setStudyMode(s.studyMode ?? "AUTO_ROTATE")
    }
    setLoading(false)
  }, [])

  useEffect(() => { void fetchDecks() }, [fetchDecks])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    const res = await fetch("/api/decks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (!res.ok) {
      const d = (await res.json()) as { error?: string }
      setError(d.error ?? "Failed to create deck")
      return
    }
    setShowCreate(false)
    setForm({ name: "", description: "", isMandatory: false })
    void fetchDecks()
  }

  async function handleToggleRotation(e: React.MouseEvent, deck: DeckWithCount) {
    e.stopPropagation()
    if (togglingId) return
    setTogglingId(deck.id)
    const next = !deck.inRotation
    try {
      const res = await fetch(`/api/decks/${deck.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inRotation: next }),
      })
      if (!res.ok) throw new Error("Failed to update")
      setDecks((prev) =>
        prev.map((d) => (d.id === deck.id ? { ...d, inRotation: next } : d))
      )
      toast.success(next ? "Deck added to rotation" : "Deck removed from rotation")
    } catch {
      toast.error("Could not update rotation setting")
    } finally {
      setTogglingId(null)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 12px", borderRadius: 8, marginTop: 4,
    border: "1px solid var(--ink-6)", background: "var(--paper-sunken)",
    fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--ink-1)",
    outline: "none", boxSizing: "border-box",
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--ink-1)" }}>Decks</h1>
          <p className="mt-1" style={{ fontSize: 13, color: "var(--ink-3)" }}>
            Manage your organisation&apos;s flashcard decks
          </p>
        </div>
        {isManager && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-r2 px-4 py-2"
            style={{
              background: "var(--ink-1)", color: "var(--paper)",
              fontSize: 13, fontWeight: 500, border: "1px solid transparent", cursor: "pointer",
            }}
          >
            <Plus className="h-4 w-4" />
            Create Deck
          </button>
        )}
      </div>

      {/* Manual-mode banner */}
      {isManager && !loading && studyMode === "MANUAL" && (
        <div style={{
          marginTop: 16,
          padding: "10px 14px",
          background: "var(--amber-50, #fffbeb)",
          border: "1px solid var(--amber-100, #fef3c7)",
          borderRadius: 10,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}>
          <RotateCcw size={14} style={{ color: "var(--amber-600, #d97706)", flexShrink: 0 }} strokeWidth={1.75} />
          <p style={{ fontSize: 12.5, color: "var(--amber-700, #b45309)", margin: 0 }}>
            Manual scheduling is active. Use the rotation toggle on each deck to control what your team studies.
          </p>
        </div>
      )}

      {isManager && !loading && decks.length > 0 && studyMode !== "MANUAL" && (
        <div style={{
          marginTop: 16,
          padding: "10px 14px",
          background: "var(--violet-50, #f5f3ff)",
          border: "1px solid var(--violet-100, #ede9fe)",
          borderRadius: 10,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}>
          <FileText size={14} style={{ color: "var(--violet-600, #7c3aed)", flexShrink: 0 }} strokeWidth={1.75} />
          <p style={{ fontSize: 12.5, color: "var(--violet-700, #6d28d9)", margin: 0 }}>
            To upload documents and generate cards with AI, open any deck and use the{" "}
            <strong>Add Content</strong> button.
          </p>
        </div>
      )}

      {loading ? (
        <div className="mt-10 text-center" style={{ fontSize: 13, color: "var(--ink-4)" }}>Loading…</div>
      ) : decks.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <Layers className="h-10 w-10" style={{ color: "var(--ink-5)" }} />
          <p style={{ fontSize: 14, color: "var(--ink-3)" }}>No decks yet.</p>
          {isManager && (
            <button
              onClick={() => setShowCreate(true)}
              style={{
                fontSize: 13, color: "var(--blue-600)", textDecoration: "none",
                background: "transparent", border: "none", cursor: "pointer",
              }}
            >
              Create the first deck
            </button>
          )}
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {decks.map((deck) => (
            <button
              key={deck.id}
              onClick={() => router.push(`/decks/${deck.id}`)}
              className="rounded-r3 p-5 text-left"
              style={{
                background: "var(--paper-raised)",
                border: "1px solid var(--ink-6)",
                boxShadow: "var(--shadow-1)",
                cursor: "pointer",
                transition: `box-shadow var(--dur-quick) var(--ease-out), border-color var(--dur-quick) var(--ease-out), transform var(--dur-quick) var(--ease-out)`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "var(--shadow-lift)"
                e.currentTarget.style.borderColor = "var(--ink-5)"
                e.currentTarget.style.transform = "translateY(-1px)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "var(--shadow-1)"
                e.currentTarget.style.borderColor = "var(--ink-6)"
                e.currentTarget.style.transform = "translateY(0)"
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--ink-1)" }}>{deck.name}</h3>
                <div className="flex items-center gap-1.5 shrink-0">
                  {deck.isMandatory && (
                    <span className="flex items-center gap-1 rounded-full px-2 py-0.5"
                      style={{ background: "var(--violet-50)", color: "var(--violet-600)", fontSize: 11, fontWeight: 500 }}
                    >
                      <Lock className="h-3 w-3" />
                      Mandatory
                    </span>
                  )}
                </div>
              </div>
              {deck.description && (
                <p className="mt-1 line-clamp-2" style={{ fontSize: 13, color: "var(--ink-3)", lineHeight: 1.5 }}>
                  {deck.description}
                </p>
              )}
              <div className="mt-3 flex items-center justify-between">
                <p style={{ fontSize: 12, fontWeight: 500, color: "var(--ink-4)", fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}>
                  {deck._count.cards} card{deck._count.cards !== 1 ? "s" : ""}
                </p>

                {/* Rotation toggle — only shown in MANUAL mode for managers */}
                {isManager && studyMode === "MANUAL" && !deck.isMandatory && (
                  <button
                    onClick={(e) => { void handleToggleRotation(e, deck) }}
                    disabled={togglingId === deck.id}
                    title={deck.inRotation ? "In rotation — click to pause" : "Paused — click to add to rotation"}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "3px 8px",
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 500,
                      border: "1px solid",
                      cursor: togglingId === deck.id ? "default" : "pointer",
                      opacity: togglingId === deck.id ? 0.5 : 1,
                      background: deck.inRotation ? "var(--green-50, #f0fdf4)" : "var(--paper-sunken)",
                      borderColor: deck.inRotation ? "var(--green-200, #bbf7d0)" : "var(--ink-6)",
                      color: deck.inRotation ? "var(--green-700, #15803d)" : "var(--ink-4)",
                    }}
                  >
                    <span style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: deck.inRotation ? "var(--green-500, #22c55e)" : "var(--ink-5)",
                      flexShrink: 0,
                    }} />
                    {deck.inRotation ? "In rotation" : "Paused"}
                  </button>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      <Modal
        isOpen={showCreate}
        onClose={() => { setShowCreate(false); setError(null) }}
        title="Create Deck"
      >
        <form onSubmit={(e) => { void handleCreate(e) }} className="space-y-4">
          {error && (
            <p className="rounded-r2 px-3 py-2"
              style={{ background: "var(--red-50)", border: "1px solid var(--red-100)", fontSize: 13, color: "var(--red-ink)" }}
            >
              {error}
            </p>
          )}
          <div>
            <label className="block" style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-2)" }}>
              Name
            </label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              style={inputStyle}
              placeholder="e.g. Product Knowledge"
              onFocus={(e) => { e.currentTarget.style.borderColor = "var(--blue-500)"; e.currentTarget.style.background = "var(--paper-raised)" }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "var(--ink-6)"; e.currentTarget.style.background = "var(--paper-sunken)" }}
            />
          </div>
          <div>
            <label className="block" style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-2)" }}>
              Description
            </label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              style={{ ...inputStyle, resize: "vertical" }}
              placeholder="Optional description"
              onFocus={(e) => { e.currentTarget.style.borderColor = "var(--blue-500)"; e.currentTarget.style.background = "var(--paper-raised)" }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "var(--ink-6)"; e.currentTarget.style.background = "var(--paper-sunken)" }}
            />
          </div>
          <label className="flex items-center gap-2" style={{ fontSize: 13, color: "var(--ink-2)", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={form.isMandatory}
              onChange={(e) => setForm((f) => ({ ...f, isMandatory: e.target.checked }))}
              style={{ accentColor: "var(--ink-1)" }}
            />
            <span>Mandatory for all agents</span>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="rounded-r2 px-4 py-2"
              style={{
                background: "transparent", color: "var(--ink-3)",
                border: "1px solid var(--ink-6)", fontSize: 13, cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-r2 px-4 py-2"
              style={{
                background: "var(--ink-1)", color: "var(--paper)",
                border: "1px solid transparent", fontSize: 13, fontWeight: 500,
                cursor: saving ? "default" : "pointer", opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
