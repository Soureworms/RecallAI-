"use client"

import { useState, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react"

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

export default function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = use(params)
  const router = useRouter()

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")

  const mismatch = confirm.length > 0 && password !== confirm
  const canSubmit = password.length >= 8 && password === confirm && status !== "submitting"

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    setStatus("submitting")
    setErrorMsg("")

    try {
      const res = await fetch(`/api/user/password-reset/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })

      const data = await res.json() as { error?: string }

      if (!res.ok) {
        setErrorMsg(data.error ?? "Something went wrong. Please try again.")
        setStatus("error")
        return
      }

      setStatus("success")
      setTimeout(() => router.push("/login"), 3000)
    } catch {
      setErrorMsg("Network error. Please check your connection and try again.")
      setStatus("error")
    }
  }

  const inputBase: React.CSSProperties = {
    width: "100%", padding: "8px 40px 8px 12px", borderRadius: 8,
    border: "1px solid var(--ink-6)", background: "var(--paper-sunken)",
    fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--ink-1)",
    outline: "none", boxSizing: "border-box",
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--paper)", padding: "24px 16px",
    }}>
      <div style={{ width: "100%", maxWidth: 360 }}>
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
          <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 4 }}>Set a new password</div>
        </div>

        <div style={{
          background: "var(--paper-raised)", border: "1px solid var(--ink-6)",
          borderRadius: 16, padding: "24px 24px 20px", boxShadow: "var(--shadow-2)",
        }}>
          {status === "success" ? (
            <div style={{ textAlign: "center" }}>
              <div style={{
                width: 56, height: 56, margin: "0 auto 16px",
                background: "var(--green-50)", border: "1px solid var(--green-100)",
                borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <CheckCircle style={{ width: 28, height: 28, color: "var(--green-500)" }} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "var(--ink-1)" }}>Password updated</div>
              <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 4 }}>
                Redirecting you to sign in…
              </div>
              <Link href="/login" style={{ display: "inline-block", marginTop: 14, fontSize: 13, fontWeight: 500, color: "var(--blue-600)", textDecoration: "none" }}>
                Sign in now →
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {status === "error" && errorMsg && (
                <div style={{
                  display: "flex", alignItems: "flex-start", gap: 8,
                  background: "var(--red-50)", border: "1px solid var(--red-100)",
                  borderRadius: 8, padding: "10px 12px",
                  fontSize: 13, color: "var(--red-ink)",
                }}>
                  <AlertCircle style={{ width: 16, height: 16, flexShrink: 0, marginTop: 1 }} />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--ink-2)", marginBottom: 6 }}>
                  New password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    minLength={8}
                    style={inputBase}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "var(--blue-500)"; e.currentTarget.style.background = "var(--paper-raised)" }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "var(--ink-6)"; e.currentTarget.style.background = "var(--paper-sunken)" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    style={{
                      position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                      background: "transparent", border: "none", cursor: "pointer",
                      color: "var(--ink-4)", padding: 4,
                    }}
                    tabIndex={-1}
                  >
                    {showPw ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                  </button>
                </div>
                {password.length > 0 && password.length < 8 && (
                  <div style={{ fontSize: 11, color: "var(--red-500)", marginTop: 4 }}>
                    Must be at least 8 characters
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--ink-2)", marginBottom: 6 }}>
                  Confirm password
                </label>
                <input
                  type={showPw ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat new password"
                  required
                  style={{
                    ...inputBase,
                    padding: "8px 12px",
                    borderColor: mismatch ? "var(--red-500)" : "var(--ink-6)",
                  }}
                  onFocus={(e) => {
                    if (!mismatch) {
                      e.currentTarget.style.borderColor = "var(--blue-500)"
                      e.currentTarget.style.background = "var(--paper-raised)"
                    }
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = mismatch ? "var(--red-500)" : "var(--ink-6)"
                    e.currentTarget.style.background = "var(--paper-sunken)"
                  }}
                />
                {mismatch && (
                  <div style={{ fontSize: 11, color: "var(--red-500)", marginTop: 4 }}>
                    Passwords do not match
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={!canSubmit}
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: 10,
                  background: "var(--ink-1)", color: "var(--paper)",
                  border: "1px solid transparent",
                  fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 500,
                  cursor: canSubmit ? "pointer" : "not-allowed",
                  opacity: canSubmit ? 1 : 0.5,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}
              >
                {status === "submitting" && (
                  <span style={{
                    width: 14, height: 14, borderRadius: "50%",
                    border: "2px solid var(--paper)", borderTopColor: "transparent",
                    animation: "spin 1s linear infinite",
                  }} />
                )}
                {status === "submitting" ? "Updating…" : "Set new password"}
              </button>

              <p style={{ textAlign: "center", fontSize: 12, color: "var(--ink-4)", marginTop: 4 }}>
                <Link href="/login" style={{ color: "var(--blue-600)", textDecoration: "none" }}>
                  ← Back to sign in
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
