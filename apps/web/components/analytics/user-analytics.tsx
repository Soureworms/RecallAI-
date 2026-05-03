"use client"

import { useEffect, useState } from "react"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { Brain, TrendingDown, Clock } from "lucide-react"

// ─── types ────────────────────────────────────────────────────────────────────

type TimelinePoint = { date: string; retention: number }

type ActivityPoint = { date: string; count: number }

type DeckProgress = {
  deckId: string
  deckName: string
  masteredPct: number
  learningPct: number
  newPct: number
  totalCards: number
}

type WeakCard = {
  cardId: string
  question: string
  deckName: string
  retention: number
  lapses: number
}

type RecentReview = {
  cardId: string
  question: string
  deckName: string
  rating: number | string
  reviewedAt: string
  typedAnswer?: string | null
  answerScore?: number | null
  answerPassed?: boolean | null
}

type NewHireProgress = {
  userId: string
  name: string
  weeksOnboarding: number
  completionPct: number
  onTrack: boolean
} | null

type UserAnalyticsData = {
  timeline: TimelinePoint[]
  activity: ActivityPoint[]
  deckProgress: DeckProgress[]
  weakCards: WeakCard[]
  recentReviews: RecentReview[]
  newHireProgress: NewHireProgress
}

// ─── skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-ink-6 ${className ?? ""}`} />
}

function ChartSkeleton() {
  return (
    <div className="rounded-xl border border-ink-6 bg-paper-raised p-6 shadow-s1">
      <Skeleton className="mb-4 h-4 w-40" />
      <Skeleton className="h-48 w-full" />
    </div>
  )
}

// ─── rating label ─────────────────────────────────────────────────────────────

const RATING_LABELS: Record<string, { label: string; color: string }> = {
  1: { label: "Again", color: "bg-ds-red-100 text-ds-red-ink" },
  2: { label: "Hard", color: "bg-ds-amber-100 text-ds-amber-ink" },
  3: { label: "Good", color: "bg-ds-blue-100 text-ds-blue-ink" },
  4: { label: "Easy", color: "bg-ds-green-100 text-ds-green-ink" },
  AGAIN: { label: "Again", color: "bg-ds-red-100 text-ds-red-ink" },
  HARD: { label: "Hard", color: "bg-ds-amber-100 text-ds-amber-ink" },
  GOOD: { label: "Good", color: "bg-ds-blue-100 text-ds-blue-ink" },
  EASY: { label: "Easy", color: "bg-ds-green-100 text-ds-green-ink" },
}

// ─── main component ───────────────────────────────────────────────────────────

export function UserAnalytics({
  userId,
  title,
}: {
  userId: string
  title?: string
}) {
  const [data, setData] = useState<UserAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    void fetch(`/api/analytics/user/${userId}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("Failed to load analytics")
        return r.json() as Promise<UserAnalyticsData>
      })
      .then((d) => {
        setData(d)
        setLoading(false)
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Unknown error")
        setLoading(false)
      })
  }, [userId])

  if (error) {
    return (
      <div className="rounded-lg border border-ds-red-100 bg-ds-red-50 p-4 text-sm text-ds-red-ink">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {title && (
        <div>
          <h1 className="text-2xl font-bold text-ink-1">{title}</h1>
        </div>
      )}

      {/* New hire ramp */}
      {!loading && data?.newHireProgress && (
        <div className="rounded-xl border border-ds-blue-100 bg-ds-blue-50 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-ds-blue-ink">
                Onboarding, Week {data.newHireProgress.weeksOnboarding}
              </p>
              <p className="mt-0.5 text-xs text-ds-blue-500">
                {data.newHireProgress.onTrack ? "On track" : "Behind schedule"}
              </p>
            </div>
            <span className="text-2xl font-bold text-ds-blue-ink">
              {data.newHireProgress.completionPct}%
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-ds-blue-100">
            <div
              className={`h-full rounded-full ${
                data.newHireProgress.onTrack ? "bg-ds-blue-500" : "bg-ds-amber-500"
              }`}
              style={{ width: `${data.newHireProgress.completionPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Retention timeline */}
      <div className="rounded-xl border border-ink-6 bg-paper-raised p-6 shadow-s1">
        <h2 className="mb-4 text-sm font-semibold text-ink-2">
          Retention Over Time
        </h2>
        {loading ? (
          <Skeleton className="h-48 w-full" />
        ) : data && data.timeline.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data.timeline} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickFormatter={(v: string) =>
                  new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                }
              />
              <YAxis domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(v) => [`${v as number}%`, "Retention"]}
                labelFormatter={(l) => new Date(l as string).toLocaleDateString()}
              />
              <Line
                type="monotone"
                dataKey="retention"
                stroke="#6366f1"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-ink-4">No review history yet.</p>
        )}
      </div>

      {/* Review activity */}
      <div className="rounded-xl border border-ink-6 bg-paper-raised p-6 shadow-s1">
        <h2 className="mb-4 text-sm font-semibold text-ink-2">
          Daily Review Activity (Last 30 Days)
        </h2>
        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : data && data.activity.length > 0 ? (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={data.activity} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickFormatter={(v: string) =>
                  new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                }
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(v) => [v as number, "Reviews"]}
                labelFormatter={(l) => new Date(l as string).toLocaleDateString()}
              />
              <Bar dataKey="count" fill="#6366f1" radius={[2, 2, 0, 0]} maxBarSize={16} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-ink-4">No activity yet.</p>
        )}
      </div>

      {/* Deck progress */}
      <div className="rounded-xl border border-ink-6 bg-paper-raised p-6 shadow-s1">
        <h2 className="mb-4 text-sm font-semibold text-ink-2">Deck Progress</h2>
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : data && data.deckProgress.length > 0 ? (
          <div className="space-y-4">
            {data.deckProgress.map((d) => (
              <div key={d.deckId}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-medium text-ink-2">{d.deckName}</span>
                  <span className="text-xs text-ink-4">{d.totalCards} cards</span>
                </div>
                <div className="flex h-2.5 overflow-hidden rounded-full bg-ink-6">
                  <div
                    className="bg-ds-green-500"
                    style={{ width: `${d.masteredPct}%` }}
                    title={`Mastered: ${d.masteredPct}%`}
                  />
                  <div
                    className="bg-ds-blue-500"
                    style={{ width: `${d.learningPct}%` }}
                    title={`Learning: ${d.learningPct}%`}
                  />
                  <div
                    className="bg-ink-5"
                    style={{ width: `${d.newPct}%` }}
                    title={`New: ${d.newPct}%`}
                  />
                </div>
                <div className="mt-1 flex gap-3 text-xs text-ink-4">
                  <span>
                    <span className="font-medium text-ds-green-ink">{d.masteredPct}%</span> mastered
                  </span>
                  <span>
                    <span className="font-medium text-ds-blue-500">{d.learningPct}%</span> learning
                  </span>
                  <span>
                    <span className="font-medium text-ink-3">{d.newPct}%</span> new
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-4">No decks assigned.</p>
        )}
      </div>

      {/* Weakest cards */}
      <div className="rounded-xl border border-ink-6 bg-paper-raised shadow-s1">
        <div className="border-b border-ink-6 px-6 py-4">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-ds-red-500" />
            <h2 className="text-sm font-semibold text-ink-2">Weakest Cards</h2>
          </div>
        </div>
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : data && data.weakCards.length > 0 ? (
          <div className="divide-y divide-ink-6">
            {data.weakCards.map((c) => (
              <div key={c.cardId} className="flex items-start gap-4 px-6 py-4">
                <Brain className="mt-0.5 h-4 w-4 shrink-0 text-ds-red-500" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink-1">
                    {c.question}
                  </p>
                  <p className="text-xs text-ink-4">{c.deckName}</p>
                </div>
                <div className="shrink-0 text-right">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                      c.retention >= 60
                        ? "bg-ds-amber-100 text-ds-amber-ink"
                        : "bg-ds-red-100 text-ds-red-ink"
                    }`}
                  >
                    {c.retention}%
                  </span>
                  {c.lapses > 0 && (
                    <p className="mt-0.5 text-xs text-ink-4">{c.lapses} lapses</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="p-6 text-sm text-ink-4">No weak cards. Great work!</p>
        )}
      </div>

      {/* Recent reviews */}
      <div className="rounded-xl border border-ink-6 bg-paper-raised shadow-s1">
        <div className="border-b border-ink-6 px-6 py-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-ink-4" />
            <h2 className="text-sm font-semibold text-ink-2">Recent Reviews</h2>
          </div>
        </div>
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : data && data.recentReviews.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-6 bg-paper-sunken text-left text-xs font-semibold uppercase tracking-wide text-ink-3">
                  <th className="px-4 py-3">Question</th>
                  <th className="px-4 py-3">Deck</th>
                  <th className="px-4 py-3">Answer Match</th>
                  <th className="px-4 py-3">Rating</th>
                  <th className="px-4 py-3">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-6">
                {data.recentReviews.map((r, i) => {
                  const ratingInfo = RATING_LABELS[r.rating] ?? {
                    label: String(r.rating),
                    color: "bg-ink-6 text-ink-3",
                  }
                  return (
                    <tr key={`${r.cardId}-${i}`} className="hover:bg-paper-sunken">
                      <td className="max-w-xs truncate px-4 py-3 text-ink-1">
                        {r.question}
                      </td>
                      <td className="px-4 py-3 text-ink-3">{r.deckName}</td>
                      <td className="px-4 py-3">
                        {r.answerScore === null || r.answerScore === undefined ? (
                          <span className="text-xs text-ink-4">No typed answer</span>
                        ) : (
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                              r.answerPassed
                                ? "bg-ds-green-100 text-ds-green-ink"
                                : "bg-ds-amber-100 text-ds-amber-ink"
                            }`}
                          >
                            {r.answerScore}%
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${ratingInfo.color}`}
                        >
                          {ratingInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-ink-4">
                        {new Date(r.reviewedAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-6 text-sm text-ink-4">No reviews yet.</p>
        )}
      </div>
    </div>
  )
}

export { ChartSkeleton }
