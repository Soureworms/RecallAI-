"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { Brain, CheckCircle, AlertTriangle, Loader2 } from "lucide-react"

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
  | { status: "success"; email: string }

export default function InviteAcceptPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const [pageState, setPageState] = useState<PageState>({ status: "loading" })
  const [form, setForm] = useState({ name: "", password: "" })
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isExistingUser, setIsExistingUser] = useState(false)

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
        const info = data as InviteInfo
        setPageState({ status: "ready", info })
        // Pre-check if user already exists by trying to find them
        void fetch(`/api/auth/check-email?email=${encodeURIComponent(info.email)}`)
          .then((r2) => r2.ok ? r2.json() : null)
          .then((d: { exists: boolean } | null) => {
            if (d?.exists) setIsExistingUser(true)
          })
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
      body: JSON.stringify({
        password: form.password,
        name: isExistingUser ? undefined : form.name,
      }),
    })

    if (!res.ok) {
      const d = (await res.json()) as { error?: string }
      setSubmitError(d.error ?? "Something went wrong")
      setSubmitting(false)
      return
    }

    const { email } = (await res.json()) as { email: string }
    setPageState({ status: "success", email })

    // Auto sign-in and redirect
    const result = await signIn("credentials", {
      email,
      password: form.password,
      redirect: false,
    })

    setSubmitting(false)
    if (result?.ok) {
      router.push("/dashboard")
    } else {
      // Sign-in failed but account was created/joined — direct to login
      router.push("/login")
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex items-center justify-center gap-2">
          <Brain className="h-7 w-7 text-indigo-600" />
          <span className="text-xl font-bold text-gray-900">RecallAI</span>
        </div>

        {pageState.status === "loading" && (
          <div className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          </div>
        )}

        {(pageState.status === "expired" || pageState.status === "error") && (
          <div className="rounded-xl border border-red-200 bg-white p-8 text-center shadow-sm">
            <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-red-400" />
            <h2 className="text-lg font-semibold text-gray-900">Invite Unavailable</h2>
            <p className="mt-2 text-sm text-gray-500">{pageState.message}</p>
            <a
              href="/login"
              className="mt-4 inline-block text-sm text-indigo-600 hover:underline"
            >
              Go to sign in
            </a>
          </div>
        )}

        {pageState.status === "success" && (
          <div className="rounded-xl border border-green-200 bg-white p-8 text-center shadow-sm">
            <CheckCircle className="mx-auto mb-3 h-10 w-10 text-green-500" />
            <h2 className="text-lg font-semibold text-gray-900">You&apos;re in!</h2>
            <p className="mt-2 text-sm text-gray-500">Signing you in…</p>
          </div>
        )}

        {pageState.status === "ready" && (
          <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
            <div className="mb-6 text-center">
              <h1 className="text-xl font-bold text-gray-900">
                You&apos;ve been invited
              </h1>
              <p className="mt-2 text-sm text-gray-500">
                Join <strong>{pageState.info.teamName}</strong> as a{" "}
                <strong>{pageState.info.role === "MANAGER" ? "Manager" : "Agent"}</strong>
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Invite sent to: {pageState.info.email}
              </p>
            </div>

            <form onSubmit={(e) => { void handleSubmit(e) }} className="space-y-4">
              {submitError && (
                <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {submitError}
                </div>
              )}

              {!isExistingUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Your name
                  </label>
                  <input
                    required={!isExistingUser}
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="Jane Smith"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {isExistingUser
                    ? "Your password (to confirm your identity)"
                    : "Create a password"}
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder={isExistingUser ? "Your existing password" : "At least 8 characters"}
                />
              </div>

              {isExistingUser && (
                <p className="text-xs text-gray-500">
                  An account already exists for <strong>{pageState.info.email}</strong>.
                  Enter your password to join the team.
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60"
              >
                {submitting
                  ? "Joining…"
                  : isExistingUser
                  ? "Join Team"
                  : "Create Account & Join"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
