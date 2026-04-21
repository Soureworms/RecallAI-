"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { CheckCircle, AlertTriangle, Loader2 } from "lucide-react"

type InviteInfo = {
  teamName: string
  email: string
  role: string
  expiresAt: string
}

type PageState =
  | { status: "loading" }
  | { status: "ready"; info: InviteInfo }
  | { status: "expired"; message: string }
  | { status: "error"; message: string }
  | { status: "success" }

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

export default function InviteAcceptPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const [pageState, setPageState] = useState<PageState>({ status: "loading" })
  const [form, setForm] = useState({ name: "", password: "" })
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    void fetch(`/api/invite/${token}`)
      .then(async (r) => {
        const data = (await r.json()) as { error?: string } & Partial<InviteInfo>
        if (!r.ok) {
          if (r.status === 410) {
            setPageState({ status: "expired", message: data.error ?? "Invite expired or already used" })
          } else {
            setPageState({ status: "error", message: data.error ?? "Invalid invite link" })
          }
          return
        }
        setPageState({ status: "ready", info: data as InviteInfo })
      })
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (pageState.status !== "ready") return
    setSubmitting(true)
    setSubmitError(null)

    const res = await fetch(`/api/invite/${token}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, password: form.password }),
    })

    if (!res.ok) {
      const d = (await res.json()) as { error?: string }
      setSubmitError(d.error ?? "Something went wrong")
      setSubmitting(false)
      return
    }

    const { email } = (await res.json()) as { email: string }
    setPageState({ status: "success" })

    const result = await signIn("credentials", {
      email,
      password: form.password,
      redirect: false,
    })

    setSubmitting(false)
    if (result?.ok) {
      router.push("/dashboard")
    } else {
      router.push("/login")
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 12px", borderRadius: 8,
    border: "1px solid var(--ink-6)", background: "var(--paper-sunken)",
    fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--ink-1)",
    outline: "none", boxSizing: "border-box",
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--paper)", padding: "24px 16px",
    }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        {/* Brand */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: "var(--ink-1)", color: "var(--paper)",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            marginBottom: 10,
          }}>
            <LogoMark size={22} />
          </div>
          <div style={{ fontSize: 20, fontWeight: 500, letterSpacing: "-0.02em", color: "var(--ink-1)" }}>
            recall<span style={{ color: "var(--ink-3)" }}>ai</span>
          </div>
        </div>

        {pageState.status === "loading" && (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 40 }}>
            <Loader2 style={{ width: 32, height: 32, color: "var(--ink-3)", animation: "spin 1s linear infinite" }} />
          </div>
        )}

        {(pageState.status === "expired" || pageState.status === "error") && (
          <div style={{
            background: "var(--paper-raised)", border: "1px solid var(--ink-6)",
            borderRadius: 16, padding: 32, textAlign: "center", boxShadow: "var(--shadow-2)",
          }}>
            <AlertTriangle style={{ width: 40, height: 40, color: "var(--red-500)", margin: "0 auto 12px" }} />
            <div style={{ fontSize: 17, fontWeight: 600, color: "var(--ink-1)", marginBottom: 8 }}>
              Invite Unavailable
            </div>
            <div style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 20 }}>
              {pageState.message}
            </div>
            <a href="/login" style={{ fontSize: 13, color: "var(--blue-600)", textDecoration: "none" }}>
              Go to sign in →
            </a>
          </div>
        )}

        {pageState.status === "success" && (
          <div style={{
            background: "var(--paper-raised)", border: "1px solid var(--ink-6)",
            borderRadius: 16, padding: 32, textAlign: "center", boxShadow: "var(--shadow-2)",
          }}>
            <CheckCircle style={{ width: 40, height: 40, color: "var(--green-500)", margin: "0 auto 12px" }} />
            <div style={{ fontSize: 17, fontWeight: 600, color: "var(--ink-1)", marginBottom: 6 }}>
              You&apos;re in!
            </div>
            <div style={{ fontSize: 13, color: "var(--ink-3)" }}>Signing you in…</div>
          </div>
        )}

        {pageState.status === "ready" && (
          <div style={{
            background: "var(--paper-raised)", border: "1px solid var(--ink-6)",
            borderRadius: 16, padding: "24px 24px 20px", boxShadow: "var(--shadow-2)",
          }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 18, fontWeight: 600, color: "var(--ink-1)", marginBottom: 6 }}>
                You&apos;ve been invited
              </div>
              <div style={{ fontSize: 13, color: "var(--ink-3)" }}>
                Join <strong style={{ color: "var(--ink-1)" }}>{pageState.info.teamName}</strong> as a{" "}
                <strong style={{ color: "var(--ink-1)" }}>
                  {pageState.info.role === "MANAGER" ? "Manager" : "Agent"}
                </strong>
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-4)", marginTop: 4 }}>
                {pageState.info.email}
              </div>
            </div>

            <form onSubmit={(e) => { void handleSubmit(e) }} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {submitError && (
                <div style={{
                  background: "var(--red-50)", border: "1px solid var(--red-100)",
                  borderRadius: 8, padding: "10px 12px",
                  fontSize: 13, color: "var(--red-ink)",
                }}>
                  {submitError}
                </div>
              )}

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--ink-2)", marginBottom: 6 }}>
                  Your name
                </label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  style={inputStyle}
                  placeholder="Jane Smith"
                  onFocus={(e) => { e.currentTarget.style.borderColor = "var(--blue-500)"; e.currentTarget.style.background = "var(--paper-raised)" }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "var(--ink-6)"; e.currentTarget.style.background = "var(--paper-sunken)" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--ink-2)", marginBottom: 6 }}>
                  Password
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  style={inputStyle}
                  placeholder="At least 8 characters"
                  onFocus={(e) => { e.currentTarget.style.borderColor = "var(--blue-500)"; e.currentTarget.style.background = "var(--paper-raised)" }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "var(--ink-6)"; e.currentTarget.style.background = "var(--paper-sunken)" }}
                />
                <div style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 4 }}>
                  If you already have a RecallAI account, enter your existing password to join the team.
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: 10,
                  background: "var(--ink-1)", color: "var(--paper)",
                  border: "1px solid transparent",
                  fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 500,
                  cursor: submitting ? "default" : "pointer",
                  opacity: submitting ? 0.6 : 1,
                }}
              >
                {submitting ? "Joining…" : "Create Account & Join"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
