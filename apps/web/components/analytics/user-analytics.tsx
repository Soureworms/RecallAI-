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
  rating: number
  reviewedAt: string
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
  return <div className={`animate-pulse rounded bg-gray-200 ${className ?? ""}`} />
}

function ChartSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <Skeleton className="mb-4 h-4 w-40" />
      <Skeleton className="h-48 w-full" />
    </div>
  )
}

// ─── rating label ─────────────────────────────────────────────────────────────

const RATING_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: "Again", color: "bg-red-100 text-red-700" },
  2: { label: "Hard", color: "bg-amber-100 text-amber-700" },
  3: { label: "Good", color: "bg-blue-100 text-blue-700" },
  4: { label: "Easy", color: "bg-green-100 text-green-700" },
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
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {title && (
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        </div>
      )}

      {/* New hire ramp */}
      {!loading && data?.newHireProgress && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-indigo-800">
                Onboarding — Week {data.newHireProgress.weeksOnboarding}
              </p>
              <p className="mt-0.5 text-xs text-indigo-500">
                {data.newHireProgress.onTrack ? "On track" : "Behind schedule"}
              </p>
            </div>
            <span className="text-2xl font-bold text-indigo-700">
              {data.newHireProgress.completionPct}%
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-indigo-200">
            <div
              className={`h-full rounded-full ${
                data.newHireProgress.onTrack ? "bg-indigo-500" : "bg-amber-400"
              }`}
              style={{ width: `${data.newHireProgress.completionPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Retention timeline */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">
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
          <p className="text-sm text-gray-400">No review history yet.</p>
        )}
      </div>

      {/* Review activity */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">
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
          <p className="text-sm text-gray-400">No activity yet.</p>
        )}
      </div>

      {/* Deck progress */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">Deck Progress</h2>
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
                  <span className="text-sm font-medium text-gray-700">{d.deckName}</span>
                  <span className="text-xs text-gray-400">{d.totalCards} cards</span>
                </div>
                <div className="flex h-2.5 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="bg-green-500"
                    style={{ width: `${d.masteredPct}%` }}
                    title={`Mastered: ${d.masteredPct}%`}
                  />
                  <div
                    className="bg-indigo-400"
                    style={{ width: `${d.learningPct}%` }}
                    title={`Learning: ${d.learningPct}%`}
                  />
                  <div
                    className="bg-gray-300"
                    style={{ width: `${d.newPct}%` }}
                    title={`New: ${d.newPct}%`}
                  />
                </div>
                <div className="mt-1 flex gap-3 text-xs text-gray-400">
                  <span>
                    <span className="font-medium text-green-600">{d.masteredPct}%</span> mastered
                  </span>
                  <span>
                    <span className="font-medium text-indigo-500">{d.learningPct}%</span> learning
                  </span>
                  <span>
                    <span className="font-medium text-gray-500">{d.newPct}%</span> new
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No decks assigned.</p>
        )}
      </div>

      {/* Weakest cards */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-red-500" />
            <h2 className="text-sm font-semibold text-gray-700">Weakest Cards</h2>
          </div>
        </div>
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : data && data.weakCards.length > 0 ? (
          <div className="divide-y divide-gray-50">
            {data.weakCards.map((c) => (
              <div key={c.cardId} className="flex items-start gap-4 px-6 py-4">
                <Brain className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {c.question}
                  </p>
                  <p className="text-xs text-gray-400">{c.deckName}</p>
                </div>
                <div className="shrink-0 text-right">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                      c.retention >= 60
                        ? "bg-amber-100 text-amber-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {c.retention}%
                  </span>
                  {c.lapses > 0 && (
                    <p className="mt-0.5 text-xs text-gray-400">{c.lapses} lapses</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="p-6 text-sm text-gray-400">No weak cards — great work!</p>
        )}
      </div>

      {/* Recent reviews */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700">Recent Reviews</h2>
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
                <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">Question</th>
                  <th className="px-4 py-3">Deck</th>
                  <th className="px-4 py-3">Rating</th>
                  <th className="px-4 py-3">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.recentReviews.map((r, i) => {
                  const ratingInfo = RATING_LABELS[r.rating] ?? {
                    label: String(r.rating),
                    color: "bg-gray-100 text-gray-600",
                  }
                  return (
                    <tr key={`${r.cardId}-${i}`} className="hover:bg-gray-50">
                      <td className="max-w-xs truncate px-4 py-3 text-gray-900">
                        {r.question}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{r.deckName}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${ratingInfo.color}`}
                        >
                          {ratingInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400">
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
          <p className="p-6 text-sm text-gray-400">No reviews yet.</p>
        )}
      </div>
    </div>
  )
}

export { ChartSkeleton }
