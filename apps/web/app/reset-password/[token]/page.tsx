"use client"

import { useState, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react"

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

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">RecallAI</h1>
          <p className="mt-1 text-sm text-gray-500">Set a new password</p>
        </div>

        {status === "success" ? (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-7 w-7 text-green-600" />
            </div>
            <p className="font-semibold text-gray-900">Password updated!</p>
            <p className="mt-1 text-sm text-gray-500">
              Redirecting you to sign in…
            </p>
            <Link
              href="/login"
              className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:underline"
            >
              Sign in now
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {status === "error" && errorMsg && (
              <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                New password
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 pr-10 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {password.length > 0 && password.length < 8 && (
                <p className="mt-1 text-xs text-red-500">
                  Must be at least 8 characters
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Confirm password
              </label>
              <input
                type={showPw ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat new password"
                required
                className={`w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 ${
                  mismatch
                    ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                    : "border-gray-200 focus:border-indigo-400 focus:ring-indigo-100"
                }`}
              />
              {mismatch && (
                <p className="mt-1 text-xs text-red-500">Passwords do not match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {status === "submitting" && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              {status === "submitting" ? "Updating…" : "Set new password"}
            </button>

            <p className="text-center text-xs text-gray-400">
              <Link href="/login" className="text-indigo-600 hover:underline">
                Back to sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
