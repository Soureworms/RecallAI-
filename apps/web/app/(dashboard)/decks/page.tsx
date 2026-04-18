"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Plus, Layers, Lock } from "lucide-react"
import { Modal } from "@/components/ui/modal"

type DeckWithCount = {
  id: string
  name: string
  description: string | null
  isMandatory: boolean
  isArchived: boolean
  _count: { cards: number }
}

export default function DecksPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [decks, setDecks] = useState<DeckWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: "", description: "", isMandatory: false })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isManager =
    session?.user?.role === "MANAGER" || session?.user?.role === "ADMIN"

  const fetchDecks = useCallback(async () => {
    const res = await fetch("/api/decks")
    if (res.ok) setDecks(await res.json() as DeckWithCount[])
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

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Decks</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your organisation&apos;s flashcard decks
          </p>
        </div>
        {isManager && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" />
            Create Deck
          </button>
        )}
      </div>

      {loading ? (
        <div className="mt-10 text-center text-sm text-gray-400">Loading…</div>
      ) : decks.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <Layers className="h-10 w-10 text-gray-300" />
          <p className="text-gray-500">No decks yet.</p>
          {isManager && (
            <button
              onClick={() => setShowCreate(true)}
              className="text-sm text-indigo-600 hover:underline"
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
              className="rounded-xl border border-gray-200 bg-white p-6 text-left shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-gray-900">{deck.name}</h3>
                {deck.isMandatory && (
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700">
                    <Lock className="h-3 w-3" />
                    Mandatory
                  </span>
                )}
              </div>
              {deck.description && (
                <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                  {deck.description}
                </p>
              )}
              <p className="mt-3 text-sm font-medium text-indigo-600">
                {deck._count.cards} card{deck._count.cards !== 1 ? "s" : ""}
              </p>
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
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="e.g. Product Knowledge"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Optional description"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isMandatory}
              onChange={(e) =>
                setForm((f) => ({ ...f, isMandatory: e.target.checked }))
              }
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-gray-700">Mandatory for all agents</span>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
            >
              {saving ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
