"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  Building2, Users, Layers, BookOpen, Plus, Pencil, Trash2,
  Check, X, UserPlus, ChevronDown, ChevronRight,
} from "lucide-react"

type OrgStats = {
  id: string
  name: string
  createdAt: string
  _count: { users: number; decks: number }
}

type PlatformStats = {
  orgs: number
  users: number
  decks: number
  reviews: number
}

type AdminUser = {
  id: string
  name: string | null
  email: string
  role: string
  createdAt: string
  org: { id: string; name: string } | null
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div style={{
      background: "var(--paper-raised)", border: "1px solid var(--ink-6)",
      borderRadius: 12, padding: "16px 20px", boxShadow: "var(--shadow-1)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, color: "var(--ink-3)", fontSize: 13 }}>
        {icon}
        {label}
      </div>
      <div style={{ fontSize: 32, fontWeight: 700, color: "var(--ink-1)", letterSpacing: "-0.02em" }}>{value}</div>
    </div>
  )
}

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [orgs, setOrgs] = useState<OrgStats[]>([])
  const [expandedOrg, setExpandedOrg] = useState<string | null>(null)
  const [orgUsers, setOrgUsers] = useState<Record<string, AdminUser[]>>({})

  // Create org
  const [showCreateOrg, setShowCreateOrg] = useState(false)
  const [newOrgName, setNewOrgName] = useState("")
  const [creatingOrg, setCreatingOrg] = useState(false)
  const [orgError, setOrgError] = useState<string | null>(null)

  // Rename org
  const [renamingOrgId, setRenamingOrgId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [renaming, setRenaming] = useState(false)

  // Create user
  const [createUserOrgId, setCreateUserOrgId] = useState<string | null>(null)
  const [userForm, setUserForm] = useState({ name: "", email: "", role: "ADMIN" })
  const [creatingUser, setCreatingUser] = useState(false)
  const [userError, setUserError] = useState<string | null>(null)
  const [userSuccess, setUserSuccess] = useState<string | null>(null)

  // Redirect non-SUPER_ADMIN
  useEffect(() => {
    if (status === "loading") return
    if (session?.user?.role !== "SUPER_ADMIN") {
      router.replace("/dashboard")
    }
  }, [session, status, router])

  const fetchData = useCallback(async () => {
    const [statsRes, orgsRes] = await Promise.all([
      fetch("/api/admin/stats"),
      fetch("/api/admin/organizations"),
    ])
    if (statsRes.ok) setStats(await statsRes.json() as PlatformStats)
    if (orgsRes.ok) setOrgs(await orgsRes.json() as OrgStats[])
  }, [])

  useEffect(() => { void fetchData() }, [fetchData])

  async function fetchOrgUsers(orgId: string) {
    if (orgUsers[orgId]) return
    const res = await fetch("/api/admin/users")
    if (res.ok) {
      const all = await res.json() as AdminUser[]
      const byOrg: Record<string, AdminUser[]> = {}
      for (const u of all) {
        const key = u.org?.id ?? "no-org"
        if (!byOrg[key]) byOrg[key] = []
        byOrg[key].push(u)
      }
      setOrgUsers((prev) => ({ ...prev, ...byOrg }))
    }
  }

  function toggleOrg(orgId: string) {
    if (expandedOrg === orgId) {
      setExpandedOrg(null)
    } else {
      setExpandedOrg(orgId)
      void fetchOrgUsers(orgId)
    }
  }

  async function handleCreateOrg(e: React.FormEvent) {
    e.preventDefault()
    setOrgError(null)
    setCreatingOrg(true)
    const res = await fetch("/api/admin/organizations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newOrgName }),
    })
    setCreatingOrg(false)
    if (!res.ok) {
      const d = (await res.json()) as { error?: string }
      setOrgError(d.error ?? "Failed to create")
      return
    }
    setNewOrgName("")
    setShowCreateOrg(false)
    void fetchData()
  }

  async function handleRenameOrg(orgId: string) {
    if (!renameValue.trim()) return
    setRenaming(true)
    const res = await fetch(`/api/admin/organizations/${orgId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: renameValue }),
    })
    setRenaming(false)
    if (res.ok) {
      setRenamingOrgId(null)
      void fetchData()
    }
  }

  async function handleDeleteOrg(orgId: string, name: string) {
    if (!confirm(`Delete organisation "${name}"? This will delete all associated data.`)) return
    await fetch(`/api/admin/organizations/${orgId}`, { method: "DELETE" })
    void fetchData()
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault()
    if (!createUserOrgId) return
    setUserError(null)
    setUserSuccess(null)
    setCreatingUser(true)
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...userForm, orgId: createUserOrgId }),
    })
    setCreatingUser(false)
    if (!res.ok) {
      const d = (await res.json()) as { error?: string }
      setUserError(d.error ?? "Failed to create user")
      return
    }
    setUserSuccess(`${userForm.name} created — a setup link was sent to ${userForm.email}`)
    setUserForm({ name: "", email: "", role: "ADMIN" })
    setOrgUsers({})
    void fetchData()
  }

  if (status === "loading" || session?.user?.role !== "SUPER_ADMIN") return null

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "7px 11px", borderRadius: 8, boxSizing: "border-box",
    border: "1px solid var(--ink-6)", background: "var(--paper-sunken)",
    fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--ink-1)", outline: "none",
  }

  const btnPrimary: React.CSSProperties = {
    padding: "7px 14px", borderRadius: 8,
    background: "var(--ink-1)", color: "var(--paper)",
    border: "1px solid transparent",
    fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 500, cursor: "pointer",
    display: "inline-flex", alignItems: "center", gap: 6,
  }

  const btnGhost: React.CSSProperties = {
    padding: "7px 12px", borderRadius: 8,
    background: "transparent", color: "var(--ink-2)",
    border: "1px solid var(--ink-6)",
    fontFamily: "var(--font-sans)", fontSize: 13, cursor: "pointer",
    display: "inline-flex", alignItems: "center", gap: 6,
  }

  return (
    <div style={{ maxWidth: 900 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--ink-1)", marginBottom: 4 }}>
          Platform Admin
        </div>
        <div style={{ fontSize: 13, color: "var(--ink-3)" }}>
          Manage organisations and users across the platform
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 32 }}>
          <StatCard icon={<Building2 style={{ width: 14, height: 14 }} />} label="Organisations" value={stats.orgs} />
          <StatCard icon={<Users style={{ width: 14, height: 14 }} />} label="Users" value={stats.users} />
          <StatCard icon={<Layers style={{ width: 14, height: 14 }} />} label="Decks" value={stats.decks} />
          <StatCard icon={<BookOpen style={{ width: 14, height: 14 }} />} label="Total Reviews" value={stats.reviews.toLocaleString()} />
        </div>
      )}

      {/* Organisations */}
      <div style={{
        background: "var(--paper-raised)", border: "1px solid var(--ink-6)",
        borderRadius: 16, overflow: "hidden", boxShadow: "var(--shadow-1)", marginBottom: 24,
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 20px", borderBottom: "1px solid var(--ink-6)",
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-1)" }}>Organisations</div>
          <button
            onClick={() => { setShowCreateOrg(!showCreateOrg); setOrgError(null) }}
            style={btnPrimary}
          >
            <Plus style={{ width: 13, height: 13 }} />
            New Organisation
          </button>
        </div>

        {showCreateOrg && (
          <form
            onSubmit={(e) => { void handleCreateOrg(e) }}
            style={{ padding: "14px 20px", borderBottom: "1px solid var(--ink-6)", background: "var(--paper-sunken)", display: "flex", gap: 8, alignItems: "flex-end" }}
          >
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--ink-3)", marginBottom: 4 }}>Organisation name</label>
              <input
                required
                autoFocus
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                style={inputStyle}
                placeholder="Acme Corp"
              />
              {orgError && <div style={{ fontSize: 12, color: "var(--red-ink)", marginTop: 4 }}>{orgError}</div>}
            </div>
            <button type="submit" disabled={creatingOrg} style={btnPrimary}>
              {creatingOrg ? "Creating…" : <><Check style={{ width: 13, height: 13 }} /> Create</>}
            </button>
            <button type="button" onClick={() => setShowCreateOrg(false)} style={btnGhost}>
              <X style={{ width: 13, height: 13 }} />
            </button>
          </form>
        )}

        {orgs.length === 0 ? (
          <div style={{ padding: "32px 20px", textAlign: "center", fontSize: 13, color: "var(--ink-4)" }}>
            No organisations yet. Create the first one above.
          </div>
        ) : (
          orgs.map((org) => {
            const isExpanded = expandedOrg === org.id
            const users = orgUsers[org.id] ?? []
            return (
              <div key={org.id} style={{ borderBottom: "1px solid var(--ink-6)" }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "12px 20px",
                  cursor: "pointer",
                }}
                  onClick={() => toggleOrg(org.id)}
                >
                  {isExpanded
                    ? <ChevronDown style={{ width: 14, height: 14, color: "var(--ink-4)", flexShrink: 0 }} />
                    : <ChevronRight style={{ width: 14, height: 14, color: "var(--ink-4)", flexShrink: 0 }} />
                  }

                  {/* Name / rename */}
                  {renamingOrgId === org.id ? (
                    <div style={{ display: "flex", gap: 6, flex: 1 }} onClick={(e) => e.stopPropagation()}>
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        style={{ ...inputStyle, width: 220 }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void handleRenameOrg(org.id)
                          if (e.key === "Escape") setRenamingOrgId(null)
                        }}
                      />
                      <button
                        onClick={() => void handleRenameOrg(org.id)}
                        disabled={renaming}
                        style={{ ...btnPrimary, padding: "5px 10px" }}
                      >
                        <Check style={{ width: 12, height: 12 }} />
                      </button>
                      <button onClick={() => setRenamingOrgId(null)} style={{ ...btnGhost, padding: "5px 10px" }}>
                        <X style={{ width: 12, height: 12 }} />
                      </button>
                    </div>
                  ) : (
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 14, fontWeight: 500, color: "var(--ink-1)" }}>{org.name}</span>
                      <span style={{ fontSize: 12, color: "var(--ink-4)", marginLeft: 10 }}>
                        {org._count.users} user{org._count.users !== 1 ? "s" : ""} · {org._count.decks} deck{org._count.decks !== 1 ? "s" : ""}
                      </span>
                    </div>
                  )}

                  {renamingOrgId !== org.id && (
                    <div style={{ display: "flex", gap: 4 }} onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => { setRenamingOrgId(org.id); setRenameValue(org.name) }}
                        style={{ padding: 6, borderRadius: 6, border: "none", background: "transparent", cursor: "pointer", color: "var(--ink-4)" }}
                        title="Rename"
                      >
                        <Pencil style={{ width: 13, height: 13 }} />
                      </button>
                      <button
                        onClick={() => void handleDeleteOrg(org.id, org.name)}
                        style={{ padding: 6, borderRadius: 6, border: "none", background: "transparent", cursor: "pointer", color: "var(--ink-4)" }}
                        title="Delete"
                      >
                        <Trash2 style={{ width: 13, height: 13 }} />
                      </button>
                    </div>
                  )}
                </div>

                {isExpanded && (
                  <div style={{ background: "var(--paper-sunken)", padding: "12px 20px 16px 48px" }}>
                    {/* Create user for this org */}
                    {createUserOrgId === org.id ? (
                      <form
                        onSubmit={(e) => { void handleCreateUser(e) }}
                        style={{ background: "var(--paper-raised)", border: "1px solid var(--ink-6)", borderRadius: 10, padding: "14px 16px", marginBottom: 12 }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-2)", marginBottom: 10 }}>Add user to {org.name}</div>
                        {userError && <div style={{ fontSize: 12, color: "var(--red-ink)", marginBottom: 8 }}>{userError}</div>}
                        {userSuccess && <div style={{ fontSize: 12, color: "var(--green-ink)", marginBottom: 8 }}>{userSuccess}</div>}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "end" }}>
                          <div>
                            <label style={{ display: "block", fontSize: 11, color: "var(--ink-3)", marginBottom: 3 }}>Name</label>
                            <input required value={userForm.name} onChange={(e) => setUserForm((f) => ({ ...f, name: e.target.value }))} style={inputStyle} placeholder="Jane Smith" />
                          </div>
                          <div>
                            <label style={{ display: "block", fontSize: 11, color: "var(--ink-3)", marginBottom: 3 }}>Email</label>
                            <input required type="email" value={userForm.email} onChange={(e) => setUserForm((f) => ({ ...f, email: e.target.value }))} style={inputStyle} placeholder="jane@acme.com" />
                          </div>
                          <div>
                            <label style={{ display: "block", fontSize: 11, color: "var(--ink-3)", marginBottom: 3 }}>Role</label>
                            <select value={userForm.role} onChange={(e) => setUserForm((f) => ({ ...f, role: e.target.value }))} style={{ ...inputStyle, width: "auto" }}>
                              <option value="ADMIN">Admin</option>
                              <option value="MANAGER">Manager</option>
                              <option value="AGENT">Agent</option>
                            </select>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                          <button type="submit" disabled={creatingUser} style={btnPrimary}>
                            {creatingUser ? "Creating…" : <><UserPlus style={{ width: 12, height: 12 }} /> Create &amp; Send Setup Email</>}
                          </button>
                          <button type="button" onClick={() => { setCreateUserOrgId(null); setUserError(null); setUserSuccess(null) }} style={btnGhost}>
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button
                        onClick={() => { setCreateUserOrgId(org.id); setUserError(null); setUserSuccess(null) }}
                        style={{ ...btnGhost, marginBottom: 10, fontSize: 12 }}
                      >
                        <UserPlus style={{ width: 12, height: 12 }} /> Add user
                      </button>
                    )}

                    {/* User list */}
                    {users.length === 0 ? (
                      <div style={{ fontSize: 12, color: "var(--ink-4)" }}>No users in this organisation yet.</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        {users.filter((u) => u.org?.id === org.id).map((u) => (
                          <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
                            <div style={{
                              width: 28, height: 28, borderRadius: "50%", background: "var(--ink-6)",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 11, fontWeight: 600, color: "var(--ink-2)", flexShrink: 0,
                            }}>
                              {(u.name ?? u.email).slice(0, 2).toUpperCase()}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-1)" }}>{u.name ?? u.email}</div>
                              <div style={{ fontSize: 11, color: "var(--ink-4)" }}>{u.email}</div>
                            </div>
                            <span style={{
                              fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99,
                              background: u.role === "ADMIN" ? "var(--violet-50)" : u.role === "MANAGER" ? "var(--blue-50)" : "var(--paper-sunken)",
                              color: u.role === "ADMIN" ? "var(--violet-600)" : u.role === "MANAGER" ? "var(--blue-600)" : "var(--ink-3)",
                            }}>
                              {u.role}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
