"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Check, Pencil, X, ArrowLeft, CheckCheck } from "lucide-react"
import { usePermissions } from "@/hooks/use-permissions"

type CardFormat = "QA" | "TRUE_FALSE" | "FILL_BLANK"

type DraftCard = {
  id: string
  question: string
  answer: string
  format: CardFormat
  tags: string[]
  difficulty: number
  sourceDocumentId: string | null
}

const FORMAT_LABELS: Record<CardFormat, string> = {
  QA: "Q&A",
  TRUE_FALSE: "True / False",
  FILL_BLANK: "Fill in Blank",
}

const DIFF_LABELS = ["", "Easy", "Medium", "Hard"]

export default function ReviewCardsPage() {
  const { deckId } = useParams<{ deckId: string }>()
  const router = useRouter()
  const { canManageContent: isManagerBool } = usePermissions()

  const [cards, setCards] = useState<DraftCard[]>([])
  const [loading, setLoading] = useState(true)
  const [sourceText, setSourceText] = useState<string | null>(null)
  const [sourceDocId, setSourceDocId] = useState<string | null>(null)

  // Per-card edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ question: "", answer: "", format: "QA" as CardFormat, tags: "" })

  // Selection for bulk actions
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Session stats
  const [totalInitial, setTotalInitial] = useState(0)
  const [approved, setApproved] = useState(0)
  const [rejected, setRejected] = useState(0)

  const [working, setWorking] = useState(false)

  const isManager = isManagerBool

  const fetchCards = useCallback(async () => {
    const res = await fetch(`/api/decks/${deckId}/cards?status=DRAFT`)
    if (res.ok) {
      const data = await res.json() as DraftCard[]
      setCards(data)
      if (totalInitial === 0) setTotalInitial(data.length)
      // Load source text for the first card's document
      const firstDocId = data[0]?.sourceDocumentId ?? null
      if (firstDocId && firstDocId !== sourceDocId) {
        setSourceDocId(firstDocId)
        const docRes = await fetch(`/api/documents/${firstDocId}`)
        if (docRes.ok) {
          const doc = await docRes.json() as { textContent: string }
          setSourceText(doc.textContent)
        }
      }
    }
    setLoading(false)
  }, [deckId, totalInitial, sourceDocId])

  useEffect(() => { void fetchCards() }, [fetchCards])

  // Agents cannot access this page
  useEffect(() => {
    if (!isManagerBool) router.replace(`/decks/${deckId}`)
  }, [isManagerBool, router, deckId])

  function startEdit(card: DraftCard) {
    setEditingId(card.id)
    setEditForm({
      question: card.question,
      answer: card.answer,
      format: card.format,
      tags: card.tags.join(", "),
    })
  }

  async function handleApprove(cardId: string, withEdits = false) {
    setWorking(true)
    const body = withEdits
      ? {
          question: editForm.question,
          answer: editForm.answer,
          format: editForm.format,
          tags: editForm.tags.split(",").map((t) => t.trim()).filter(Boolean),
        }
      : {}

    const res = await fetch(`/api/decks/${deckId}/cards/${cardId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    setWorking(false)
    if (res.ok) {
      setApproved((n) => n + 1)
      setEditingId(null)
      setCards((prev) => prev.filter((c) => c.id !== cardId))
      setSelected((prev) => { const next = new Set(prev); next.delete(cardId); return next })
    }
  }

  async function handleReject(cardId: string) {
    setWorking(true)
    const res = await fetch(`/api/decks/${deckId}/cards/${cardId}`, { method: "DELETE" })
    setWorking(false)
    if (res.ok) {
      setRejected((n) => n + 1)
      setEditingId(null)
      setCards((prev) => prev.filter((c) => c.id !== cardId))
      setSelected((prev) => { const next = new Set(prev); next.delete(cardId); return next })
    }
  }

  async function handleBulkApprove(approveAll: boolean) {
    setWorking(true)
    const body = approveAll
      ? { approveAll: true }
      : { cardIds: Array.from(selected) }

    const res = await fetch(`/api/decks/${deckId}/cards/bulk-approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    setWorking(false)
    if (res.ok) {
      const data = await res.json() as { approved: number }
      setApproved((n) => n + data.approved)
      setSelected(new Set())
      void fetchCards()
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (!isManager) {
    return <div className="mt-10 text-center text-sm text-ink-3">Access denied.</div>
  }

  if (loading) {
    return <div className="mt-10 text-center text-sm text-ink-4">Loading…</div>
  }

  const reviewed = approved + rejected
  const remaining = cards.length

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6 overflow-hidden">
      {/* ── Left panel (cards) ───────────────────────────────────────────── */}
      <div className="flex w-3/5 flex-col overflow-hidden">
        {/* Back + stats */}
        <div className="mb-4 flex-none">
          <button
            onClick={() => router.push(`/decks/${deckId}`)}
            className="mb-3 flex items-center gap-1 text-sm text-ink-3 hover:text-ink-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Deck
          </button>
          <div className="flex items-center justify-between rounded-xl border border-ink-6 bg-paper-raised px-4 py-3 text-sm">
            <span className="text-ink-3">
              <span className="font-semibold text-ink-1">{reviewed}</span> of{" "}
              <span className="font-semibold text-ink-1">{totalInitial || remaining + reviewed}</span> reviewed
              {" "}·{" "}
              <span className="text-ds-green-ink font-semibold">{approved}</span> approved
              {" "}·{" "}
              <span className="text-ds-red-500 font-semibold">{rejected}</span> rejected
            </span>
            {remaining === 0 && (
              <span className="font-medium text-ds-green-ink">All done!</span>
            )}
          </div>
        </div>

        {/* Bulk actions */}
        {remaining > 0 && (
          <div className="mb-3 flex flex-none items-center gap-3">
            <button
              onClick={() => void handleBulkApprove(true)}
              disabled={working}
              className="flex items-center gap-1.5 rounded-lg bg-ds-green-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-ds-green-600 disabled:opacity-60"
            >
              <CheckCheck className="h-4 w-4" />
              Approve All ({remaining})
            </button>
            {selected.size > 0 && (
              <button
                onClick={() => void handleBulkApprove(false)}
                disabled={working}
                className="flex items-center gap-1.5 rounded-lg border border-ds-green-100 px-3 py-1.5 text-sm font-medium text-ds-green-ink hover:bg-ds-green-50 disabled:opacity-60"
              >
                <Check className="h-4 w-4" />
                Approve Selected ({selected.size})
              </button>
            )}
          </div>
        )}

        {/* Cards list */}
        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          {remaining === 0 ? (
            <div className="mt-10 text-center text-sm text-ink-4">
              No more draft cards.
            </div>
          ) : (
            cards.map((card) => (
              <div
                key={card.id}
                className="rounded-xl border border-ink-6 bg-paper-raised p-4 shadow-s1"
              >
                {editingId === card.id ? (
                  /* Edit mode */
                  <div className="space-y-3">
                    <textarea
                      rows={2}
                      value={editForm.question}
                      onChange={(e) => setEditForm((f) => ({ ...f, question: e.target.value }))}
                      className="w-full rounded-lg border border-ink-6 px-3 py-2 text-sm focus:border-ds-blue-500 focus:outline-none focus:ring-1 focus:ring-ds-blue-500"
                      placeholder="Question"
                    />
                    <textarea
                      rows={2}
                      value={editForm.answer}
                      onChange={(e) => setEditForm((f) => ({ ...f, answer: e.target.value }))}
                      className="w-full rounded-lg border border-ink-6 px-3 py-2 text-sm focus:border-ds-blue-500 focus:outline-none focus:ring-1 focus:ring-ds-blue-500"
                      placeholder="Answer"
                    />
                    <div className="flex gap-2">
                      <select
                        value={editForm.format}
                        onChange={(e) => setEditForm((f) => ({ ...f, format: e.target.value as CardFormat }))}
                        className="rounded-lg border border-ink-6 px-2 py-1.5 text-xs focus:border-ds-blue-500 focus:outline-none"
                      >
                        <option value="QA">Q&amp;A</option>
                        <option value="TRUE_FALSE">True / False</option>
                        <option value="FILL_BLANK">Fill in Blank</option>
                      </select>
                      <input
                        type="text"
                        value={editForm.tags}
                        onChange={(e) => setEditForm((f) => ({ ...f, tags: e.target.value }))}
                        className="flex-1 rounded-lg border border-ink-6 px-2 py-1.5 text-xs focus:border-ds-blue-500 focus:outline-none"
                        placeholder="Tags (comma-separated)"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => void handleApprove(card.id, true)}
                        disabled={working}
                        className="flex items-center gap-1 rounded-lg bg-ds-green-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-ds-green-600 disabled:opacity-60"
                      >
                        <Check className="h-3 w-3" /> Save & Approve
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="rounded-lg border border-ink-6 px-3 py-1.5 text-xs text-ink-3 hover:bg-paper-sunken"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* View mode */
                  <div>
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={selected.has(card.id)}
                        onChange={() => toggleSelect(card.id)}
                        className="mt-1 h-4 w-4 rounded border-ink-6 text-ds-blue-600"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-ink-1">{card.question}</p>
                        <p className="mt-1 text-sm text-ink-3">{card.answer}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span className="rounded-full bg-ink-6 px-2 py-0.5 text-xs text-ink-3">
                            {FORMAT_LABELS[card.format]}
                          </span>
                          <span className="rounded-full bg-ds-blue-50 px-2 py-0.5 text-xs text-ds-blue-600">
                            {DIFF_LABELS[card.difficulty] ?? "Easy"}
                          </span>
                          {card.tags.map((tag) => (
                            <span key={tag} className="rounded-full bg-ink-6 px-2 py-0.5 text-xs text-ink-4">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          onClick={() => void handleApprove(card.id)}
                          disabled={working}
                          className="rounded-lg bg-ds-green-500 p-1.5 text-white hover:bg-ds-green-600 disabled:opacity-60"
                          title="Approve"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => startEdit(card)}
                          className="rounded-lg border border-ink-6 p-1.5 text-ink-3 hover:bg-paper-sunken"
                          title="Edit & Approve"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => void handleReject(card.id)}
                          disabled={working}
                          className="rounded-lg border border-ds-red-100 p-1.5 text-ds-red-500 hover:bg-ds-red-50 disabled:opacity-60"
                          title="Reject"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Right panel (source doc) ─────────────────────────────────────── */}
      <div className="flex w-2/5 flex-col overflow-hidden rounded-xl border border-ink-6 bg-paper-raised">
        <div className="border-b border-ink-6 px-4 py-3">
          <h2 className="text-sm font-semibold text-ink-2">Source Document</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {sourceText ? (
            <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-ink-3">
              {sourceText}
            </pre>
          ) : (
            <p className="text-sm text-ink-4">No source document text available.</p>
          )}
        </div>
      </div>
    </div>
  )
}
