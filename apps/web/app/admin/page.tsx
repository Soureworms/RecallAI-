"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import {
  Building2, Users, LayoutDashboard, Plus, Pencil, Trash2,
  Mail, Shield, CheckCircle, X, ChevronDown,
} from "lucide-react"
import { toast } from "sonner"

// ── Types ────────────────────────────────────────────────────────────────────

type Org = { id: string; name: string; createdAt: string; _count: { users: number; decks: number } }
type User = {
  id: string; name: string | null; email: string; role: string; image: string | null
  onboardedAt: string | null; createdAt: string; org: { id: string; name: string }
}
type Stats = { orgs: number; users: number; decks: number; reviews: number }

type Tab = "overview" | "organizations" | "users"

// ── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: number; icon: React.ElementType; color: string
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
      <p className="mt-0.5 text-sm text-gray-500">{label}</p>
    </div>
  )
}

// ── Role badge ───────────────────────────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "bg-purple-100 text-purple-700",
  ADMIN: "bg-indigo-100 text-indigo-700",
  MANAGER: "bg-blue-100 text-blue-700",
  AGENT: "bg-gray-100 text-gray-600",
}

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_COLORS[role] ?? "bg-gray-100 text-gray-600"}`}>
      {role.replace("_", " ")}
    </span>
  )
}

// ── Inline modal ─────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { data: session } = useSession()
  const [tab, setTab] = useState<Tab>("overview")
  const [stats, setStats] = useState<Stats | null>(null)
  const [orgs, setOrgs] = useState<Org[]>([])
  const [users, setUsers] = useState<User[]>([])

  // Modal state
  const [orgModal, setOrgModal] = useState<{ mode: "create" | "edit"; org?: Org } | null>(null)
  const [userModal, setUserModal] = useState<{ mode: "create" | "edit"; user?: User } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ type: "org" | "user"; id: string; label: string } | null>(null)

  // Form state
  const [orgName, setOrgName] = useState("")
  const [userForm, setUserForm] = useState({ name: "", email: "", role: "AGENT", orgId: "", sendEmail: true })
  const [saving, setSaving] = useState(false)

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const loadStats = useCallback(async () => {
    const res = await fetch("/api/admin/stats")
    if (res.ok) setStats(await res.json() as Stats)
  }, [])

  const loadOrgs = useCallback(async () => {
    const res = await fetch("/api/admin/organizations")
    if (res.ok) setOrgs(await res.json() as Org[])
  }, [])

  const loadUsers = useCallback(async () => {
    const res = await fetch("/api/admin/users")
    if (res.ok) setUsers(await res.json() as User[])
  }, [])

  useEffect(() => { void loadStats() }, [loadStats])
  useEffect(() => { if (tab === "organizations") void loadOrgs() }, [tab, loadOrgs])
  useEffect(() => { if (tab === "users") void loadUsers() }, [tab, loadUsers])

  // ── Org CRUD ───────────────────────────────────────────────────────────────

  const saveOrg = async () => {
    if (!orgName.trim()) return
    setSaving(true)
    try {
      const isEdit = orgModal?.mode === "edit"
      const url = isEdit ? `/api/admin/organizations/${orgModal!.org!.id}` : "/api/admin/organizations"
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: orgName }),
      })
      if (!res.ok) throw new Error((await res.json() as { error: string }).error)
      toast.success(isEdit ? "Organization updated" : "Organization created")
      setOrgModal(null)
      void loadOrgs()
      void loadStats()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed")
    } finally {
      setSaving(false)
    }
  }

  // ── User CRUD ──────────────────────────────────────────────────────────────

  const saveUser = async () => {
    setSaving(true)
    try {
      const isEdit = userModal?.mode === "edit"
      const url = isEdit ? `/api/admin/users/${userModal!.user!.id}` : "/api/admin/users"
      const body = isEdit
        ? { name: userForm.name, role: userForm.role, orgId: userForm.orgId }
        : { ...userForm, sendWelcomeEmail: userForm.sendEmail }
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error((await res.json() as { error: string }).error)
      toast.success(isEdit ? "User updated" : `User created${userForm.sendEmail ? " — welcome email sent" : ""}`)
      setUserModal(null)
      void loadUsers()
      void loadStats()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed")
    } finally {
      setSaving(false)
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setSaving(true)
    try {
      const url = deleteTarget.type === "org"
        ? `/api/admin/organizations/${deleteTarget.id}`
        : `/api/admin/users/${deleteTarget.id}`
      const res = await fetch(url, { method: "DELETE" })
      if (!res.ok) throw new Error((await res.json() as { error: string }).error)
      toast.success(`${deleteTarget.type === "org" ? "Organization" : "User"} deleted`)
      setDeleteTarget(null)
      if (deleteTarget.type === "org") { void loadOrgs(); void loadStats() }
      else { void loadUsers(); void loadStats() }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed")
    } finally {
      setSaving(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <div>
              <span className="font-semibold text-gray-900">RecallAI Admin</span>
              <span className="ml-2 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                Super Admin
              </span>
            </div>
          </div>
          <span className="text-sm text-gray-500">{session?.user?.email}</span>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Tabs */}
        <div className="mb-8 flex gap-1 rounded-xl bg-gray-100 p-1 w-fit">
          {([
            { key: "overview", label: "Overview", icon: LayoutDashboard },
            { key: "organizations", label: "Organizations", icon: Building2 },
            { key: "users", label: "Users", icon: Users },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                tab === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {tab === "overview" && stats && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Organizations" value={stats.orgs} icon={Building2} color="bg-indigo-100 text-indigo-600" />
            <StatCard label="Users" value={stats.users} icon={Users} color="bg-emerald-100 text-emerald-600" />
            <StatCard label="Decks" value={stats.decks} icon={LayoutDashboard} color="bg-orange-100 text-orange-600" />
            <StatCard label="Total Reviews" value={stats.reviews} icon={CheckCircle} color="bg-purple-100 text-purple-600" />
          </div>
        )}

        {/* Organizations */}
        {tab === "organizations" && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Organizations</h2>
              <button
                onClick={() => { setOrgName(""); setOrgModal({ mode: "create" }) }}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
              >
                <Plus className="h-4 w-4" /> New organization
              </button>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-5 py-3 text-left">Name</th>
                    <th className="px-5 py-3 text-left">Users</th>
                    <th className="px-5 py-3 text-left">Decks</th>
                    <th className="px-5 py-3 text-left">Created</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orgs.map((org) => (
                    <tr key={org.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium text-gray-900">{org.name}</td>
                      <td className="px-5 py-3 text-gray-500">{org._count.users}</td>
                      <td className="px-5 py-3 text-gray-500">{org._count.decks}</td>
                      <td className="px-5 py-3 text-gray-400">
                        {new Date(org.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => { setOrgName(org.name); setOrgModal({ mode: "edit", org }) }}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget({ type: "org", id: org.id, label: org.name })}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {orgs.length === 0 && (
                    <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400">No organizations</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Users */}
        {tab === "users" && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Users</h2>
              <button
                onClick={() => {
                  setUserForm({ name: "", email: "", role: "AGENT", orgId: orgs[0]?.id ?? "", sendEmail: true })
                  void loadOrgs()
                  setUserModal({ mode: "create" })
                }}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
              >
                <Plus className="h-4 w-4" /> Invite user
              </button>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-5 py-3 text-left">Name / Email</th>
                    <th className="px-5 py-3 text-left">Role</th>
                    <th className="px-5 py-3 text-left">Organization</th>
                    <th className="px-5 py-3 text-left">Onboarded</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-900">{u.name ?? "—"}</p>
                        <p className="text-gray-400">{u.email}</p>
                      </td>
                      <td className="px-5 py-3"><RoleBadge role={u.role} /></td>
                      <td className="px-5 py-3 text-gray-500">{u.org.name}</td>
                      <td className="px-5 py-3">
                        {u.onboardedAt
                          ? <span className="text-emerald-600 text-xs">✓ {new Date(u.onboardedAt).toLocaleDateString()}</span>
                          : <span className="text-gray-400 text-xs">Pending</span>
                        }
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              void loadOrgs()
                              setUserForm({ name: u.name ?? "", email: u.email, role: u.role, orgId: u.org.id, sendEmail: false })
                              setUserModal({ mode: "edit", user: u })
                            }}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget({ type: "user", id: u.id, label: u.email })}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400">No users</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Org modal */}
      {orgModal && (
        <Modal
          title={orgModal.mode === "create" ? "New organization" : "Edit organization"}
          onClose={() => setOrgModal(null)}
        >
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Name</label>
          <input
            autoFocus
            type="text"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void saveOrg() }}
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setOrgModal(null)} className="rounded-xl border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            <button
              onClick={saveOrg}
              disabled={saving || !orgName.trim()}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </Modal>
      )}

      {/* User modal */}
      {userModal && (
        <Modal
          title={userModal.mode === "create" ? "Invite user" : "Edit user"}
          onClose={() => setUserModal(null)}
        >
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Full name</label>
              <input
                type="text"
                value={userForm.name}
                onChange={(e) => setUserForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            {userModal.mode === "create" && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Role</label>
              <div className="relative">
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm((f) => ({ ...f, role: e.target.value }))}
                  className="w-full appearance-none rounded-xl border border-gray-200 px-4 py-2.5 pr-8 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="AGENT">Agent</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Admin</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Organization</label>
              <div className="relative">
                <select
                  value={userForm.orgId}
                  onChange={(e) => setUserForm((f) => ({ ...f, orgId: e.target.value }))}
                  className="w-full appearance-none rounded-xl border border-gray-200 px-4 py-2.5 pr-8 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                >
                  {orgs.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              </div>
            </div>
            {userModal.mode === "create" && (
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={userForm.sendEmail}
                  onChange={(e) => setUserForm((f) => ({ ...f, sendEmail: e.target.checked }))}
                  className="rounded border-gray-300 text-indigo-600"
                />
                <Mail className="h-4 w-4 text-gray-400" />
                Send welcome email with account setup link
              </label>
            )}
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setUserModal(null)} className="rounded-xl border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            <button
              onClick={saveUser}
              disabled={saving || !userForm.name.trim() || (userModal.mode === "create" && !userForm.email.trim())}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {saving ? "Saving…" : userModal.mode === "create" ? "Create & invite" : "Save"}
            </button>
          </div>
        </Modal>
      )}

      {/* Delete confirm modal */}
      {deleteTarget && (
        <Modal title={`Delete ${deleteTarget.type}`} onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-gray-600">
            Are you sure you want to delete{" "}
            <span className="font-medium text-gray-900">{deleteTarget.label}</span>?
            {deleteTarget.type === "org" && " This will delete all associated teams, users, decks, and cards."}
            {" "}This cannot be undone.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setDeleteTarget(null)} className="rounded-xl border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            <button
              onClick={confirmDelete}
              disabled={saving}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
            >
              {saving ? "Deleting…" : "Delete"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
