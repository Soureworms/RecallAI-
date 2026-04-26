"use client"

import { useEffect, useState } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Users, Layers, BookOpen, TrendingUp, AlertTriangle } from "lucide-react"

type OrgData = {
  totalUsers: number
  activeThisWeek: number
  totalDecks: number
  totalCards: number
  avgRetention: number
  reviewActivity: { date: string; count: number }[]
  knowledgeGaps: { tag: string; avgRetention: number; affectedCards: number; strugglingUsers: number }[]
}

function StatTile({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
  accent?: string
}) {
  return (
    <div
      style={{
        background: "var(--paper-raised)",
        border: "1px solid var(--ink-6)",
        borderLeft: `3px solid ${accent ?? "var(--ink-5)"}`,
        borderRadius: 14,
        padding: "16px 20px",
        display: "flex",
        alignItems: "center",
        gap: 14,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: accent ? `${accent}18` : "var(--paper-sunken)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={16} style={{ color: accent ?? "var(--ink-3)" }} strokeWidth={1.75} />
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--ink-1)", lineHeight: 1.1 }}>
          {value}
        </div>
        <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  )
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-ink-6 ${className ?? ""}`} />
}

export function OrgAnalytics() {
  const [data, setData] = useState<OrgData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void fetch("/api/analytics/org")
      .then(async (r) => {
        if (!r.ok) throw new Error("Failed to load org analytics")
        return r.json() as Promise<OrgData>
      })
      .then((d) => { setData(d); setLoading(false) })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Unknown error")
        setLoading(false)
      })
  }, [])

  if (error) return null

  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--ink-1)" }}>
          Organisation Overview
        </h2>
        <p style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 2 }}>
          Across all members and decks in your workspace
        </p>
      </div>

      {/* Stat tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)
        ) : data ? (
          <>
            <StatTile
              icon={Users}
              label="Total members"
              value={data.totalUsers}
              sub={`${data.activeThisWeek} active this week`}
              accent="var(--violet-500)"
            />
            <StatTile
              icon={TrendingUp}
              label="Avg. retention"
              value={`${data.avgRetention}%`}
              sub="Across all reviewed cards"
              accent="var(--green-500)"
            />
            <StatTile
              icon={Layers}
              label="Active decks"
              value={data.totalDecks}
              accent="var(--blue-500)"
            />
            <StatTile
              icon={BookOpen}
              label="Active cards"
              value={data.totalCards}
              accent="var(--amber-500)"
            />
          </>
        ) : null}
      </div>

      {/* Review activity */}
      <div
        style={{
          background: "var(--paper-raised)",
          border: "1px solid var(--ink-6)",
          borderRadius: 14,
          padding: 20,
          marginBottom: 12,
        }}
      >
        <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-2)", marginBottom: 14 }}>
          Organisation Reviews — Last 14 Days
        </h3>
        {loading ? (
          <Skeleton className="h-32 w-full" />
        ) : data && data.reviewActivity.some((d) => d.count > 0) ? (
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={data.reviewActivity} margin={{ top: 2, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10 }}
                tickFormatter={(v: string) =>
                  new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                }
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
              <Tooltip
                formatter={(v) => [v as number, "Reviews"]}
                labelFormatter={(l) => new Date(l as string).toLocaleDateString()}
              />
              <Bar dataKey="count" fill="var(--violet-500)" radius={[2, 2, 0, 0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p style={{ fontSize: 13, color: "var(--ink-4)" }}>No reviews in the last 14 days.</p>
        )}
      </div>

      {/* Knowledge gaps */}
      {!loading && data && data.knowledgeGaps.length > 0 && (
        <div
          style={{
            background: "var(--paper-raised)",
            border: "1px solid var(--ink-6)",
            borderRadius: 14,
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--ink-6)", display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle size={14} style={{ color: "var(--amber-500)" }} strokeWidth={1.75} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-2)" }}>Knowledge Gaps</span>
            <span style={{ fontSize: 11, color: "var(--ink-4)", marginLeft: "auto" }}>Topics below 80% retention</span>
          </div>
          <div>
            {data.knowledgeGaps.map((gap) => (
              <div
                key={gap.tag}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 20px",
                  borderBottom: "1px solid var(--ink-6)",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      display: "inline-block",
                      background: "var(--paper-sunken)",
                      border: "1px solid var(--ink-6)",
                      borderRadius: 999,
                      padding: "2px 8px",
                      fontSize: 11,
                      fontWeight: 500,
                      color: "var(--ink-2)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {gap.tag}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
                  <span style={{ fontSize: 11, color: "var(--ink-4)" }}>
                    {gap.affectedCards} cards · {gap.strugglingUsers} user{gap.strugglingUsers !== 1 ? "s" : ""}
                  </span>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 600,
                      background: gap.avgRetention < 50 ? "var(--red-50)" : "var(--amber-50)",
                      color: gap.avgRetention < 50 ? "var(--red-ink)" : "var(--amber-700)",
                    }}
                  >
                    {gap.avgRetention}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
