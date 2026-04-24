"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  Plus, ArrowLeft, Pencil, Archive, Lock, Users,
  FileText, RefreshCw, AlertTriangle, ClipboardCheck,
} from "lucide-react"
import { Modal } from "@/components/ui/modal"
import { ContentPipeline } from "@/components/decks/content-pipeline"

type CardFormat = "QA" | "TRUE_FALSE" | "FILL_BLANK"
type CardStatus = "DRAFT" | "ACTIVE" | "ARCHIVED"

type Card = {
  id: string
  question: string
  answer: string
  format: CardFormat
  status: CardStatus
}

type DeckDetail = {
  id: string
  name: string
  description: string | null
  isMandatory: boolean
  isArchived: boolean
  _count: { cards: number }
}

type TeamMemberUser = { id: string; name: string | null; email: string }
type Team = { id: string; name: string; members: { userId: string; user: TeamMemberUser }[] }

type SourceDoc = {
  id: string
  filename: string
  mimeType: string
  sizeBytes: number
  contentHash: string
  status: "PROCESSING" | "READY" | "ERROR"
  createdAt: string
  _count: { cards: number }
  uploadedBy: { name: string | null; email: string }
}

const FORMAT_LABELS: Record<CardFormat, string> = {
  QA: "Q&A",
  TRUE_FALSE: "True / False",
  FILL_BLANK: "Fill in Blank",
}

const emptyForm = { question: "", answer: "", format: "QA" as CardFormat }

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export default function DeckDetailPage() {
  const { deckId } = useParams<{ deckId: string }>()
  const router = useRouter()
  const { data: session } = useSession()

  const [deck, setDeck] = useState<DeckDetail | null>(null)
  const [cards, setCards] = useState<Card[]>([])
  const [docs, setDocs] = useState<SourceDoc[]>([])
  const [loading, setLoading] = useState(true)

  // Card add/edit modal
  const [showAdd, setShowAdd] = useState(false)
  const [editCard, setEditCard] = useState<Card | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Assign modal
  const [showAssign, setShowAssign] = useState(false)
  const [teams, setTeams] = useState<Team[]>([])
  const [assignedUserIds, setAssignedUserIds] = useState<Set<string>>(new Set())
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set())
  const [assigning, setAssigning] = useState(false)
  const [assignError, setAssignError] = useState<string | null>(null)

  // Regenerate state
  const [regenerating, setRegenerating] = useState<string | null>(null)
  const [regenMsg, setRegenMsg] = useState<string | null>(null)

  const isManager =
    session?.user?.role === "MANAGER" || session?.user?.role === "ADMIN"

  const fetchAll = useCallback(async () => {
    const [deckRes, cardsRes, docsRes] = await Promise.all([
      fetch(`/api/decks/${deckId}`),
      fetch(`/api/decks/${deckId}/cards`),
      fetch(`/api/documents?deckId=${deckId}`),
    ])
    if (deckRes.ok) setDeck(await deckRes.json() as DeckDetail)
    if (cardsRes.ok) setCards(await cardsRes.json() as Card[])
    if (docsRes.ok) setDocs(await docsRes.json() as SourceDoc[])
    setLoading(false)
  }, [deckId])

  useEffect(() => { void fetchAll() }, [fetchAll])

  // Detect if any filename appears with different hashes (doc was updated)
  const outdatedFilenames = new Set<string>(
    docs
      .filter((d) => {
        const same = docs.filter((o) => o.filename === d.filename)
        return same.length > 1 && same.some((o) => o.contentHash !== d.contentHash)
      })
      .map((d) => d.filename)
  )
  const hasOutdated = outdatedFilenames.size > 0

  // ── Draft card count ────────────────────────────────────────────────────────
  const draftCount = cards.filter((c) => c.status === "DRAFT").length

  // ── Card modal helpers ──────────────────────────────────────────────────────

  function openAdd() {
    setForm(emptyForm)
    setError(null)
    setShowAdd(true)
  }

  function openEdit(card: Card) {
    setForm({ question: card.question, answer: card.answer, format: card.format })
    setError(null)
    setEditCard(card)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    const url = editCard
      ? `/api/decks/${deckId}/cards/${editCard.id}`
      : `/api/decks/${deckId}/cards`
    const method = editCard ? "PUT" : "POST"

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    setSaving(false)

    if (!res.ok) {
      const d = (await res.json()) as { error?: string }
      setError(d.error ?? "Failed to save card")
      return
    }

    setShowAdd(false)
    setEditCard(null)
    void fetchAll()
  }

  async function handleArchive(cardId: string) {
    await fetch(`/api/decks/${deckId}/cards/${cardId}`, { method: "DELETE" })
    void fetchAll()
  }

  // ── Assign modal helpers ────────────────────────────────────────────────────

  async function openAssign() {
    setAssignError(null)
    setSelectedUserIds(new Set())
    const [teamsRes, assignedRes] = await Promise.all([
      fetch("/api/teams"),
      fetch(`/api/decks/${deckId}/assign`),
    ])
    if (teamsRes.ok) setTeams(await teamsRes.json() as Team[])
    if (assignedRes.ok) {
      const d = (await assignedRes.json()) as { assignedUserIds: string[] }
      setAssignedUserIds(new Set(d.assignedUserIds))
    }
    setShowAssign(true)
  }

  function toggleUser(userId: string) {
    setSelectedUserIds((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  function selectEntireTeam(team: Team) {
    const unassigned = team.members
      .map((m) => m.userId)
      .filter((id) => !assignedUserIds.has(id))
    setSelectedUserIds((prev) => {
      const next = new Set(prev)
      unassigned.forEach((id) => next.add(id))
      return next
    })
  }

  const allMembers: TeamMemberUser[] = Array.from(
    new Map(
      teams.flatMap((t) => t.members.map((m) => [m.userId, m.user]))
    ).values()
  )

  function selectAll() {
    const ids = allMembers.filter((u) => !assignedUserIds.has(u.id)).map((u) => u.id)
    setSelectedUserIds(new Set(ids))
  }

  async function handleAssign() {
    if (selectedUserIds.size === 0) return
    setAssigning(true)
    setAssignError(null)
    const res = await fetch(`/api/decks/${deckId}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userIds: Array.from(selectedUserIds) }),
    })
    setAssigning(false)
    if (!res.ok) {
      const d = (await res.json()) as { error?: string }
      setAssignError(d.error ?? "Assignment failed")
      return
    }
    setShowAssign(false)
    void fetchAll()
  }

  // ── Regenerate ──────────────────────────────────────────────────────────────

  async function handleRegenerate(docId: string) {
    setRegenerating(docId)
    setRegenMsg(null)
    const res = await fetch(`/api/decks/${deckId}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceDocumentId: docId }),
    })
    setRegenerating(null)
    if (res.ok) {
      const d = await res.json() as { count: number }
      setRegenMsg(`${d.count} new draft card${d.count !== 1 ? "s" : ""} created. Review them above.`)
      void fetchAll()
    } else {
      const d = (await res.json()) as { error?: string }
      setRegenMsg(d.error ?? "Regeneration failed")
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return <div className="mt-10 text-center text-sm text-ink-4">Loading…</div>
  }

  if (!deck) {
    return <div className="mt-10 text-center text-sm text-ink-3">Deck not found.</div>
  }

  const activeCards = cards.filter((c) => c.status === "ACTIVE")
  const archivedCards = cards.filter((c) => c.status === "ARCHIVED")

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            onClick={() => router.push("/decks")}
            className="mb-2 flex items-center gap-1 text-sm text-ink-3 hover:text-ink-2"
          >
            <ArrowLeft className="h-4 w-4" />
            All Decks
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-ink-1">{deck.name}</h1>
            {deck.isMandatory && (
              <span className="flex items-center gap-1 rounded-full bg-ds-blue-100 px-2 py-0.5 text-xs text-ds-blue-ink">
                <Lock className="h-3 w-3" />
                Mandatory
              </span>
            )}
          </div>
          {deck.description && (
            <p className="mt-1 text-sm text-ink-3">{deck.description}</p>
          )}
        </div>
        {isManager && (
          <div className="flex shrink-0 flex-wrap gap-2">
            <ContentPipeline deckId={deckId} />
            <button
              onClick={() => { void openAssign() }}
              className="flex items-center gap-2 rounded-lg border border-ink-6 bg-paper-raised px-4 py-2 text-sm font-medium text-ink-2 hover:bg-paper-sunken"
            >
              <Users className="h-4 w-4" />
              Assign
            </button>
            <button
              onClick={openAdd}
              className="flex items-center gap-2 rounded-lg bg-ink-1 px-4 py-2 text-sm font-medium text-white hover:bg-ink-2"
            >
              <Plus className="h-4 w-4" />
              Add Card
            </button>
          </div>
        )}
      </div>

      {/* Outdated source doc banner */}
      {hasOutdated && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-ds-amber-100 bg-ds-amber-50 px-4 py-3 text-sm text-ds-amber-ink">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-ds-amber-500" />
          <span>
            A source document was re-uploaded with different content.
            Some cards may be outdated — regenerate from the updated document to create fresh drafts.
          </span>
        </div>
      )}

      {/* Draft cards pending review banner */}
      {draftCount > 0 && (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-ds-blue-100 bg-ds-blue-50 px-4 py-3 text-sm text-ds-blue-ink">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-ds-blue-500" />
            <span>
              <span className="font-semibold">{draftCount}</span> AI-generated card{draftCount !== 1 ? "s" : ""} pending review
            </span>
          </div>
          <button
            onClick={() => router.push(`/decks/${deckId}/review-cards`)}
            className="rounded-lg bg-ink-1 px-3 py-1 text-xs font-medium text-white hover:bg-ink-2"
          >
            Review Now
          </button>
        </div>
      )}

      {/* Active cards table */}
      <div className="mt-6">
        {activeCards.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ink-6 py-12 text-center text-sm text-ink-4">
            No active cards yet.{" "}
            {isManager && (
              <button onClick={openAdd} className="text-ds-blue-600 hover:underline">
                Add the first card
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-ink-6 bg-paper-raised">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-6 bg-paper-sunken text-left text-xs font-medium uppercase tracking-wide text-ink-3">
                  <th className="px-4 py-3">Question</th>
                  <th className="px-4 py-3">Format</th>
                  {isManager && <th className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-6">
                {activeCards.map((card) => (
                  <tr key={card.id} className="hover:bg-paper-sunken">
                    <td className="max-w-xs px-4 py-3">
                      <p className="truncate font-medium text-ink-1">{card.question}</p>
                      <p className="mt-0.5 truncate text-xs text-ink-4">{card.answer}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-ink-6 px-2 py-0.5 text-xs text-ink-3">
                        {FORMAT_LABELS[card.format]}
                      </span>
                    </td>
                    {isManager && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEdit(card)}
                            className="rounded p-1 text-ink-4 hover:bg-ink-6 hover:text-ink-3"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => { void handleArchive(card.id) }}
                            className="rounded p-1 text-ink-4 hover:bg-ds-red-50 hover:text-ds-red-500"
                            title="Archive"
                          >
                            <Archive className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Archived cards */}
      {archivedCards.length > 0 && (
        <details className="mt-6">
          <summary className="cursor-pointer text-sm text-ink-4 hover:text-ink-3">
            {archivedCards.length} archived card{archivedCards.length !== 1 ? "s" : ""}
          </summary>
          <div className="mt-3 overflow-hidden rounded-xl border border-ink-6 bg-paper-raised opacity-60">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-ink-6">
                {archivedCards.map((card) => (
                  <tr key={card.id}>
                    <td className="px-4 py-3">
                      <p className="truncate text-ink-3 line-through">{card.question}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-ink-6 px-2 py-0.5 text-xs text-ink-4">
                        {FORMAT_LABELS[card.format]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}

      {/* Source documents section */}
      {(docs.length > 0 || isManager) && (
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-semibold text-ink-2">Source Documents</h2>
          {regenMsg && (
            <p className="mb-3 rounded-lg bg-ds-blue-50 px-3 py-2 text-sm text-ds-blue-ink">
              {regenMsg}
            </p>
          )}
          {docs.length === 0 ? (
            <p className="text-sm text-ink-4">No documents uploaded yet.</p>
          ) : (
            <div className="space-y-2">
              {docs.map((doc) => {
                const isOutdated = outdatedFilenames.has(doc.filename)
                return (
                  <div
                    key={doc.id}
                    className={`flex items-center justify-between rounded-xl border bg-paper-raised px-4 py-3 ${
                      isOutdated ? "border-ds-amber-100" : "border-ink-6"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <FileText className={`h-5 w-5 ${isOutdated ? "text-ds-amber-500" : "text-ink-5"}`} />
                      <div>
                        <p className="text-sm font-medium text-ink-1">
                          {doc.filename}
                          {isOutdated && (
                            <span className="ml-2 rounded-full bg-ds-amber-100 px-2 py-0.5 text-xs text-ds-amber-ink">
                              Updated
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-ink-4">
                          {fmtBytes(doc.sizeBytes)} · {doc._count.cards} card{doc._count.cards !== 1 ? "s" : ""} generated
                          {" "}· by {doc.uploadedBy.name ?? doc.uploadedBy.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          doc.status === "READY"
                            ? "bg-ds-green-50 text-ds-green-ink"
                            : doc.status === "ERROR"
                            ? "bg-ds-red-50 text-ds-red-ink"
                            : "bg-ink-6 text-ink-4"
                        }`}
                      >
                        {doc.status}
                      </span>
                      {isManager && doc.status === "READY" && (
                        <button
                          onClick={() => { void handleRegenerate(doc.id) }}
                          disabled={regenerating === doc.id}
                          className="flex items-center gap-1 rounded-lg border border-ink-6 px-2.5 py-1.5 text-xs text-ink-3 hover:bg-paper-sunken disabled:opacity-50"
                          title="Regenerate cards from this document"
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${regenerating === doc.id ? "animate-spin" : ""}`} />
                          Regenerate
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Add / Edit card modal */}
      <Modal
        isOpen={showAdd || editCard !== null}
        onClose={() => { setShowAdd(false); setEditCard(null); setError(null) }}
        title={editCard ? "Edit Card" : "Add Card"}
      >
        <form onSubmit={(e) => { void handleSave(e) }} className="space-y-4">
          {error && (
            <p className="rounded-lg bg-ds-red-50 px-3 py-2 text-sm text-ds-red-ink">{error}</p>
          )}
          <div>
            <label className="block text-sm font-medium text-ink-2">Format</label>
            <select
              value={form.format}
              onChange={(e) => setForm((f) => ({ ...f, format: e.target.value as CardFormat }))}
              className="mt-1 block w-full rounded-lg border border-ink-6 px-3 py-2 text-sm focus:border-ds-blue-500 focus:outline-none focus:ring-1 focus:ring-ds-blue-500"
            >
              <option value="QA">Q&amp;A</option>
              <option value="TRUE_FALSE">True / False</option>
              <option value="FILL_BLANK">Fill in Blank</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-2">Question</label>
            <textarea
              required
              rows={3}
              value={form.question}
              onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
              className="mt-1 block w-full rounded-lg border border-ink-6 px-3 py-2 text-sm focus:border-ds-blue-500 focus:outline-none focus:ring-1 focus:ring-ds-blue-500"
              placeholder="Enter the question or prompt"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-2">Answer</label>
            <textarea
              required
              rows={3}
              value={form.answer}
              onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))}
              className="mt-1 block w-full rounded-lg border border-ink-6 px-3 py-2 text-sm focus:border-ds-blue-500 focus:outline-none focus:ring-1 focus:ring-ds-blue-500"
              placeholder="Enter the answer"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => { setShowAdd(false); setEditCard(null) }}
              className="rounded-lg px-4 py-2 text-sm text-ink-3 hover:bg-ink-6"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-ink-1 px-4 py-2 text-sm font-medium text-white hover:bg-ink-2 disabled:opacity-60"
            >
              {saving ? "Saving…" : editCard ? "Save Changes" : "Add Card"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Assign to Team modal */}
      <Modal
        isOpen={showAssign}
        onClose={() => setShowAssign(false)}
        title="Assign to Team"
        size="lg"
      >
        <div className="space-y-4">
          {assignError && (
            <p className="rounded-lg bg-ds-red-50 px-3 py-2 text-sm text-ds-red-ink">{assignError}</p>
          )}
          {allMembers.length === 0 ? (
            <p className="text-sm text-ink-3">No team members found.</p>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-ink-3">{selectedUserIds.size} selected</p>
                <button onClick={selectAll} className="text-sm text-ds-blue-600 hover:underline">
                  Select all unassigned
                </button>
              </div>
              {teams.map((team) => (
                <div key={team.id}>
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-4">
                      {team.name}
                    </p>
                    <button
                      onClick={() => selectEntireTeam(team)}
                      className="text-xs text-ds-blue-600 hover:underline"
                    >
                      Select entire team
                    </button>
                  </div>
                  <div className="divide-y divide-ink-6 overflow-hidden rounded-xl border border-ink-6 bg-paper-raised">
                    {team.members.map(({ userId, user }) => {
                      const alreadyAssigned = assignedUserIds.has(userId)
                      const checked = selectedUserIds.has(userId)
                      return (
                        <label
                          key={userId}
                          className={`flex cursor-pointer items-center gap-3 px-4 py-3 ${
                            alreadyAssigned ? "opacity-50" : "hover:bg-paper-sunken"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={alreadyAssigned || checked}
                            disabled={alreadyAssigned}
                            onChange={() => toggleUser(userId)}
                            className="h-4 w-4 rounded border-ink-6 text-ds-blue-600 focus:ring-ds-blue-500"
                          />
                          <div>
                            <p className="text-sm font-medium text-ink-1">
                              {user.name ?? user.email}
                            </p>
                            {user.name && (
                              <p className="text-xs text-ink-4">{user.email}</p>
                            )}
                          </div>
                          {alreadyAssigned && (
                            <span className="ml-auto text-xs text-ink-4">Assigned</span>
                          )}
                        </label>
                      )
                    })}
                  </div>
                </div>
              ))}
            </>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setShowAssign(false)}
              className="rounded-lg px-4 py-2 text-sm text-ink-3 hover:bg-ink-6"
            >
              Cancel
            </button>
            <button
              onClick={() => { void handleAssign() }}
              disabled={assigning || selectedUserIds.size === 0}
              className="rounded-lg bg-ink-1 px-4 py-2 text-sm font-medium text-white hover:bg-ink-2 disabled:opacity-60"
            >
              {assigning ? "Assigning…" : `Assign (${selectedUserIds.size})`}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
