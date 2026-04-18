"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { CheckCircle, Brain, Flame } from "lucide-react"

type CardFormat = "QA" | "TRUE_FALSE" | "FILL_BLANK"
type Rating = "AGAIN" | "HARD" | "GOOD" | "EASY"

type RatingPreview = {
  nextDue: string
  scheduledDays: number
}

type DueCard = {
  userCardId: string
  cardId: string
  question: string
  answer: string
  format: CardFormat
  deckName: string
  preview: {
    again: RatingPreview
    hard: RatingPreview
    good: RatingPreview
    easy: RatingPreview
  }
}

type ReviewStats = {
  dueCount: number
  todayCount: number
  streak: number
  nextDueDate: string | null
}

type SessionState = "pre" | "reviewing" | "done"

function formatDays(scheduledDays: number): string {
  if (scheduledDays < 1) return "<1d"
  if (scheduledDays === 1) return "1d"
  if (scheduledDays < 30) return `${scheduledDays}d`
  if (scheduledDays < 365) return `${Math.round(scheduledDays / 30)}mo`
  return `${Math.round(scheduledDays / 365)}yr`
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

const RATING_CONFIG: {
  rating: Rating
  label: string
  key: string
  color: string
  hoverColor: string
}[] = [
  { rating: "AGAIN", label: "Again", key: "1", color: "border-red-200 text-red-600", hoverColor: "hover:bg-red-50" },
  { rating: "HARD", label: "Hard", key: "2", color: "border-orange-200 text-orange-600", hoverColor: "hover:bg-orange-50" },
  { rating: "GOOD", label: "Good", key: "3", color: "border-green-200 text-green-600", hoverColor: "hover:bg-green-50" },
  { rating: "EASY", label: "Easy", key: "4", color: "border-blue-200 text-blue-600", hoverColor: "hover:bg-blue-50" },
]

export default function ReviewPage() {
  const [sessionState, setSessionState] = useState<SessionState>("pre")
  const [stats, setStats] = useState<ReviewStats | null>(null)
  const [queue, setQueue] = useState<DueCard[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [reviewed, setReviewed] = useState(0)
  const startTime = useRef<number>(0)
  const [elapsedSecs, setElapsedSecs] = useState(0)

  const fetchStats = useCallback(async () => {
    const res = await fetch("/api/review/stats")
    if (res.ok) setStats(await res.json() as ReviewStats)
  }, [])

  useEffect(() => { void fetchStats() }, [fetchStats])

  const handleRate = useCallback(async (rating: Rating) => {
    if (submitting) return
    const card = queue[currentIndex]
    if (!card) return

    setSubmitting(true)
    await fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userCardId: card.userCardId, rating }),
    })
    setSubmitting(false)

    const next = currentIndex + 1
    setReviewed((r) => r + 1)

    if (next >= queue.length) {
      setElapsedSecs(Math.floor((Date.now() - startTime.current) / 1000))
      await fetchStats()
      setSessionState("done")
    } else {
      setCurrentIndex(next)
      setFlipped(false)
    }
  }, [submitting, queue, currentIndex, fetchStats])

  // Keyboard shortcuts
  useEffect(() => {
    if (sessionState !== "reviewing") return

    function onKey(e: KeyboardEvent) {
      if (e.repeat) return
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault()
        if (!flipped) setFlipped(true)
      }
      if (flipped && !submitting) {
        if (e.key === "1") void handleRate("AGAIN")
        if (e.key === "2") void handleRate("HARD")
        if (e.key === "3") void handleRate("GOOD")
        if (e.key === "4") void handleRate("EASY")
      }
    }

    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [sessionState, flipped, submitting, handleRate])

  // Elapsed timer
  useEffect(() => {
    if (sessionState !== "reviewing") return
    const id = setInterval(() => {
      setElapsedSecs(Math.floor((Date.now() - startTime.current) / 1000))
    }, 1000)
    return () => clearInterval(id)
  }, [sessionState])

  async function startSession() {
    const res = await fetch("/api/review/due")
    if (!res.ok) return
    const data = (await res.json()) as { dueCards: DueCard[]; nextDueDate: string | null }
    if (data.dueCards.length === 0) return
    setQueue(data.dueCards)
    setCurrentIndex(0)
    setFlipped(false)
    setReviewed(0)
    startTime.current = Date.now()
    setElapsedSecs(0)
    setSessionState("reviewing")
  }

  // ── Pre-session screen ───────────────────────────────────────────────────────
  if (sessionState === "pre") {
    const dueCount = stats?.dueCount ?? 0
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100">
          <Brain className="h-8 w-8 text-indigo-600" />
        </div>

        {dueCount > 0 ? (
          <>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {dueCount} card{dueCount !== 1 ? "s" : ""} due
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Est. {Math.ceil(dueCount * 0.5)} min · Streak:{" "}
                <span className="font-medium text-orange-500">
                  {stats?.streak ?? 0} 🔥
                </span>
              </p>
            </div>
            <button
              onClick={() => { void startSession() }}
              className="rounded-xl bg-indigo-600 px-8 py-3 text-base font-semibold text-white shadow hover:bg-indigo-500"
            >
              Start Review
            </button>
          </>
        ) : (
          <>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">All caught up!</h1>
              <p className="mt-1 text-sm text-gray-500">
                {stats?.nextDueDate
                  ? `Next card due in ${formatTimeUntil(stats.nextDueDate)}`
                  : "No cards scheduled yet."}
              </p>
            </div>
            {stats && stats.streak > 0 && (
              <div className="flex items-center gap-2 rounded-xl bg-orange-50 px-6 py-3 text-orange-600">
                <Flame className="h-5 w-5" />
                <span className="font-semibold">{stats.streak}-day streak</span>
              </div>
            )}
          </>
        )}

        {stats && (
          <p className="text-xs text-gray-400">
            {stats.todayCount} reviewed today
          </p>
        )}
      </div>
    )
  }

  // ── Done screen ──────────────────────────────────────────────────────────────
  if (sessionState === "done") {
    const mins = Math.floor(elapsedSecs / 60)
    const secs = elapsedSecs % 60
    const duration = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Session complete!</h1>
          <p className="mt-1 text-sm text-gray-500">
            {reviewed} card{reviewed !== 1 ? "s" : ""} reviewed in {duration}
          </p>
        </div>
        <div className="flex gap-6 text-center">
          {stats && stats.streak > 0 && (
            <div className="rounded-xl bg-orange-50 px-5 py-3">
              <p className="text-2xl font-bold text-orange-500">{stats.streak}</p>
              <p className="text-xs text-gray-500">day streak</p>
            </div>
          )}
          <div className="rounded-xl bg-indigo-50 px-5 py-3">
            <p className="text-2xl font-bold text-indigo-600">{stats?.todayCount ?? reviewed}</p>
            <p className="text-xs text-gray-500">reviewed today</p>
          </div>
        </div>
        {(stats?.dueCount ?? 0) > 0 ? (
          <button
            onClick={() => { setSessionState("pre") }}
            className="rounded-xl bg-indigo-600 px-8 py-3 text-base font-semibold text-white shadow hover:bg-indigo-500"
          >
            Review More ({stats?.dueCount})
          </button>
        ) : (
          <button
            onClick={() => { setSessionState("pre") }}
            className="rounded-xl border border-gray-200 px-8 py-3 text-base font-medium text-gray-600 hover:bg-gray-50"
          >
            Back
          </button>
        )}
      </div>
    )
  }

  // ── Review screen ────────────────────────────────────────────────────────────
  const card = queue[currentIndex]
  if (!card) return null

  const progress = (currentIndex / queue.length) * 100

  return (
    <div className="mx-auto max-w-2xl">
      {/* Progress bar */}
      <div className="mb-6">
        <div className="mb-1 flex justify-between text-xs text-gray-400">
          <span>{currentIndex} / {queue.length}</span>
          <span>{card.deckName}</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-indigo-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Card */}
      <div className="card-scene h-72">
        <div className={`card-inner${flipped ? " flipped" : ""}`}>
          {/* Front */}
          <div className="card-face flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <p className="text-center text-lg font-medium text-gray-900">
              {card.question}
            </p>
            <button
              onClick={() => setFlipped(true)}
              className="mt-6 rounded-lg border border-gray-200 px-6 py-2 text-sm text-gray-500 hover:bg-gray-50"
            >
              Show answer{" "}
              <kbd className="ml-1 rounded bg-gray-100 px-1 text-xs">Space</kbd>
            </button>
          </div>

          {/* Back */}
          <div className="card-face card-face-back flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
              <p className="text-center text-sm text-gray-400">{card.question}</p>
              <div className="my-1 h-px w-full max-w-xs bg-gray-100" />
              <p className="text-center text-lg font-semibold text-gray-900">
                {card.answer}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Rating buttons (shown after flip) */}
      {flipped && (
        <div className="mt-6 grid grid-cols-4 gap-3">
          {RATING_CONFIG.map(({ rating, label, key, color, hoverColor }) => {
            const preview = card.preview[rating.toLowerCase() as keyof typeof card.preview]
            return (
              <button
                key={rating}
                onClick={() => { void handleRate(rating) }}
                disabled={submitting}
                className={`flex flex-col items-center gap-1 rounded-xl border px-3 py-3 text-sm font-medium transition-colors disabled:opacity-50 ${color} ${hoverColor}`}
              >
                <span>{label}</span>
                <span className="text-xs font-normal opacity-70">
                  {formatDays(preview.scheduledDays)}
                </span>
                <kbd className="mt-0.5 rounded bg-white/60 px-1.5 text-xs opacity-50">
                  {key}
                </kbd>
              </button>
            )
          })}
        </div>
      )}

      {/* Keyboard hint */}
      {!flipped && (
        <p className="mt-4 text-center text-xs text-gray-400">
          Press <kbd className="rounded bg-gray-100 px-1">Space</kbd> or{" "}
          <kbd className="rounded bg-gray-100 px-1">Enter</kbd> to reveal
        </p>
      )}
      {flipped && (
        <p className="mt-3 text-center text-xs text-gray-400">
          Press <kbd className="rounded bg-gray-100 px-1">1</kbd>–
          <kbd className="rounded bg-gray-100 px-1">4</kbd> to rate
        </p>
      )}
    </div>
  )
}
