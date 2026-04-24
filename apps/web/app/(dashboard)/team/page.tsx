"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"
import {
  Users,
  Brain,
  CheckCircle,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  TrendingDown,
} from "lucide-react"

// ─── types ────────────────────────────────────────────────────────────────────

type DeckRetention = {
  deckId: string
  deckName: string
  avgRetention: number
  totalCards: number
  membersAssigned: number
}

type UserScore = {
  userId: string
  name: string
  email: string
  avgRetention: number
  completionRate: number
  reviewsThisWeek: number
  lastReviewAt: string | null
}

type KnowledgeGap = {
  cardId: string
  question: string
  deckName: string
  avgRetention: number
  reviewCount: number
}

type NewHireProgress = {
  userId: string
  name: string
  weeksOnboarding: number
  completionPct: number
  onTrack: boolean
}

type TeamData = {
  teamSize: number
  avgRetention: number
  avgCompletionRate: number
  totalActiveCards: number
  deckRetention: DeckRetention[]
  userScores: UserScore[]
  knowledgeGaps: KnowledgeGap[]
  newHireProgress: NewHireProgress[]
}

// ─── skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-ink-6 ${className ?? ""}`}
    />
  )
}

function StatCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-ink-6 bg-paper-raised p-5 shadow-s1">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-10 w-20" />
    </div>
  )
}

// ─── stat card ────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  sub?: string
  color: string
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-ink-6 bg-paper-raised p-5 shadow-s1">
      <div className={`flex items-center gap-2 text-sm font-medium text-ink-3`}>
        <span className={color}>{icon}</span>
        {label}
      </div>
      <p className="text-4xl font-bold text-ink-1">{value}</p>
      {sub && <p className="text-xs text-ink-4">{sub}</p>}
    </div>
  )
}

// ─── sortable table helpers ────────────────────────────────────────────────────

type SortDir = "asc" | "desc"

function useSortedRows<T extends Record<string, unknown>>(
  rows: T[],
  initialKey: keyof T,
  initialDir: SortDir = "desc"
) {
  const [key, setKey] = useState<keyof T>(initialKey)
  const [dir, setDir] = useState<SortDir>(initialDir)

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const av = a[key]
      const bv = b[key]
      if (av == null) return 1
      if (bv == null) return -1
      if (typeof av === "number" && typeof bv === "number") {
        return dir === "asc" ? av - bv : bv - av
      }
      const as = String(av)
      const bs = String(bv)
      return dir === "asc" ? as.localeCompare(bs) : bs.localeCompare(as)
    })
  }, [rows, key, dir])

  function toggle(col: keyof T) {
    if (col === key) {
      setDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setKey(col)
      setDir("desc")
    }
  }

  function SortIcon({ col }: { col: keyof T }) {
    if (col !== key) return <ChevronDown className="inline h-3 w-3 text-ink-5" />
    return dir === "asc" ? (
      <ChevronUp className="inline h-3 w-3 text-ds-blue-500" />
    ) : (
      <ChevronDown className="inline h-3 w-3 text-ds-blue-500" />
    )
  }

  return { sorted, toggle, SortIcon }
}

// ─── retention colour helper ──────────────────────────────────────────────────

function retentionColor(r: number): string {
  if (r >= 80) return "#22c55e"
  if (r >= 60) return "#f59e0b"
  return "#ef4444"
}

function RetentionBadge({ value }: { value: number }) {
  const color =
    value >= 80
      ? "bg-ds-green-100 text-ds-green-ink"
      : value >= 60
      ? "bg-ds-amber-100 text-ds-amber-ink"
      : "bg-ds-red-100 text-ds-red-ink"
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}>
      {value}%
    </span>
  )
}

// ─── main component ───────────────────────────────────────────────────────────

export default function TeamPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([])
  const [selectedTeam, setSelectedTeam] = useState<string>("")
  const [data, setData] = useState<TeamData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Redirect agents
  useEffect(() => {
    if (status === "loading") return
    if (!session?.user) return
    const role = session.user.role as string
    if (role !== "MANAGER" && role !== "ADMIN") {
      router.replace("/dashboard")
    }
  }, [session, status, router])

  // Fetch teams list
  useEffect(() => {
    void fetch("/api/teams")
      .then((r) => (r.ok ? r.json() : []))
      .then((d: { id: string; name: string }[]) => {
        setTeams(d)
        if (d.length > 0) setSelectedTeam(d[0].id)
      })
  }, [])

  // Fetch analytics when team selected
  useEffect(() => {
    if (!selectedTeam) return
    setLoading(true)
    setError(null)
    void fetch(`/api/analytics/team/${selectedTeam}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("Failed to load analytics")
        return r.json() as Promise<TeamData>
      })
      .then((d) => {
        setData(d)
        setLoading(false)
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Unknown error")
        setLoading(false)
      })
  }, [selectedTeam])

  const memberTable = useSortedRows<UserScore>(
    data?.userScores ?? [],
    "avgRetention"
  )
  const gapsTable = useSortedRows<KnowledgeGap>(
    data?.knowledgeGaps ?? [],
    "avgRetention"
  )

  // Alerts
  const alerts = useMemo(() => {
    if (!data) return []
    const list: string[] = []
    const lowRetention = data.userScores.filter((u) => u.avgRetention < 60)
    if (lowRetention.length > 0) {
      list.push(
        `${lowRetention.length} team member${lowRetention.length > 1 ? "s" : ""} have retention below 60%`
      )
    }
    const overdueDeck = data.deckRetention.find((d) => d.avgRetention < 50)
    if (overdueDeck) {
      list.push(`"${overdueDeck.deckName}" deck retention is critically low (${overdueDeck.avgRetention}%)`)
    }
    const behindHires = data.newHireProgress.filter((h) => !h.onTrack)
    if (behindHires.length > 0) {
      list.push(`${behindHires.length} new hire${behindHires.length > 1 ? "s are" : " is"} behind on onboarding`)
    }
    return list
  }, [data])

  if (status === "loading") return null

  const role = session?.user?.role as string | undefined
  if (role !== "MANAGER" && role !== "ADMIN") return null

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-1">Team Analytics</h1>
          <p className="mt-1 text-sm text-ink-3">
            Monitor your team&apos;s learning performance
          </p>
        </div>
        {teams.length > 1 && (
          <select
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="rounded-lg border border-ink-6 px-3 py-2 text-sm text-ink-2 focus:outline-none focus:ring-2 focus:ring-ds-blue-500"
          >
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((msg, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-lg border border-ds-amber-100 bg-ds-amber-50 p-3 text-sm text-ds-amber-ink"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-ds-amber-500" />
              {msg}
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-ds-red-100 bg-ds-red-50 p-3 text-sm text-ds-red-ink">
          {error}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              icon={<Users className="h-4 w-4" />}
              label="Team Size"
              value={data?.teamSize ?? "—"}
              color="text-ds-blue-500"
            />
            <StatCard
              icon={<Brain className="h-4 w-4" />}
              label="Avg Retention"
              value={data ? `${data.avgRetention}%` : "—"}
              sub={data && data.avgRetention < 70 ? "Below target (70%)" : undefined}
              color="text-ds-violet-500"
            />
            <StatCard
              icon={<CheckCircle className="h-4 w-4" />}
              label="Completion Rate"
              value={data ? `${data.avgCompletionRate}%` : "—"}
              color="text-ds-green-500"
            />
            <StatCard
              icon={<Brain className="h-4 w-4" />}
              label="Active Cards"
              value={data?.totalActiveCards ?? "—"}
              color="text-ds-blue-500"
            />
          </>
        )}
      </div>

      {/* Retention by Deck chart */}
      <div className="rounded-xl border border-ink-6 bg-paper-raised p-6 shadow-s1">
        <h2 className="mb-4 text-sm font-semibold text-ink-2">Retention by Deck</h2>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        ) : data && data.deckRetention.length > 0 ? (
          <ResponsiveContainer width="100%" height={Math.max(200, data.deckRetention.length * 48)}>
            <BarChart
              data={data.deckRetention}
              layout="vertical"
              margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 12 }} />
              <YAxis
                type="category"
                dataKey="deckName"
                width={140}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                formatter={(value) => [`${value as number}%`, "Avg Retention"]}
              />
              <Bar dataKey="avgRetention" radius={[0, 4, 4, 0]} maxBarSize={28}>
                {data.deckRetention.map((d) => (
                  <Cell key={d.deckId} fill={retentionColor(d.avgRetention)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-ink-4">No deck data yet.</p>
        )}
      </div>

      {/* Team Members table */}
      <div className="rounded-xl border border-ink-6 bg-paper-raised shadow-s1">
        <div className="border-b border-ink-6 px-6 py-4">
          <h2 className="text-sm font-semibold text-ink-2">Team Members</h2>
        </div>
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : data && data.userScores.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-6 bg-paper-sunken text-left text-xs font-semibold uppercase tracking-wide text-ink-3">
                  {(
                    [
                      ["name", "Name"],
                      ["avgRetention", "Retention"],
                      ["completionRate", "Completion"],
                      ["reviewsThisWeek", "Reviews This Week"],
                      ["lastReviewAt", "Last Review"],
                    ] as [keyof UserScore, string][]
                  ).map(([col, label]) => (
                    <th
                      key={col}
                      className="cursor-pointer select-none px-4 py-3 hover:text-ink-2"
                      onClick={() => memberTable.toggle(col)}
                    >
                      {label} <memberTable.SortIcon col={col} />
                    </th>
                  ))}
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-6">
                {memberTable.sorted.map((u) => (
                  <tr key={u.userId} className="hover:bg-paper-sunken">
                    <td className="px-4 py-3 font-medium text-ink-1">
                      {u.name}
                      <div className="text-xs text-ink-4">{u.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <RetentionBadge value={u.avgRetention} />
                    </td>
                    <td className="px-4 py-3">
                      <RetentionBadge value={u.completionRate} />
                    </td>
                    <td className="px-4 py-3 text-ink-3">
                      {u.reviewsThisWeek}
                    </td>
                    <td className="px-4 py-3 text-ink-4">
                      {u.lastReviewAt
                        ? new Date(u.lastReviewAt).toLocaleDateString()
                        : "Never"}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => router.push(`/team/${u.userId}`)}
                        className="text-xs text-ds-blue-600 hover:underline"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-6 text-sm text-ink-4">No team members found.</p>
        )}
      </div>

      {/* Knowledge Gaps table */}
      <div className="rounded-xl border border-ink-6 bg-paper-raised shadow-s1">
        <div className="border-b border-ink-6 px-6 py-4">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-ds-red-500" />
            <h2 className="text-sm font-semibold text-ink-2">Knowledge Gaps</h2>
          </div>
          <p className="mt-0.5 text-xs text-ink-4">
            Cards with the lowest average retention across your org
          </p>
        </div>
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : data && data.knowledgeGaps.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-6 bg-paper-sunken text-left text-xs font-semibold uppercase tracking-wide text-ink-3">
                  {(
                    [
                      ["question", "Question"],
                      ["deckName", "Deck"],
                      ["avgRetention", "Retention"],
                      ["reviewCount", "Reviews"],
                    ] as [keyof KnowledgeGap, string][]
                  ).map(([col, label]) => (
                    <th
                      key={col}
                      className="cursor-pointer select-none px-4 py-3 hover:text-ink-2"
                      onClick={() => gapsTable.toggle(col)}
                    >
                      {label} <gapsTable.SortIcon col={col} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-6">
                {gapsTable.sorted.map((g) => (
                  <tr key={g.cardId} className="hover:bg-paper-sunken">
                    <td className="max-w-xs truncate px-4 py-3 text-ink-1">
                      {g.question}
                    </td>
                    <td className="px-4 py-3 text-ink-3">{g.deckName}</td>
                    <td className="px-4 py-3">
                      <RetentionBadge value={g.avgRetention} />
                    </td>
                    <td className="px-4 py-3 text-ink-3">{g.reviewCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-6 text-sm text-ink-4">No knowledge gaps detected.</p>
        )}
      </div>

      {/* New Hire Ramp */}
      {data && data.newHireProgress.length > 0 && (
        <div className="rounded-xl border border-ink-6 bg-paper-raised shadow-s1">
          <div className="border-b border-ink-6 px-6 py-4">
            <h2 className="text-sm font-semibold text-ink-2">New Hire Onboarding</h2>
          </div>
          <div className="divide-y divide-ink-6">
            {data.newHireProgress.map((h) => (
              <div key={h.userId} className="flex items-center gap-4 px-6 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-ink-1">{h.name}</span>
                    {!h.onTrack && (
                      <span className="rounded-full bg-ds-red-100 px-2 py-0.5 text-xs font-semibold text-ds-red-ink">
                        Behind
                      </span>
                    )}
                    {h.onTrack && (
                      <span className="rounded-full bg-ds-green-100 px-2 py-0.5 text-xs font-semibold text-ds-green-ink">
                        On track
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-ink-4">
                    Week {h.weeksOnboarding} of onboarding
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-ink-6">
                    <div
                      className={`h-full rounded-full ${h.onTrack ? "bg-ds-green-500" : "bg-ds-amber-500"}`}
                      style={{ width: `${h.completionPct}%` }}
                    />
                  </div>
                </div>
                <span className="shrink-0 text-sm font-semibold text-ink-2">
                  {h.completionPct}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
