"use client"

import { useFormState, useFormStatus } from "react-dom"
import Link from "next/link"
import { loginAction } from "@/lib/actions"

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

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      style={{
        width: "100%", padding: "10px 14px", borderRadius: 10,
        background: "var(--ink-1)", color: "var(--paper)",
        border: "1px solid transparent",
        fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 500,
        cursor: pending ? "default" : "pointer",
        opacity: pending ? 0.6 : 1,
        transition: "opacity var(--dur-quick) var(--ease-out)",
      }}
    >
      {pending ? "Signing in…" : "Sign in"}
    </button>
  )
}

export default function LoginPage() {
  const [error, action] = useFormState(loginAction, undefined)

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--paper)", padding: "24px 16px",
    }}>
      <div style={{ width: "100%", maxWidth: 360 }}>
        {/* Brand */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: "var(--ink-1)", color: "var(--paper)",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            marginBottom: 12,
          }}>
            <LogoMark size={22} />
          </div>
          <div style={{ fontSize: 20, fontWeight: 500, letterSpacing: "-0.02em", color: "var(--ink-1)" }}>
            recall<span style={{ color: "var(--ink-3)" }}>ai</span>
          </div>
          <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 4 }}>Sign in to your workspace</div>
        </div>

        {/* Form */}
        <div style={{
          background: "var(--paper-raised)", border: "1px solid var(--ink-6)",
          borderRadius: 16, padding: "24px 24px 20px",
          boxShadow: "var(--shadow-2)",
        }}>
          <form action={action} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {error && (
              <div style={{
                background: "var(--red-50)", border: "1px solid var(--red-100)",
                borderRadius: 8, padding: "10px 12px",
                fontSize: 13, color: "var(--red-ink)",
              }}>
                {error}
              </div>
            )}

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--ink-2)", marginBottom: 6 }}>
                Email
              </label>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                style={{
                  width: "100%", padding: "8px 12px", borderRadius: 8,
                  border: "1px solid var(--ink-6)",
                  background: "var(--paper-sunken)",
                  fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--ink-1)",
                  outline: "none", boxSizing: "border-box",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "var(--blue-500)"; e.currentTarget.style.background = "var(--paper-raised)" }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "var(--ink-6)"; e.currentTarget.style.background = "var(--paper-sunken)" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--ink-2)", marginBottom: 6 }}>
                Password
              </label>
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
                style={{
                  width: "100%", padding: "8px 12px", borderRadius: 8,
                  border: "1px solid var(--ink-6)",
                  background: "var(--paper-sunken)",
                  fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--ink-1)",
                  outline: "none", boxSizing: "border-box",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "var(--blue-500)"; e.currentTarget.style.background = "var(--paper-raised)" }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "var(--ink-6)"; e.currentTarget.style.background = "var(--paper-sunken)" }}
              />
            </div>

            {/* Remember me */}
            <label style={{
              display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
              fontSize: 13, color: "var(--ink-2)",
            }}>
              <input
                name="rememberMe"
                type="checkbox"
                defaultChecked
                style={{ width: 15, height: 15, accentColor: "var(--ink-1)", cursor: "pointer", flexShrink: 0 }}
              />
              Remember me for 30 days
            </label>

            <SubmitButton />
            <p style={{ textAlign: "right", marginTop: -4 }}>
              <Link href="/forgot-password" style={{ fontSize: 12, color: "var(--blue-600)", textDecoration: "none" }}>
                Forgot password?
              </Link>
            </p>
          </form>
        </div>

        <p style={{ textAlign: "center", fontSize: 12, color: "var(--ink-4)", marginTop: 16 }}>
          Access is by invitation only.{" "}
          <a href="mailto:hello@recallai.app" style={{ color: "var(--blue-600)", textDecoration: "none" }}>
            Contact us
          </a>{" "}
          to get started.
        </p>

        <p style={{ textAlign: "center", marginTop: 10 }}>
          <Link href="/" style={{ fontSize: 12, color: "var(--ink-4)", textDecoration: "none" }}>
            ← Back to recallai.app
          </Link>
        </p>
      </div>
    </div>
  )
}
