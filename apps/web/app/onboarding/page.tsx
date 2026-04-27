"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

type Step = 1 | 2 | 3

function LogoMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M5 7.5 A7 7 0 0 1 18 9.5" />
      <path d="M19 16.5 A7 7 0 0 1 6 14.5" />
      <circle cx="18" cy="9.5" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="6" cy="14.5" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  )
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: "var(--font-mono)", fontSize: 10,
      letterSpacing: "0.08em", textTransform: "uppercase",
      color: "var(--ink-3)", marginBottom: 8,
    }}>{children}</div>
  )
}

export default function OnboardingPage() {
  const { data: session, update } = useSession()
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [name, setName] = useState(session?.user?.name ?? "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function handleFinish() {
    setSaving(true)
    setError("")
    try {
      if (name.trim() && name.trim() !== session?.user?.name) {
        const res = await fetch("/api/user/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim() }),
        })
        if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Failed to save name") }
      }
      const res = await fetch("/api/user/onboarding", { method: "POST" })
      if (!res.ok) throw new Error("Failed to complete onboarding")
      await update()
      router.push("/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
      setSaving(false)
    }
  }

  const totalSteps = 3

  return (
    <div style={{
      minHeight: "100vh", background: "var(--paper-sunken)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div style={{ width: "100%", maxWidth: 480 }}>
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", marginBottom: 28 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8, background: "var(--ink-1)", color: "var(--paper)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <LogoMark size={16} />
          </div>
          <span style={{ fontSize: 15, fontWeight: 500, letterSpacing: "-0.02em", color: "var(--ink-1)" }}>
            recall<span style={{ color: "var(--ink-3)" }}>ai</span>
          </span>
        </div>

        {/* Step indicators */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 24 }}>
          {[1, 2, 3].map((s) => (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 26, height: 26, borderRadius: "999px",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 600,
                background: s < step ? "var(--ink-1)" : s === step ? "var(--ink-1)" : "var(--paper-sunken)",
                color: s <= step ? "var(--paper)" : "var(--ink-4)",
                border: s === step ? "3px solid var(--paper-tint)" : "1px solid var(--ink-6)",
                boxSizing: "border-box" as const,
              }}>
                {s < step ? (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                ) : s}
              </div>
              {s < totalSteps && (
                <div style={{ width: 32, height: 1, background: s < step ? "var(--ink-1)" : "var(--ink-6)" }} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div style={{
          background: "var(--paper-raised)", border: "1px solid var(--ink-6)",
          borderRadius: 20, padding: 28, boxShadow: "var(--shadow-2)",
        }}>
          {step === 1 && (
            <Step1 name={name} setName={setName} userName={session?.user?.name ?? ""} onNext={() => setStep(2)} />
          )}
          {step === 2 && (
            <Step2 onNext={() => setStep(3)} onBack={() => setStep(1)} />
          )}
          {step === 3 && (
            <Step3 name={name || session?.user?.name || ""} saving={saving} error={error} onBack={() => setStep(2)} onFinish={handleFinish} />
          )}
        </div>
      </div>
    </div>
  )
}

function Step1({ name, setName, userName, onNext }: { name: string; setName: (v: string) => void; userName: string; onNext: () => void }) {
  return (
    <div>
      <Eyebrow>Step 1 of 3</Eyebrow>
      <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--ink-1)", marginBottom: 4 }}>Welcome to RecallAI</div>
      <div style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 20 }}>What should we call you?</div>

      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={userName || "Your name"}
        style={{
          width: "100%", padding: "8px 12px", borderRadius: 8,
          border: "1px solid var(--ink-6)", background: "var(--paper-sunken)",
          fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--ink-1)",
          outline: "none", boxSizing: "border-box" as const, marginBottom: 16,
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = "var(--blue-500)"; e.currentTarget.style.background = "var(--paper-raised)" }}
        onBlur={(e) => { e.currentTarget.style.borderColor = "var(--ink-6)"; e.currentTarget.style.background = "var(--paper-sunken)" }}
      />

      <button
        onClick={onNext}
        disabled={!name.trim() && !userName}
        style={{
          width: "100%", padding: "10px 14px", borderRadius: 10,
          background: "var(--ink-1)", color: "var(--paper)",
          border: "1px solid transparent",
          fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 500,
          cursor: (!name.trim() && !userName) ? "default" : "pointer",
          opacity: (!name.trim() && !userName) ? 0.5 : 1,
        }}
      >
        Continue
      </button>
    </div>
  )
}

function Step2({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const items = [
    { title: "AI-generated flashcards", desc: "Your manager uploads SOPs and training docs. RecallAI turns them into targeted Q&A cards automatically." },
    { title: "Spaced repetition",        desc: "Cards appear at scientifically optimised intervals, with more time on what you are most likely to forget." },
    { title: "Daily reviews",            desc: "5–10 minutes a day keeps knowledge fresh. RecallAI tells you exactly which cards are due each session." },
    { title: "Track your retention",     desc: "See your score improve over time and get insights into which topics need more attention." },
  ]

  return (
    <div>
      <Eyebrow>Step 2 of 3</Eyebrow>
      <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--ink-1)", marginBottom: 16 }}>How RecallAI works</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
        {items.map((item) => (
          <div key={item.title} style={{
            background: "var(--paper-sunken)", borderRadius: 10, padding: "12px 14px",
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-1)", marginBottom: 3 }}>{item.title}</div>
            <div style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.55 }}>{item.desc}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onBack} style={{
          flex: 1, padding: "10px 14px", borderRadius: 10,
          background: "transparent", color: "var(--ink-2)",
          border: "1px solid var(--ink-6)",
          fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 500, cursor: "pointer",
        }}>Back</button>
        <button onClick={onNext} style={{
          flex: 1, padding: "10px 14px", borderRadius: 10,
          background: "var(--ink-1)", color: "var(--paper)",
          border: "1px solid transparent",
          fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 500, cursor: "pointer",
        }}>Got it</button>
      </div>
    </div>
  )
}

function Step3({ name, saving, error, onBack, onFinish }: { name: string; saving: boolean; error: string; onBack: () => void; onFinish: () => void }) {
  const first = name.split(" ")[0]
  return (
    <div>
      <Eyebrow>Step 3 of 3</Eyebrow>
      <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--ink-1)", marginBottom: 4 }}>
        {first ? `You're all set, ${first}.` : "You're all set."}
      </div>
      <div style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 16 }}>
        Your dashboard is ready. Start your first review whenever you like.
      </div>

      <div style={{
        background: "var(--paper-sunken)", border: "1px solid var(--ink-6)",
        borderRadius: 10, padding: "12px 14px", marginBottom: 16,
      }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-2)", marginBottom: 2 }}>Quick tip</div>
        <div style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.55 }}>
          Check your dashboard daily. Even a 5-minute review session significantly improves long-term retention.
        </div>
      </div>

      {error && (
        <div style={{
          background: "var(--red-50)", border: "1px solid var(--red-100)",
          borderRadius: 8, padding: "10px 12px",
          fontSize: 13, color: "var(--red-ink)", marginBottom: 12,
        }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onBack} disabled={saving} style={{
          flex: 1, padding: "10px 14px", borderRadius: 10,
          background: "transparent", color: "var(--ink-2)",
          border: "1px solid var(--ink-6)",
          fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 500,
          cursor: saving ? "default" : "pointer", opacity: saving ? 0.5 : 1,
        }}>Back</button>
        <button onClick={onFinish} disabled={saving} style={{
          flex: 1, padding: "10px 14px", borderRadius: 10,
          background: "var(--ink-1)", color: "var(--paper)",
          border: "1px solid transparent",
          fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 500,
          cursor: saving ? "default" : "pointer", opacity: saving ? 0.75 : 1,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}>
          {saving && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}>
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
            </svg>
          )}
          {saving ? "Setting up…" : "Go to dashboard"}
        </button>
      </div>
    </div>
  )
}
