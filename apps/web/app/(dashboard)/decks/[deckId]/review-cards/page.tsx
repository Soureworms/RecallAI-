"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Check, Pencil, X, ArrowLeft, CheckCheck } from "lucide-react"

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
  const { data: session } = useSession()

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

  const isManager = session?.user?.role === "MANAGER" || session?.user?.role === "ADMIN"

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
    return <div className="mt-10 text-center text-sm text-gray-500">Access denied.</div>
  }

  if (loading) {
    return <div className="mt-10 text-center text-sm text-gray-400">Loading…</div>
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
            className="mb-3 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Deck
          </button>
          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm">
            <span className="text-gray-500">
              <span className="font-semibold text-gray-900">{reviewed}</span> of{" "}
              <span className="font-semibold text-gray-900">{totalInitial || remaining + reviewed}</span> reviewed
              {" "}·{" "}
              <span className="text-green-600 font-semibold">{approved}</span> approved
              {" "}·{" "}
              <span className="text-red-500 font-semibold">{rejected}</span> rejected
            </span>
            {remaining === 0 && (
              <span className="font-medium text-green-600">All done!</span>
            )}
          </div>
        </div>

        {/* Bulk actions */}
        {remaining > 0 && (
          <div className="mb-3 flex flex-none items-center gap-3">
            <button
              onClick={() => void handleBulkApprove(true)}
              disabled={working}
              className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-500 disabled:opacity-60"
            >
              <CheckCheck className="h-4 w-4" />
              Approve All ({remaining})
            </button>
            {selected.size > 0 && (
              <button
                onClick={() => void handleBulkApprove(false)}
                disabled={working}
                className="flex items-center gap-1.5 rounded-lg border border-green-200 px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-50 disabled:opacity-60"
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
            <div className="mt-10 text-center text-sm text-gray-400">
              No more draft cards.
            </div>
          ) : (
            cards.map((card) => (
              <div
                key={card.id}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                {editingId === card.id ? (
                  /* Edit mode */
                  <div className="space-y-3">
                    <textarea
                      rows={2}
                      value={editForm.question}
                      onChange={(e) => setEditForm((f) => ({ ...f, question: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="Question"
                    />
                    <textarea
                      rows={2}
                      value={editForm.answer}
                      onChange={(e) => setEditForm((f) => ({ ...f, answer: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="Answer"
                    />
                    <div className="flex gap-2">
                      <select
                        value={editForm.format}
                        onChange={(e) => setEditForm((f) => ({ ...f, format: e.target.value as CardFormat }))}
                        className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:border-indigo-500 focus:outline-none"
                      >
                        <option value="QA">Q&amp;A</option>
                        <option value="TRUE_FALSE">True / False</option>
                        <option value="FILL_BLANK">Fill in Blank</option>
                      </select>
                      <input
                        type="text"
                        value={editForm.tags}
                        onChange={(e) => setEditForm((f) => ({ ...f, tags: e.target.value }))}
                        className="flex-1 rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:border-indigo-500 focus:outline-none"
                        placeholder="Tags (comma-separated)"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => void handleApprove(card.id, true)}
                        disabled={working}
                        className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-500 disabled:opacity-60"
                      >
                        <Check className="h-3 w-3" /> Save & Approve
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
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
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{card.question}</p>
                        <p className="mt-1 text-sm text-gray-500">{card.answer}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                            {FORMAT_LABELS[card.format]}
                          </span>
                          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-600">
                            {DIFF_LABELS[card.difficulty] ?? "Easy"}
                          </span>
                          {card.tags.map((tag) => (
                            <span key={tag} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-400">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          onClick={() => void handleApprove(card.id)}
                          disabled={working}
                          className="rounded-lg bg-green-600 p-1.5 text-white hover:bg-green-500 disabled:opacity-60"
                          title="Approve"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => startEdit(card)}
                          className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50"
                          title="Edit & Approve"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => void handleReject(card.id)}
                          disabled={working}
                          className="rounded-lg border border-red-100 p-1.5 text-red-400 hover:bg-red-50 disabled:opacity-60"
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
      <div className="flex w-2/5 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-700">Source Document</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {sourceText ? (
            <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-gray-600">
              {sourceText}
            </pre>
          ) : (
            <p className="text-sm text-gray-400">No source document text available.</p>
          )}
        </div>
      </div>
    </div>
  )
}
