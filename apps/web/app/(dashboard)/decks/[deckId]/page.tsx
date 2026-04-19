"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Plus, ArrowLeft, Pencil, Archive, Lock, Users } from "lucide-react"
import { Modal } from "@/components/ui/modal"

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

const FORMAT_LABELS: Record<CardFormat, string> = {
  QA: "Q&A",
  TRUE_FALSE: "True / False",
  FILL_BLANK: "Fill in Blank",
}

const emptyForm = { question: "", answer: "", format: "QA" as CardFormat }

export default function DeckDetailPage() {
  const { deckId } = useParams<{ deckId: string }>()
  const router = useRouter()
  const { data: session } = useSession()

  const [deck, setDeck] = useState<DeckDetail | null>(null)
  const [cards, setCards] = useState<Card[]>([])
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

  const isManager =
    session?.user?.role === "MANAGER" || session?.user?.role === "ADMIN"

  const fetchDeck = useCallback(async () => {
    const [deckRes, cardsRes] = await Promise.all([
      fetch(`/api/decks/${deckId}`),
      fetch(`/api/decks/${deckId}/cards`),
    ])
    if (deckRes.ok) setDeck(await deckRes.json() as DeckDetail)
    if (cardsRes.ok) setCards(await cardsRes.json() as Card[])
    setLoading(false)
  }, [deckId])

  useEffect(() => { void fetchDeck() }, [fetchDeck])

  // ── Card modal helpers ────────────────────────────────────────────────────────

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
    void fetchDeck()
  }

  async function handleArchive(cardId: string) {
    await fetch(`/api/decks/${deckId}/cards/${cardId}`, { method: "DELETE" })
    void fetchDeck()
  }

  // ── Assign modal helpers ──────────────────────────────────────────────────────

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

  function selectAll() {
    const allUnassigned = allMembers
      .filter((u) => !assignedUserIds.has(u.id))
      .map((u) => u.id)
    setSelectedUserIds(new Set(allUnassigned))
  }

  const allMembers: TeamMemberUser[] = Array.from(
    new Map(
      teams.flatMap((t) => t.members.map((m) => [m.userId, m.user]))
    ).values()
  )

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
    void fetchDeck()
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  if (loading) {
    return <div className="mt-10 text-center text-sm text-gray-400">Loading…</div>
  }

  if (!deck) {
    return <div className="mt-10 text-center text-sm text-gray-500">Deck not found.</div>
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
            className="mb-2 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
            All Decks
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{deck.name}</h1>
            {deck.isMandatory && (
              <span className="flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700">
                <Lock className="h-3 w-3" />
                Mandatory
              </span>
            )}
          </div>
          {deck.description && (
            <p className="mt-1 text-sm text-gray-500">{deck.description}</p>
          )}
        </div>
        {isManager && (
          <div className="flex shrink-0 gap-2">
            <button
              onClick={() => { void openAssign() }}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Users className="h-4 w-4" />
              Assign to Team
            </button>
            <button
              onClick={openAdd}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
            >
              <Plus className="h-4 w-4" />
              Add Card
            </button>
          </div>
        )}
      </div>

      {/* Active cards table */}
      <div className="mt-6">
        {activeCards.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 py-12 text-center text-sm text-gray-400">
            No cards yet.{" "}
            {isManager && (
              <button onClick={openAdd} className="text-indigo-600 hover:underline">
                Add the first card
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">Question</th>
                  <th className="px-4 py-3">Format</th>
                  {isManager && <th className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {activeCards.map((card) => (
                  <tr key={card.id} className="hover:bg-gray-50">
                    <td className="max-w-xs px-4 py-3">
                      <p className="truncate font-medium text-gray-900">{card.question}</p>
                      <p className="mt-0.5 truncate text-xs text-gray-400">{card.answer}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                        {FORMAT_LABELS[card.format]}
                      </span>
                    </td>
                    {isManager && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEdit(card)}
                            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => { void handleArchive(card.id) }}
                            className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
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

      {/* Archived cards (collapsed) */}
      {archivedCards.length > 0 && (
        <details className="mt-6">
          <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-600">
            {archivedCards.length} archived card{archivedCards.length !== 1 ? "s" : ""}
          </summary>
          <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-white opacity-60">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                {archivedCards.map((card) => (
                  <tr key={card.id}>
                    <td className="px-4 py-3">
                      <p className="truncate text-gray-500 line-through">{card.question}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-400">
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

      {/* Add / Edit card modal */}
      <Modal
        isOpen={showAdd || editCard !== null}
        onClose={() => { setShowAdd(false); setEditCard(null); setError(null) }}
        title={editCard ? "Edit Card" : "Add Card"}
      >
        <form onSubmit={(e) => { void handleSave(e) }} className="space-y-4">
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700">Format</label>
            <select
              value={form.format}
              onChange={(e) => setForm((f) => ({ ...f, format: e.target.value as CardFormat }))}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="QA">Q&amp;A</option>
              <option value="TRUE_FALSE">True / False</option>
              <option value="FILL_BLANK">Fill in Blank</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Question</label>
            <textarea
              required
              rows={3}
              value={form.question}
              onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Enter the question or prompt"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Answer</label>
            <textarea
              required
              rows={3}
              value={form.answer}
              onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Enter the answer"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => { setShowAdd(false); setEditCard(null) }}
              className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
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
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{assignError}</p>
          )}

          {allMembers.length === 0 ? (
            <p className="text-sm text-gray-500">No team members found.</p>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  {selectedUserIds.size} selected
                </p>
                <button
                  onClick={selectAll}
                  className="text-sm text-indigo-600 hover:underline"
                >
                  Select all unassigned
                </button>
              </div>

              {teams.map((team) => (
                <div key={team.id}>
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      {team.name}
                    </p>
                    <button
                      onClick={() => selectEntireTeam(team)}
                      className="text-xs text-indigo-600 hover:underline"
                    >
                      Select entire team
                    </button>
                  </div>
                  <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
                    {team.members.map(({ userId, user }) => {
                      const alreadyAssigned = assignedUserIds.has(userId)
                      const checked = selectedUserIds.has(userId)
                      return (
                        <label
                          key={userId}
                          className={`flex cursor-pointer items-center gap-3 px-4 py-3 ${
                            alreadyAssigned ? "opacity-50" : "hover:bg-gray-50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={alreadyAssigned || checked}
                            disabled={alreadyAssigned}
                            onChange={() => toggleUser(userId)}
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {user.name ?? user.email}
                            </p>
                            {user.name && (
                              <p className="text-xs text-gray-400">{user.email}</p>
                            )}
                          </div>
                          {alreadyAssigned && (
                            <span className="ml-auto text-xs text-gray-400">Assigned</span>
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
              className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={() => { void handleAssign() }}
              disabled={assigning || selectedUserIds.size === 0}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
            >
              {assigning ? "Assigning…" : `Assign (${selectedUserIds.size})`}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
