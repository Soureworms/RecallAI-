"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { X, Play } from "lucide-react"
import { scoreTypedAnswer, type AnswerAssessment } from "@/lib/study/answer-scorer"

type Rating = "AGAIN" | "HARD" | "GOOD" | "EASY"
type SessionState = "pre" | "reviewing" | "done"
type ReviewResult = { rating: Rating; answerScore: number; answerPassed: boolean }

type RatingPreview = { nextDue: string; scheduledDays: number }

type DueCard = {
  userCardId: string
  cardId: string
  question: string
  answer: string
  format: string
  tags: string[]
  deckName: string
  isNew: boolean
  preview: {
    again: RatingPreview
    hard:  RatingPreview
    good:  RatingPreview
    easy:  RatingPreview
  }
}

type ReviewStats = {
  dueCount: number
  todayCount: number
  streak: number
  nextDueDate: string | null
  answerScoreAvg: number | null
  answerPassRate: number | null
}

const RATINGS: { rating: Rating; label: string; key: string; bg: string; fg: string; bar: string }[] = [
  { rating: "AGAIN", label: "Again", key: "1", bg: "var(--red-50)",    fg: "var(--red-ink)",    bar: "var(--red-500)" },
  { rating: "HARD",  label: "Hard",  key: "2", bg: "var(--amber-50)",  fg: "var(--amber-ink)",  bar: "var(--amber-500)" },
  { rating: "GOOD",  label: "Good",  key: "3", bg: "var(--violet-50)", fg: "var(--violet-ink)", bar: "var(--violet-500)" },
  { rating: "EASY",  label: "Easy",  key: "4", bg: "var(--green-50)",  fg: "var(--green-ink)",  bar: "var(--green-500)" },
]

function formatInterval(nextDue: string): string {
  const diffMs = new Date(nextDue).getTime() - Date.now()
  if (diffMs <= 60_000) return "1m"
  const mins = Math.round(diffMs / 60_000)
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d`
  const months = Math.round(days / 30)
  if (months < 12) return `${months}mo`
  return `${Math.round(days / 365)}yr`
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
      letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-3)",
    }}>{children}</div>
  )
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontFamily: "var(--font-mono)", fontSize: 11, padding: "2px 6px",
      background: "var(--paper-raised)", border: "1px solid var(--ink-6)",
      borderBottomWidth: 2, borderRadius: 4, color: "var(--ink-2)",
      minWidth: 18, textAlign: "center", display: "inline-flex",
      alignItems: "center", justifyContent: "center", lineHeight: 1,
    }}>{children}</span>
  )
}

export default function ReviewPage() {
  const [sessionState, setSessionState] = useState<SessionState>("pre")
  const [stats, setStats] = useState<ReviewStats | null>(null)
  const [queue, setQueue] = useState<DueCard[]>([])
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [exiting, setExiting] = useState<Rating | null>(null)
  const [entering, setEntering] = useState(false)
  const [typedAnswer, setTypedAnswer] = useState("")
  const [answerAssessment, setAnswerAssessment] = useState<AnswerAssessment | null>(null)
  const [results, setResults] = useState<ReviewResult[]>([])
  const startTime = useRef(0)
  const [elapsedSecs, setElapsedSecs] = useState(0)

  const fetchStats = useCallback(async () => {
    const res = await fetch("/api/review/stats")
    if (res.ok) setStats(await res.json() as ReviewStats)
  }, [])

  useEffect(() => { void fetchStats() }, [fetchStats])

  // Timer
  useEffect(() => {
    if (sessionState !== "reviewing") return
    const id = setInterval(() => setElapsedSecs(Math.floor((Date.now() - startTime.current) / 1000)), 1000)
    return () => clearInterval(id)
  }, [sessionState])

  const revealAnswer = useCallback(() => {
    if (flipped || exiting) return
    const card = queue[idx]
    if (!card || !typedAnswer.trim()) return

    setAnswerAssessment(scoreTypedAnswer(typedAnswer, card.answer))
    setFlipped(true)
  }, [flipped, exiting, queue, idx, typedAnswer])

  const rate = useCallback(async (rating: Rating) => {
    if (exiting) return
    const card = queue[idx]
    if (!card || !answerAssessment) return

    setExiting(rating)
    await fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userCardId: card.userCardId, rating, typedAnswer }),
    })
    const newResults = [
      ...results,
      { rating, answerScore: answerAssessment.score, answerPassed: answerAssessment.passed },
    ]
    setResults(newResults)

    setTimeout(() => {
      if (idx + 1 >= queue.length) {
        setElapsedSecs(Math.floor((Date.now() - startTime.current) / 1000))
        void fetchStats()
        setSessionState("done")
      } else {
        setIdx(idx + 1)
        setFlipped(false)
        setTypedAnswer("")
        setAnswerAssessment(null)
        setExiting(null)
        setEntering(true)
        requestAnimationFrame(() => setTimeout(() => setEntering(false), 20))
      }
    }, 340)
  }, [exiting, queue, idx, answerAssessment, typedAnswer, results, fetchStats])

  // Keyboard
  useEffect(() => {
    if (sessionState !== "reviewing") return
    function onKey(e: KeyboardEvent) {
      if (e.repeat || exiting) return
      const target = e.target as HTMLElement | null
      if (target?.tagName === "TEXTAREA" || target?.tagName === "INPUT") return
      if (!flipped && (e.code === "Space" || e.code === "Enter")) { e.preventDefault(); revealAnswer(); return }
      if (!flipped) return
      if (e.key === "1") void rate("AGAIN")
      if (e.key === "2") void rate("HARD")
      if (e.key === "3") void rate("GOOD")
      if (e.key === "4") void rate("EASY")
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [sessionState, flipped, exiting, rate, revealAnswer])

  async function startSession() {
    const res = await fetch("/api/review/due")
    if (!res.ok) return
    const data = await res.json() as { dueCards: DueCard[] }
    if (!data.dueCards.length) return
    setQueue(data.dueCards)
    setIdx(0)
    setFlipped(false)
    setExiting(null)
    setTypedAnswer("")
    setAnswerAssessment(null)
    setResults([])
    startTime.current = Date.now()
    setElapsedSecs(0)
    setSessionState("reviewing")
  }

  // ── Pre-session ─────────────────────────────────────────────────────────────
  if (sessionState === "pre") {
    const due = stats?.dueCount ?? 0
    return (
      <div>
        <div style={{ padding: "18px 28px", borderBottom: "1px solid var(--ink-6)" }}>
          <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--ink-1)" }}>Study</div>
        </div>
        <div style={{
          flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", padding: "80px 28px", gap: 24, textAlign: "center",
        }}>
          {due > 0 ? (
            <>
              <div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 8 }}>
                  Ready to review
                </div>
                <div style={{ fontSize: 32, fontWeight: 500, letterSpacing: "-0.02em", color: "var(--ink-1)" }}>
                  {due} card{due !== 1 ? "s" : ""} due
                </div>
                <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 6 }}>
                  Est. {Math.ceil(due * 0.5)} min · Streak: {stats?.streak ?? 0} days
                </div>
              </div>
              <button
                onClick={() => void startSession()}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px)"
                  e.currentTarget.style.boxShadow = "0 2px 0 rgba(26,25,23,.12), var(--shadow-lift)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)"
                  e.currentTarget.style.boxShadow = "var(--shadow-btn)"
                }}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "12px 22px", borderRadius: 12,
                  background: "var(--ink-1)", color: "var(--paper)",
                  border: "none",
                  boxShadow: "var(--shadow-btn)",
                  fontFamily: "var(--font-sans)", fontSize: 15, fontWeight: 500,
                  cursor: "pointer",
                  transition: "box-shadow var(--dur-quick) var(--ease-out), transform var(--dur-quick) var(--ease-out)",
                }}
              >
                <Play size={13} strokeWidth={0} style={{ fill: "currentColor" }} />
                Start review
              </button>
            </>
          ) : (
            <>
              <div>
                <div style={{ fontSize: 20, fontWeight: 600, color: "var(--ink-1)" }}>You&apos;re caught up.</div>
                <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 6 }}>
                  {stats?.nextDueDate
                    ? `Next card is due in ${formatTimeUntil(stats.nextDueDate)}.`
                    : "No cards scheduled yet."}
                </div>
              </div>
              {(stats?.streak ?? 0) > 0 && (
                <div style={{
                  fontSize: 13, color: "var(--ink-3)",
                  fontFamily: "var(--font-mono)", letterSpacing: "0.04em",
                }}>
                  {stats!.streak} days · {stats!.todayCount} reviewed today
                </div>
              )}
            </>
          )}
        </div>
      </div>
    )
  }

  // ── Done / Review summary ────────────────────────────────────────────────────
  if (sessionState === "done") {
    const total = results.length
    const counts: Record<string, number> = { AGAIN: 0, HARD: 0, GOOD: 0, EASY: 0 }
    results.forEach((r) => { counts[r.rating] = (counts[r.rating] ?? 0) + 1 })
    const retained = (counts.GOOD ?? 0) + (counts.EASY ?? 0)
    const retention = total > 0 ? Math.round((retained / total) * 100) : 0
    const avgAnswerScore = total > 0
      ? Math.round(results.reduce((sum, result) => sum + result.answerScore, 0) / total)
      : 0
    const mins = Math.floor(elapsedSecs / 60)
    const secs = elapsedSecs % 60
    const duration = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`

    return (
      <div>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "18px 28px", borderBottom: "1px solid var(--ink-6)",
        }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--ink-1)" }}>Session complete</div>
            <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 2 }}>{total} card{total !== 1 ? "s" : ""} reviewed</div>
          </div>
          <button
            onClick={() => setSessionState("pre")}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "8px 14px", borderRadius: 10,
              background: "var(--ink-1)", color: "var(--paper)",
              border: "1px solid transparent",
              fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 500, cursor: "pointer",
            }}
          >
            Back to decks
          </button>
        </div>

        <div style={{
          padding: "40px 28px", display: "flex", flexDirection: "column",
          alignItems: "center", gap: 16, background: "var(--paper-sunken)", minHeight: "calc(100vh - 57px)",
        }}>
          <div style={{ width: "100%", maxWidth: 560, display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Retention score */}
            <div style={{
              background: "var(--paper-raised)", borderRadius: 18, padding: 26,
              border: "1px solid var(--ink-6)", display: "flex", flexDirection: "column", gap: 10,
            }}>
              <Eyebrow>This session</Eyebrow>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <div style={{ fontSize: 44, fontWeight: 500, letterSpacing: "-0.02em", color: "var(--ink-1)", lineHeight: 1 }}>
                  {retention}<span style={{ fontSize: 22, color: "var(--ink-3)" }}>%</span>
                </div>
                <div style={{ fontSize: 14, color: "var(--ink-2)" }}>recalled without struggle</div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 6 }}>
                {RATINGS.map(({ rating, label, fg, bar }) => {
                  const count = counts[rating] ?? 0
                  const pct = total > 0 ? (count / total) * 100 : 0
                  return (
                    <div key={rating}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: fg, fontWeight: 500 }}>{label}</span>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-2)" }}>{count}</span>
                      </div>
                      <div style={{ height: 3, background: "var(--paper-sunken)", borderRadius: 999, overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: bar }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Meta cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { label: "Time",     value: duration,    hint: elapsedSecs < 300 ? "Within 5-min ceiling" : "Over 5 minutes" },
                { label: "Answer match", value: `${avgAnswerScore}%`, hint: "Typed response benchmark" },
              ].map(({ label, value, hint }) => (
                <div key={label} style={{
                  background: "var(--paper-raised)", borderRadius: 14, padding: 14,
                  border: "1px solid var(--ink-6)",
                }}>
                  <Eyebrow>{label}</Eyebrow>
                  <div style={{ fontSize: 20, fontWeight: 500, color: "var(--ink-1)", marginTop: 4 }}>{value}</div>
                  <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}>{hint}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Reviewing ────────────────────────────────────────────────────────────────
  const card = queue[idx]
  if (!card) return null
  const remaining = queue.length - idx

  const cardTransform = exiting
    ? "translateX(-60px)"
    : entering ? "translateX(40px)" : "translateX(0)"
  const cardOpacity = exiting || entering ? 0 : 1

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Top bar */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "18px 28px", borderBottom: "1px solid var(--ink-6)", flexShrink: 0,
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--ink-1)" }}>{card.deckName}</span>
            {card.isNew && (
              <span style={{
                fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 999,
                background: "var(--violet-50)", color: "var(--violet-600)",
                textTransform: "uppercase", letterSpacing: "0.06em",
              }}>New</span>
            )}
          </div>
          <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 2 }}>
            {idx + 1} of {queue.length} · {remaining} remaining
          </div>
        </div>
        <button
          onClick={() => setSessionState("pre")}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "8px 12px", borderRadius: 10, border: "none",
            background: "transparent", color: "var(--ink-2)",
            fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 400, cursor: "pointer",
          }}
        >
          <X size={14} strokeWidth={1.75} />
          End session
        </button>
      </div>

      {/* Progress bar */}
      <div style={{ height: 4, background: "var(--paper-sunken)", flexShrink: 0 }}>
        <div style={{
          width: `${(idx / queue.length) * 100}%`, height: "100%",
          background: "var(--violet-500)", transition: "width var(--dur-slide) var(--ease-out)",
          borderRadius: "0 2px 2px 0",
        }} />
      </div>

      {/* Card area */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: 28, background: "var(--paper-sunken)", overflow: "hidden",
      }}>
        <div style={{ width: "100%", maxWidth: 640, perspective: 1200 }}>
          {/* Flippable card */}
          <div style={{
            position: "relative", width: "100%", minHeight: 280,
            transformStyle: "preserve-3d",
            transform: `${cardTransform} rotateY(${flipped ? 180 : 0}deg)`,
            opacity: cardOpacity,
            transition: exiting
              ? `transform var(--dur-slide) var(--ease-out), opacity var(--dur-slide) var(--ease-out)`
              : `transform var(--dur-flip) var(--ease-out), opacity var(--dur-base) var(--ease-out)`,
          }}>
            {/* Front face */}
            <div style={{
              position: "relative",
              backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
              background: "var(--paper-raised)", borderRadius: 20,
              boxShadow: "var(--shadow-3)", border: "1px solid rgba(26,25,23,.04)",
              padding: "26px 28px", minHeight: 280,
              display: "flex", flexDirection: "column", gap: 14,
              opacity: flipped ? 0.01 : 1,
              transition: "opacity 180ms var(--ease-out)",
            }}>
              <Eyebrow>Question</Eyebrow>
              <div style={{ fontSize: 22, lineHeight: 1.3, letterSpacing: "-0.01em", fontWeight: 500, color: "var(--ink-1)", flex: 1 }}>
                {card.question}
              </div>
              <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-2)" }}>Your answer</span>
                <textarea
                  aria-label="Your answer"
                  value={typedAnswer}
                  onChange={(e) => setTypedAnswer(e.target.value)}
                  rows={4}
                  disabled={flipped || !!exiting}
                  style={{
                    width: "100%",
                    resize: "vertical",
                    borderRadius: 12,
                    border: "1px solid var(--ink-6)",
                    background: "var(--paper)",
                    color: "var(--ink-1)",
                    padding: "12px 14px",
                    fontFamily: "var(--font-sans)",
                    fontSize: 15,
                    lineHeight: 1.45,
                    outline: "none",
                  }}
                />
              </label>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8 }}>
                <div style={{ display: "flex", gap: 6 }}>
                  {(card.tags ?? []).map((t) => (
                    <span key={t} style={{
                      fontSize: 12, fontWeight: 500, padding: "3px 9px", borderRadius: 999,
                      background: "var(--paper-raised)", color: "var(--ink-2)",
                      border: "1px solid var(--ink-6)",
                    }}>{t}</span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={revealAnswer}
                  disabled={!typedAnswer.trim() || flipped || !!exiting}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "8px 12px",
                    borderRadius: 10,
                    border: "1px solid var(--ink-6)",
                    background: typedAnswer.trim() && !flipped ? "var(--ink-1)" : "var(--paper-raised)",
                    color: typedAnswer.trim() && !flipped ? "var(--paper)" : "var(--ink-3)",
                    fontFamily: "var(--font-sans)",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: typedAnswer.trim() && !flipped ? "pointer" : "default",
                  }}
                >
                  Reveal answer
                </button>
              </div>
            </div>

            {/* Back face — tinted to signal "revealed" state */}
            <div style={{
              position: "absolute", inset: 0,
              backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              background: "var(--paper-tint)", borderRadius: 20,
              boxShadow: "var(--shadow-3)",
              border: "1px solid var(--ink-5)",
              borderTop: "3px solid var(--violet-500)",
              padding: "26px 28px", minHeight: 280,
              display: "flex", flexDirection: "column", gap: 14,
              opacity: flipped ? 1 : 0.01,
              transition: "opacity 180ms var(--ease-out)",
            }}>
              <Eyebrow>Answer</Eyebrow>
              <div style={{ fontSize: 14, color: "var(--ink-3)", lineHeight: 1.5 }}>{card.question}</div>
              <div style={{ borderTop: "1px solid var(--ink-6)", paddingTop: 12, display: "grid", gap: 14 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-3)", marginBottom: 4 }}>Your answer</div>
                  <div style={{ fontSize: 15, lineHeight: 1.45, color: "var(--ink-2)" }}>{flipped ? typedAnswer : null}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-3)", marginBottom: 4 }}>Expected answer</div>
                  <div style={{ fontSize: 20, lineHeight: 1.45, color: "var(--ink-1)", fontWeight: 500 }}>{flipped ? card.answer : null}</div>
                </div>
                {answerAssessment && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-3)" }}>Answer match</span>
                    <span style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 12,
                      fontWeight: 700,
                      padding: "4px 8px",
                      borderRadius: 999,
                      background: answerAssessment.passed ? "var(--green-50)" : "var(--amber-50)",
                      color: answerAssessment.passed ? "var(--green-ink)" : "var(--amber-ink)",
                    }}>
                      {answerAssessment.score}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Rating bar — always reserved */}
          <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {RATINGS.map(({ rating, label, key, bg, fg, bar }) => {
              const preview = card.preview[rating.toLowerCase() as keyof typeof card.preview]
              const chosen = exiting === rating
              return (
                <button
                  key={rating}
                  disabled={!flipped || !!exiting}
                  onClick={() => void rate(rating)}
                  onMouseEnter={(e) => {
                    if (!flipped || !!exiting) return
                    e.currentTarget.style.boxShadow = "var(--shadow-2)"
                    e.currentTarget.style.transform = "translateY(-1px)"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = "none"
                    e.currentTarget.style.transform = "translateY(0)"
                  }}
                  style={{
                    padding: "14px 12px", borderRadius: 12,
                    borderTop: "1px solid var(--ink-6)",
                    borderLeft: "1px solid var(--ink-6)",
                    borderRight: "1px solid var(--ink-6)",
                    borderBottom: `3px solid ${bar}`,
                    background: chosen ? bg : "var(--paper-raised)",
                    display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8,
                    cursor: flipped && !exiting ? "pointer" : "default",
                    opacity: flipped ? 1 : 0.5,
                    transition: `background var(--dur-quick) var(--ease-out), box-shadow var(--dur-quick) var(--ease-out), transform var(--dur-quick) var(--ease-out)`,
                    fontFamily: "inherit", textAlign: "left",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: flipped ? fg : "var(--ink-3)" }}>{label}</span>
                    <Kbd>{key}</Kbd>
                  </div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-3)" }}>
                    {preview ? formatInterval(preview.nextDue) : "–"}
                  </span>
                  <div style={{ width: "100%", height: 3, background: "var(--paper-sunken)", borderRadius: 999, overflow: "hidden" }}>
                    <div style={{ width: flipped ? "100%" : "0%", height: "100%", background: bar, transition: "width 220ms var(--ease-out)" }} />
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
