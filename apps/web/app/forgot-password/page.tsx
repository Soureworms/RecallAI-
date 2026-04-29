"use client"

import Link from "next/link"
import { useState } from "react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle")
  const [error, setError] = useState("")

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus("submitting")
    setError("")

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await res.json() as { error?: string }
      if (!res.ok) {
        setError(data.error ?? "Unable to send reset email.")
        setStatus("error")
        return
      }

      setStatus("success")
    } catch {
      setError("Network error. Please try again.")
      setStatus("error")
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 360, border: "1px solid var(--ink-6)", borderRadius: 16, padding: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>Forgot your password?</h1>
        <p style={{ marginTop: 8, fontSize: 13, color: "var(--ink-3)" }}>
          Enter your email and we&apos;ll send you a reset link.
        </p>

        {status === "success" ? (
          <p style={{ marginTop: 16, fontSize: 13, color: "var(--green-500)" }}>
            If an account exists for this email, a reset link has been sent.
          </p>
        ) : (
          <form onSubmit={onSubmit} style={{ marginTop: 16, display: "grid", gap: 12 }}>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--ink-6)" }}
            />
            {status === "error" && <p style={{ fontSize: 12, color: "var(--red-500)" }}>{error}</p>}
            <button
              type="submit"
              disabled={status === "submitting"}
              style={{ padding: "10px 12px", borderRadius: 8, border: "none", background: "var(--ink-1)", color: "white" }}
            >
              {status === "submitting" ? "Sending..." : "Send reset link"}
            </button>
          </form>
        )}

        <p style={{ marginTop: 14, fontSize: 12 }}>
          <Link href="/login">← Back to sign in</Link>
        </p>
      </div>
    </div>
  )
}
