"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Play } from "lucide-react"

type ReviewStats = {
  dueCount: number
  todayCount: number
  streak: number
  nextDueDate: string | null
}

type DeckSummary = {
  id: string
  name: string
  total: number
  due: number
  mastered: number
  lapsed: number
  tags: string[]
  lastReview: string | null
}

function formatTimeUntil(isoDate: string): string {
  const diff = new Date(isoDate).getTime() - Date.now()
  if (diff <= 0) return "now"
  const mins = Math.floor(diff / 60_000)
  const hours = Math.floor(mins / 60)
  if (mins < 60) return `${mins}m`
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: "var(--font-mono)", fontSize: 10,
      letterSpacing: "0.08em", textTransform: "uppercase",
      color: "var(--ink-3)", marginBottom: 8,
    }}>
      {children}
    </div>
  )
}

function Panel({ children, accent }: { children: React.ReactNode; accent?: string }) {
  return (
    <div style={{
      background: "var(--paper-raised)",
      border: "1px solid var(--ink-6)",
      borderLeft: accent ? `3px solid ${accent}` : "1px solid var(--ink-6)",
      borderRadius: 14, padding: 16,
    }}>
      {children}
    </div>
  )
}

function RetentionBar({ mastered, due, lapsed, total }: { mastered: number; due: number; lapsed: number; total: number }) {
  if (total === 0) return null
  return (
    <div style={{ height: 4, background: "var(--paper-sunken)", borderRadius: 999, overflow: "hidden", display: "flex" }}>
      <div style={{ width: `${(mastered / total) * 100}%`, background: "var(--green-500)" }} />
      <div style={{ width: `${(due    / total) * 100}%`, background: "var(--amber-500)" }} />
      <div style={{ width: `${(lapsed / total) * 100}%`, background: "var(--red-500)" }} />
    </div>
  )
}

function DeckTile({ deck, onStart }: { deck: DeckSummary; onStart: () => void }) {
  const pct = deck.total > 0 ? Math.round((deck.mastered / deck.total) * 100) : 0
  const hasDue = deck.due > 0

  return (
    <div
      style={{
        background: "var(--paper-raised)", border: "1px solid var(--ink-6)",
        borderRadius: 14, padding: 16,
        display: "flex", flexDirection: "column", gap: 10, cursor: "pointer",
        transition: `box-shadow var(--dur-quick) var(--ease-out), border-color var(--dur-quick) var(--ease-out), transform var(--dur-quick) var(--ease-out)`,
      }}
      onClick={onStart}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-lift)"
        ;(e.currentTarget as HTMLDivElement).style.borderColor = "var(--ink-5)"
        ;(e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)"
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "none"
        ;(e.currentTarget as HTMLDivElement).style.borderColor = "var(--ink-6)"
        ;(e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {deck.name}
          </div>
          <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>
            {deck.total} card{deck.total !== 1 ? "s" : ""}
          </div>
        </div>
        {hasDue ? (
          <span style={{
            fontSize: 12, fontWeight: 500, padding: "3px 9px", borderRadius: 999,
            display: "inline-flex", alignItems: "center", gap: 5,
            background: "var(--amber-50)", color: "var(--amber-ink)", border: "1px solid transparent",
          }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--amber-500)" }} />
            {deck.due} due
          </span>
        ) : (
          <span style={{
            fontSize: 12, fontWeight: 500, padding: "3px 9px", borderRadius: 999,
            display: "inline-flex", alignItems: "center", gap: 5,
            background: "var(--green-50)", color: "var(--green-ink)", border: "1px solid transparent",
          }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--green-500)" }} />
            Caught up
          </span>
        )}
      </div>
      <RetentionBar mastered={deck.mastered} due={deck.due} lapsed={deck.lapsed} total={deck.total} />
      <div style={{
        display: "flex", justifyContent: "space-between",
        fontFamily: "var(--font-mono)", fontSize: 10,
        letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-4)",
      }}>
        <span>{pct}% mastered</span>
        {deck.lastReview && <span>last {deck.lastReview}</span>}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<ReviewStats | null>(null)
  const [decks, setDecks] = useState<DeckSummary[]>([])

  useEffect(() => {
    void fetch("/api/review/stats").then((r) => r.ok ? r.json() : null).then((d) => { if (d) setStats(d) })
    void fetch("/api/decks").then((r) => r.ok ? r.json() : null).then((data: {decks?: DeckSummary[]} | null) => {
      if (data?.decks) setDecks(data.decks)
    })
  }, [])

  const totalDue = stats?.dueCount ?? 0
  const retention = decks.length > 0
    ? Math.round(decks.reduce((s, d) => s + (d.total > 0 ? d.mastered / d.total : 0), 0) / decks.length * 100)
    : null

  // Build streak bar data (last 14 days as relative heights — real data would come from API)
  const streakDays = stats?.streak ?? 0

  return (
    <div>
      {/* Top bar */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "18px 28px", borderBottom: "1px solid var(--ink-6)",
      }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--ink-1)" }}>Dashboard</div>
          {totalDue > 0 && (
            <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 2 }}>
              {totalDue} card{totalDue !== 1 ? "s" : ""} due for review
            </div>
          )}
        </div>
        <button
          onClick={() => router.push("/review")}
          disabled={totalDue === 0}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "8px 14px", borderRadius: 10,
            background: totalDue > 0 ? "var(--ink-1)" : "var(--paper-sunken)",
            color: totalDue > 0 ? "var(--paper)" : "var(--ink-4)",
            border: "1px solid transparent",
            fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 500,
            cursor: totalDue > 0 ? "pointer" : "default",
            transition: "background var(--dur-quick) var(--ease-out)",
          }}
        >
          <Play size={12} strokeWidth={0} style={{ fill: "currentColor" }} />
          Start review{totalDue > 0 ? ` · ${totalDue}` : ""}
        </button>
      </div>

      <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Stats panels */}
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14 }}>
          {/* Retention */}
          <Panel accent="var(--green-500)">
            <Eyebrow>Retention · 30 days</Eyebrow>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <div style={{ fontSize: 32, fontWeight: 500, letterSpacing: "-0.02em", color: "var(--ink-1)", lineHeight: 1 }}>
                {retention ?? "–"}
                {retention !== null && <span style={{ fontSize: 18, color: "var(--ink-3)" }}>%</span>}
              </div>
            </div>
            {decks.length > 0 && (() => {
              const total = decks.reduce((s, d) => s + d.total, 0)
              const mastered = decks.reduce((s, d) => s + d.mastered, 0)
              const due = decks.reduce((s, d) => s + d.due, 0)
              const lapsed = decks.reduce((s, d) => s + d.lapsed, 0)
              return (
                <>
                  <div style={{ height: 6, background: "var(--paper-sunken)", borderRadius: 999, overflow: "hidden", display: "flex", marginTop: 10 }}>
                    <div style={{ width: `${total > 0 ? (mastered / total) * 100 : 0}%`, background: "var(--green-500)" }} />
                    <div style={{ width: `${total > 0 ? (due / total) * 100 : 0}%`, background: "var(--amber-500)" }} />
                    <div style={{ width: `${total > 0 ? (lapsed / total) * 100 : 0}%`, background: "var(--red-500)" }} />
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 8, display: "flex", gap: 14 }}>
                    {[
                      { c: "var(--green-500)", label: `${total > 0 ? Math.round((mastered/total)*100) : 0}% mastered` },
                      { c: "var(--amber-500)", label: `${due} due` },
                      { c: "var(--red-500)",   label: `${lapsed} lapsed` },
                    ].map(({ c, label }) => (
                      <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                        <span style={{ width: 6, height: 6, borderRadius: 999, background: c }} />
                        {label}
                      </span>
                    ))}
                  </div>
                </>
              )
            })()}
          </Panel>

          {/* Streak */}
          <Panel accent="var(--amber-500)">
            <Eyebrow>Streak</Eyebrow>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <div style={{ fontSize: 32, fontWeight: 500, letterSpacing: "-0.02em", color: "var(--ink-1)", lineHeight: 1 }}>
                {streakDays}
                <span style={{ fontSize: 18, color: "var(--ink-3)" }}> days</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 32, marginTop: 10 }}>
              {Array.from({ length: 13 }, (_, i) => {
                const filled = i < streakDays
                const barH = filled ? 40 + ((i * 53 + 17) % 51) : 15
                return (
                  <div key={i} style={{
                    width: 8, height: `${barH}%`,
                    background: filled ? "var(--green-500)" : "var(--ink-6)",
                    borderRadius: 2, flexShrink: 0,
                  }} />
                )
              })}
              <div style={{ width: 8, height: "100%", border: "1px dashed var(--ink-5)", borderRadius: 2, flexShrink: 0 }} />
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-3)", marginTop: 8, letterSpacing: "0.04em" }}>
              {stats?.todayCount ?? 0} reviewed today
            </div>
          </Panel>
        </div>

        {/* Decks grid */}
        {decks.length > 0 && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: "var(--ink-1)" }}>All decks</h2>
              <span style={{ fontSize: 12, color: "var(--ink-3)" }}>
                {totalDue} due across {decks.length} deck{decks.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
              {decks.map((deck) => (
                <DeckTile key={deck.id} deck={deck} onStart={() => router.push("/review")} />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {decks.length === 0 && stats !== null && (
          <div style={{
            textAlign: "center", padding: "48px 24px",
            color: "var(--ink-3)", fontSize: 14,
          }}>
            No cards yet. Add one to start reviewing.
          </div>
        )}

        {/* Nothing due */}
        {decks.length > 0 && totalDue === 0 && stats !== null && (
          <div style={{
            background: "var(--green-50)", border: "1px solid var(--green-100)",
            borderRadius: 12, padding: "12px 16px",
            fontSize: 13, color: "var(--green-ink)",
          }}>
            {stats.nextDueDate
              ? `You're caught up. Next card is due in ${formatTimeUntil(stats.nextDueDate)}.`
              : "You're caught up."}
          </div>
        )}
      </div>
    </div>
  )
}
