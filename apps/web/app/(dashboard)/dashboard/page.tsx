"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Brain, Flame, CheckCircle, ArrowRight } from "lucide-react"

type ReviewStats = {
  dueCount: number
  todayCount: number
  streak: number
  nextDueDate: string | null
}

function formatTimeUntil(isoDate: string): string {
  const diff = new Date(isoDate).getTime() - Date.now()
  if (diff <= 0) return "now"
  const mins = Math.floor(diff / 60_000)
  const hours = Math.floor(mins / 60)
  if (mins < 60) return `in ${mins}m`
  if (hours < 24) return `in ${hours}h`
  return `in ${Math.floor(hours / 24)}d`
}

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<ReviewStats | null>(null)

  useEffect(() => {
    void fetch("/api/review/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: ReviewStats | null) => { if (d) setStats(d) })
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p className="mt-1 text-sm text-gray-500">Your daily learning overview</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {/* Due cards */}
        <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
            <Brain className="h-4 w-4 text-indigo-500" />
            Cards due
          </div>
          <p className="text-4xl font-bold text-gray-900">
            {stats?.dueCount ?? "—"}
          </p>
          {stats && stats.dueCount === 0 && stats.nextDueDate && (
            <p className="text-xs text-gray-400">
              Next {formatTimeUntil(stats.nextDueDate)}
            </p>
          )}
        </div>

        {/* Reviewed today */}
        <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Reviewed today
          </div>
          <p className="text-4xl font-bold text-gray-900">
            {stats?.todayCount ?? "—"}
          </p>
        </div>

        {/* Streak */}
        <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
            <Flame className="h-4 w-4 text-orange-500" />
            Day streak
          </div>
          <p className="text-4xl font-bold text-gray-900">
            {stats?.streak ?? "—"}
          </p>
          {stats && stats.streak > 0 && (
            <p className="text-xs text-orange-500">Keep it up!</p>
          )}
        </div>
      </div>

      {/* CTA */}
      <div className="mt-6">
        {stats && stats.dueCount > 0 ? (
          <button
            onClick={() => router.push("/review")}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-indigo-500"
          >
            <Brain className="h-4 w-4" />
            Start Review — {stats.dueCount} card{stats.dueCount !== 1 ? "s" : ""} due
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : stats && stats.dueCount === 0 ? (
          <div className="inline-flex items-center gap-2 rounded-xl bg-green-50 px-6 py-3 text-sm font-medium text-green-700">
            <CheckCircle className="h-4 w-4" />
            All caught up!
          </div>
        ) : null}
      </div>
    </div>
  )
}
