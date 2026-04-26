"use client"

import { useEffect, useState, useRef } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

type OrgUser = {
  id: string
  name: string | null
  email: string
  role: "AGENT" | "MANAGER" | "ADMIN" | "SUPER_ADMIN"
  image: string | null
  onboardedAt: string | null
  createdAt: string
}

type OrgSettings = {
  id: string
  name: string
  _count: { users: number; decks: number }
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  AGENT: { label: "Agent", color: "bg-ink-6 text-ink-2" },
  MANAGER: { label: "Manager", color: "bg-ds-blue-100 text-ds-blue-ink" },
  ADMIN: { label: "Admin", color: "bg-ds-violet-100 text-ds-violet-700" },
  SUPER_ADMIN: { label: "Super Admin", color: "bg-ds-blue-100 text-ds-blue-ink" },
}

function initials(name: string | null, email: string) {
  if (name) return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()
  return email[0].toUpperCase()
}

// ── Invite Modal ─────────────────────────────────────────────────────────────

function InviteModal({ onClose, onCreated }: { onClose: () => void; onCreated: (u: OrgUser) => void }) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<"AGENT" | "MANAGER">("AGENT")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch("/api/org/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to invite user")
      toast.success(`Invite sent to ${email}`)
      onCreated(data)
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(26,25,23,0.45)]">
      <div className="w-full max-w-md rounded-2xl bg-paper-raised p-6 shadow-s3">
        <h2 className="text-lg font-bold text-ink-1 mb-4">Invite team member</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-2 mb-1">Full name</label>
            <input
              type="text" required value={name} onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-ink-6 px-3 py-2 text-sm focus:border-ds-blue-500 focus:outline-none focus:ring-1 focus:ring-ds-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-2 mb-1">Email address</label>
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-ink-6 px-3 py-2 text-sm focus:border-ds-blue-500 focus:outline-none focus:ring-1 focus:ring-ds-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-2 mb-1">Role</label>
            <select
              value={role} onChange={(e) => setRole(e.target.value as "AGENT" | "MANAGER")}
              className="w-full rounded-lg border border-ink-6 px-3 py-2 text-sm focus:border-ds-blue-500 focus:outline-none focus:ring-1 focus:ring-ds-blue-500"
            >
              <option value="AGENT">Agent — reviews cards, no content management</option>
              <option value="MANAGER">Manager — creates decks, views team analytics</option>
            </select>
          </div>
          <p className="text-xs text-ink-4">
            They&apos;ll receive an email with a link to set their password (expires in 7 days).
          </p>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg border border-ink-6 px-4 py-2 text-sm font-medium text-ink-2 hover:bg-paper-sunken">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 rounded-lg bg-ink-1 px-4 py-2 text-sm font-medium text-white hover:bg-ink-2 disabled:opacity-60">
              {loading ? "Sending invite…" : "Send invite"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Edit User Modal ───────────────────────────────────────────────────────────

function EditUserModal({
  user,
  onClose,
  onUpdated,
}: {
  user: OrgUser
  onClose: () => void
  onUpdated: (u: OrgUser) => void
}) {
  const [name, setName] = useState(user.name ?? "")
  const [role, setRole] = useState<"AGENT" | "MANAGER">(
    user.role === "MANAGER" ? "MANAGER" : "AGENT"
  )
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(`/api/org/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, role }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to update user")
      toast.success("User updated")
      onUpdated({ ...user, name: data.name, role: data.role })
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(26,25,23,0.45)]">
      <div className="w-full max-w-md rounded-2xl bg-paper-raised p-6 shadow-s3">
        <h2 className="text-lg font-bold text-ink-1 mb-4">Edit {user.name ?? user.email}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-2 mb-1">Full name</label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-ink-6 px-3 py-2 text-sm focus:border-ds-blue-500 focus:outline-none focus:ring-1 focus:ring-ds-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-2 mb-1">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value as "AGENT" | "MANAGER")}
              className="w-full rounded-lg border border-ink-6 px-3 py-2 text-sm focus:border-ds-blue-500 focus:outline-none focus:ring-1 focus:ring-ds-blue-500">
              <option value="AGENT">Agent</option>
              <option value="MANAGER">Manager</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg border border-ink-6 px-4 py-2 text-sm font-medium text-ink-2 hover:bg-paper-sunken">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 rounded-lg bg-ink-1 px-4 py-2 text-sm font-medium text-white hover:bg-ink-2 disabled:opacity-60">
              {loading ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function OrgPage() {
  const { data: session } = useSession()
  const router = useRouter()

  const [org, setOrg] = useState<OrgSettings | null>(null)
  const [users, setUsers] = useState<OrgUser[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [editingUser, setEditingUser] = useState<OrgUser | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<OrgUser | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [orgName, setOrgName] = useState("")
  const [savingName, setSavingName] = useState(false)
  const orgNameRef = useRef<HTMLInputElement>(null)
  const [tab, setTab] = useState<"members" | "settings">("members")

  // Guard: redirect if not ADMIN+
  useEffect(() => {
    if (session && session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      router.replace("/dashboard")
    }
  }, [session, router])

  useEffect(() => {
    async function load() {
      const [orgRes, usersRes] = await Promise.all([
        fetch("/api/org/settings"),
        fetch("/api/org/users"),
      ])
      if (orgRes.ok) {
        const o = await orgRes.json()
        setOrg(o)
        setOrgName(o.name)
      }
      if (usersRes.ok) setUsers(await usersRes.json())
      setLoading(false)
    }
    load()
  }, [])

  async function handleDeleteUser() {
    if (!deleteTarget) return
    setDeletingId(deleteTarget.id)
    try {
      const res = await fetch(`/api/org/users/${deleteTarget.id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Failed to delete user")
      }
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id))
      toast.success("User removed")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error")
    } finally {
      setDeletingId(null)
      setDeleteTarget(null)
    }
  }

  async function handleSaveOrgName(e: React.FormEvent) {
    e.preventDefault()
    if (!orgName.trim()) return
    setSavingName(true)
    try {
      const res = await fetch("/api/org/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: orgName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to save")
      setOrg((prev) => prev ? { ...prev, name: data.name } : prev)
      toast.success("Organisation name updated")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error")
    } finally {
      setSavingName(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-ds-blue-600 border-t-transparent" />
      </div>
    )
  }

  const editableUsers = users.filter((u) => u.role !== "ADMIN" && u.role !== "SUPER_ADMIN")
  const adminUsers = users.filter((u) => u.role === "ADMIN" || u.role === "SUPER_ADMIN")

  return (
    <div className="p-6">
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-1">{org?.name}</h1>
          <p className="text-sm text-ink-3 mt-0.5">
            {org?._count.users} member{org?._count.users !== 1 ? "s" : ""} · {org?._count.decks} deck{org?._count.decks !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 rounded-lg bg-ink-1 px-4 py-2 text-sm font-semibold text-white hover:bg-ink-2 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Invite member
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-ink-6 flex gap-6">
        {(["members", "settings"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors capitalize ${
              tab === t ? "border-ds-blue-600 text-ds-blue-600" : "border-transparent text-ink-3 hover:text-ink-2"
            }`}
          >
            {t === "members" ? `Members (${users.length})` : "Settings"}
          </button>
        ))}
      </div>

      {/* Members tab */}
      {tab === "members" && (
        <div className="space-y-4">
          {/* Editable members */}
          <div className="rounded-xl border border-ink-6 bg-paper-raised overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-6 bg-paper-sunken">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-ink-3 uppercase tracking-wide">Member</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-ink-3 uppercase tracking-wide">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-ink-3 uppercase tracking-wide hidden sm:table-cell">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-ink-3 uppercase tracking-wide hidden sm:table-cell">Joined</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-6">
                {/* Admin/Super admin rows (read-only) */}
                {adminUsers.map((u) => {
                  const badge = ROLE_LABELS[u.role]
                  return (
                    <tr key={u.id} className="hover:bg-paper-sunken transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-ds-blue-100 flex items-center justify-center text-xs font-bold text-ds-blue-ink shrink-0">
                            {initials(u.name, u.email)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-ink-1 truncate">{u.name ?? "(no name)"}</p>
                            <p className="text-xs text-ink-4 truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.color}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-xs text-ink-4">—</span>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-xs text-ink-4">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 w-20" />
                    </tr>
                  )
                })}
                {/* Editable members */}
                {editableUsers.length === 0 && adminUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-ink-4">
                      No members yet. Invite your first team member above.
                    </td>
                  </tr>
                )}
                {editableUsers.map((u) => {
                  const badge = ROLE_LABELS[u.role]
                  return (
                    <tr key={u.id} className="hover:bg-paper-sunken transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-ink-6 flex items-center justify-center text-xs font-bold text-ink-3 shrink-0">
                            {initials(u.name, u.email)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-ink-1 truncate">{u.name ?? "(no name)"}</p>
                            <p className="text-xs text-ink-4 truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.color}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        {u.onboardedAt ? (
                          <span className="inline-flex items-center gap-1 text-xs text-ds-green-ink">
                            <span className="h-1.5 w-1.5 rounded-full bg-ds-green-500" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-ds-amber-ink">
                            <span className="h-1.5 w-1.5 rounded-full bg-ds-amber-500" />
                            Pending setup
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-xs text-ink-4">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 w-20">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => setEditingUser(u)}
                            className="rounded p-1 text-ink-4 hover:text-ink-2 hover:bg-ink-6 transition-colors"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setDeleteTarget(u)}
                            className="rounded p-1 text-ink-4 hover:text-ds-red-ink hover:bg-ds-red-50 transition-colors"
                            title="Remove"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Settings tab */}
      {tab === "settings" && (
        <div className="rounded-xl border border-ink-6 bg-paper-raised p-6 space-y-6">
          <div>
            <h2 className="text-base font-semibold text-ink-1 mb-4">Organisation settings</h2>
            <form onSubmit={handleSaveOrgName} className="max-w-sm space-y-3">
              <div>
                <label className="block text-sm font-medium text-ink-2 mb-1">Organisation name</label>
                <input
                  ref={orgNameRef}
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full rounded-lg border border-ink-6 px-3 py-2 text-sm focus:border-ds-blue-500 focus:outline-none focus:ring-1 focus:ring-ds-blue-500"
                />
              </div>
              <button
                type="submit"
                disabled={savingName || !orgName.trim() || orgName === org?.name}
                className="rounded-lg bg-ink-1 px-4 py-2 text-sm font-medium text-white hover:bg-ink-2 disabled:opacity-50 transition-colors"
              >
                {savingName ? "Saving…" : "Save name"}
              </button>
            </form>
          </div>

          <hr className="border-ink-6" />

          <div>
            <h3 className="text-sm font-semibold text-ink-2 mb-1">Contract & billing</h3>
            <p className="text-sm text-ink-4">
              Billing and contract management is handled by your RecallAI account manager.{" "}
              <a href="mailto:hello@recallai.app" className="text-ds-blue-600 hover:underline">
                Contact support
              </a>{" "}
              for changes.
            </p>
          </div>
        </div>
      )}

      {/* Modals */}
      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onCreated={(u) => {
            setUsers((prev) => [...prev, u as OrgUser])
            setOrg((prev) => prev ? { ...prev, _count: { ...prev._count, users: prev._count.users + 1 } } : prev)
          }}
        />
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onUpdated={(updated) => setUsers((prev) => prev.map((u) => u.id === updated.id ? updated : u))}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(26,25,23,0.45)]">
          <div className="w-full max-w-sm rounded-2xl bg-paper-raised p-6 shadow-s3">
            <h2 className="text-lg font-bold text-ink-1 mb-2">Remove member?</h2>
            <p className="text-sm text-ink-3 mb-6">
              <strong>{deleteTarget.name ?? deleteTarget.email}</strong> will lose access to your workspace immediately. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-lg border border-ink-6 px-4 py-2 text-sm font-medium text-ink-2 hover:bg-paper-sunken">
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={!!deletingId}
                className="flex-1 rounded-lg bg-ds-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-ds-red-600 disabled:opacity-60"
              >
                {deletingId ? "Removing…" : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  )
}
