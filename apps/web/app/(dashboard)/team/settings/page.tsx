"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { usePermissions } from "@/hooks/use-permissions"
import { Modal } from "@/components/ui/modal"
import {
  Users,
  Plus,
  Copy,
  Check,
  Trash2,
  AlertTriangle,
  UserPlus,
  Settings,
} from "lucide-react"

// ─── types ────────────────────────────────────────────────────────────────────

type TeamMemberUser = {
  id: string
  name: string | null
  email: string
  role: string
}

type Team = {
  id: string
  name: string
  members: { user: TeamMemberUser }[]
}

type PendingInvite = {
  id: string
  email: string
  role: string
  expiresAt: string
  createdAt: string
}

// ─── copy helper ──────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button
      onClick={copy}
      className="ml-1 inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs text-indigo-600 hover:bg-indigo-50"
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  )
}

// ─── role badge ───────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  const color =
    role === "ADMIN"
      ? "bg-purple-100 text-purple-700"
      : role === "MANAGER"
      ? "bg-blue-100 text-blue-700"
      : "bg-gray-100 text-gray-600"
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}>
      {role}
    </span>
  )
}

// ─── main ─────────────────────────────────────────────────────────────────────

export default function TeamSettingsPage() {
  const { isManager, isAdmin } = usePermissions()
  const router = useRouter()

  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<string>("")
  const [invites, setInvites] = useState<PendingInvite[]>([])
  const [loadingInvites, setLoadingInvites] = useState(false)

  // Create team modal (admin only)
  const [showCreateTeam, setShowCreateTeam] = useState(false)
  const [newTeamName, setNewTeamName] = useState("")
  const [creatingTeam, setCreatingTeam] = useState(false)
  const [createTeamError, setCreateTeamError] = useState<string | null>(null)

  // Invite modal
  const [showInvite, setShowInvite] = useState(false)
  const [inviteForm, setInviteForm] = useState({ email: "", role: "AGENT" as "MANAGER" | "AGENT" })
  const [inviting, setInviting] = useState(false)
  const [inviteResult, setInviteResult] = useState<{ url: string } | null>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)

  // Rename team
  const [editingName, setEditingName] = useState(false)
  const [teamNameDraft, setTeamNameDraft] = useState("")
  const [savingName, setSavingName] = useState(false)

  useEffect(() => {
    if (!isManager) {
      router.replace("/dashboard")
    }
  }, [isManager, router])

  const fetchTeams = useCallback(async () => {
    const res = await fetch("/api/teams")
    if (res.ok) {
      const data = (await res.json()) as Team[]
      setTeams(data)
      if (data.length > 0 && !selectedTeamId) {
        setSelectedTeamId(data[0].id)
      }
    }
  }, [selectedTeamId])

  useEffect(() => { void fetchTeams() }, [fetchTeams])

  const fetchInvites = useCallback(async () => {
    if (!selectedTeamId) return
    setLoadingInvites(true)
    const res = await fetch(`/api/teams/${selectedTeamId}/invite`)
    if (res.ok) setInvites((await res.json()) as PendingInvite[])
    setLoadingInvites(false)
  }, [selectedTeamId])

  useEffect(() => { void fetchInvites() }, [fetchInvites])

  const selectedTeam = teams.find((t) => t.id === selectedTeamId)

  async function handleCreateTeam(e: React.FormEvent) {
    e.preventDefault()
    setCreatingTeam(true)
    setCreateTeamError(null)
    const res = await fetch("/api/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newTeamName }),
    })
    setCreatingTeam(false)
    if (!res.ok) {
      const d = (await res.json()) as { error?: string }
      setCreateTeamError(d.error ?? "Failed")
      return
    }
    const created = (await res.json()) as Team
    setShowCreateTeam(false)
    setNewTeamName("")
    await fetchTeams()
    setSelectedTeamId(created.id)
  }

  async function handleSaveName() {
    if (!selectedTeam || !teamNameDraft.trim()) return
    setSavingName(true)
    await fetch(`/api/teams/${selectedTeamId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: teamNameDraft }),
    })
    setSavingName(false)
    setEditingName(false)
    void fetchTeams()
  }

  async function handleRemoveMember(userId: string) {
    if (!confirm("Remove this member from the team?")) return
    await fetch(`/api/teams/${selectedTeamId}/members/${userId}`, {
      method: "DELETE",
    })
    void fetchTeams()
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviting(true)
    setInviteError(null)
    setInviteResult(null)
    const res = await fetch(`/api/teams/${selectedTeamId}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(inviteForm),
    })
    setInviting(false)
    if (!res.ok) {
      const d = (await res.json()) as { error?: string }
      setInviteError(d.error ?? "Failed to create invite")
      return
    }
    const data = (await res.json()) as { inviteUrl: string }
    setInviteResult({ url: data.inviteUrl })
    void fetchInvites()
  }

  if (!isManager) return null

  const baseUrl = typeof window !== "undefined" ? window.location.origin : ""

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-gray-400" />
          <h1 className="text-2xl font-bold text-gray-900">Team Settings</h1>
        </div>
        <div className="flex items-center gap-3">
          {teams.length > 1 && (
            <select
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}
          {isAdmin && (
            <button
              onClick={() => setShowCreateTeam(true)}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
            >
              <Plus className="h-4 w-4" />
              New Team
            </button>
          )}
        </div>
      </div>

      {teams.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center text-sm text-gray-400">
          No teams yet.{" "}
          {isAdmin && (
            <button
              onClick={() => setShowCreateTeam(true)}
              className="text-indigo-600 underline"
            >
              Create one
            </button>
          )}
        </div>
      )}

      {selectedTeam && (
        <>
          {/* Team name */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-gray-700">Team Name</h2>
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  value={teamNameDraft}
                  onChange={(e) => setTeamNameDraft(e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={() => void handleSaveName()}
                  disabled={savingName}
                  className="rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-500 disabled:opacity-60"
                >
                  {savingName ? "Saving…" : "Save"}
                </button>
                <button
                  onClick={() => setEditingName(false)}
                  className="rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-base font-medium text-gray-900">{selectedTeam.name}</span>
                <button
                  onClick={() => { setTeamNameDraft(selectedTeam.name); setEditingName(true) }}
                  className="text-xs text-indigo-600 hover:underline"
                >
                  Rename
                </button>
              </div>
            )}
          </div>

          {/* Members */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-700">
                  Members ({selectedTeam.members.length})
                </h2>
              </div>
              <button
                onClick={() => { setShowInvite(true); setInviteResult(null); setInviteError(null) }}
                className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Invite Member
              </button>
            </div>
            {selectedTeam.members.length === 0 ? (
              <p className="p-6 text-sm text-gray-400">No members yet.</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {selectedTeam.members.map(({ user }) => (
                  <div key={user.id} className="flex items-center gap-4 px-6 py-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                      {(user.name ?? user.email).slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {user.name ?? user.email}
                      </p>
                      <p className="text-xs text-gray-400">{user.email}</p>
                    </div>
                    <RoleBadge role={user.role} />
                    <button
                      onClick={() => void handleRemoveMember(user.id)}
                      className="ml-2 rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                      title="Remove from team"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending invites */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-6 py-4">
              <h2 className="text-sm font-semibold text-gray-700">Pending Invites</h2>
            </div>
            {loadingInvites ? (
              <div className="p-6 text-sm text-gray-400">Loading…</div>
            ) : invites.length === 0 ? (
              <p className="p-6 text-sm text-gray-400">No pending invites.</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {invites.map((inv) => {
                  const inviteUrl = `${baseUrl}/invite/${inv.id}`
                  const expires = new Date(inv.expiresAt)
                  return (
                    <div key={inv.id} className="flex items-center gap-4 px-6 py-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900">{inv.email}</p>
                        <p className="text-xs text-gray-400">
                          Expires {expires.toLocaleDateString()}
                        </p>
                      </div>
                      <RoleBadge role={inv.role} />
                      <CopyButton text={inviteUrl} />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Create Team Modal (admin only) */}
      <Modal
        isOpen={showCreateTeam}
        onClose={() => { setShowCreateTeam(false); setCreateTeamError(null) }}
        title="Create Team"
      >
        <form onSubmit={(e) => { void handleCreateTeam(e) }} className="space-y-4">
          {createTeamError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {createTeamError}
            </p>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700">Team Name</label>
            <input
              required
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="e.g. Support Team"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowCreateTeam(false)}
              className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creatingTeam}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
            >
              {creatingTeam ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Invite Modal */}
      <Modal
        isOpen={showInvite}
        onClose={() => { setShowInvite(false); setInviteResult(null); setInviteError(null) }}
        title="Invite Member"
      >
        {inviteResult ? (
          <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-800">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
              Invite created! Share this link:
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700">
              <span className="min-w-0 flex-1 truncate">{inviteResult.url}</span>
              <CopyButton text={inviteResult.url} />
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => { setShowInvite(false); setInviteResult(null) }}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={(e) => { void handleInvite(e) }} className="space-y-4">
            {inviteError && (
              <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                {inviteError}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                required
                value={inviteForm.email}
                onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="colleague@company.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Role</label>
              <select
                value={inviteForm.role}
                onChange={(e) =>
                  setInviteForm((f) => ({ ...f, role: e.target.value as "MANAGER" | "AGENT" }))
                }
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="AGENT">Agent</option>
                <option value="MANAGER">Manager</option>
              </select>
            </div>
            <p className="text-xs text-gray-400">
              An invite link will be generated. Share it with the person you&apos;re inviting.
              The link expires in 7 days.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowInvite(false)}
                className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={inviting}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
              >
                {inviting ? "Generating…" : "Generate Link"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
