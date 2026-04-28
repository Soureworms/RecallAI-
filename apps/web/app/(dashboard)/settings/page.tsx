"use client"

import { useSession, signOut } from "next-auth/react"
import { useState, useRef, useCallback, useEffect } from "react"
import { Camera, User, Mail, Lock, CheckCircle, AlertCircle, Brain, RefreshCw, LogOut } from "lucide-react"
import { toast } from "sonner"

type Status = "idle" | "saving" | "success" | "error"

type FSRSParams = {
  hasCustomParams: boolean
  reviewCount: number
  minReviewsRequired: number
  params: {
    logLoss: number | null
    rmseBins: number | null
    reviewCount: number
    lastOptimizedAt: string
    learningSteps: string[]
    relearningSteps: string[]
  } | null
}

function Avatar({
  src,
  name,
  size = 80,
}: {
  src?: string | null
  name?: string | null
  size?: number
}) {
  const initials = (name ?? "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name ?? "Avatar"}
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <div
      className="flex items-center justify-center rounded-full bg-ds-blue-100 text-ds-blue-ink font-semibold select-none"
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {initials}
    </div>
  )
}

export default function SettingsPage() {
  const { data: session, update: updateSession } = useSession()

  const [name, setName] = useState(session?.user?.name ?? "")
  const [previewImage, setPreviewImage] = useState<string | null>(
    (session?.user?.image as string | null) ?? null
  )
  const [profileStatus, setProfileStatus] = useState<Status>("idle")
  const [resetStatus, setResetStatus] = useState<Status>("idle")
  const [fsrsData, setFsrsData] = useState<FSRSParams | null>(null)
  const [optimizing, setOptimizing] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Load FSRS params ────────────────────────────────────────────────────────

  useEffect(() => {
    fetch("/api/user/fsrs-params")
      .then((r) => r.json())
      .then(setFsrsData)
      .catch(() => null)
  }, [])

  // ── Avatar selection ────────────────────────────────────────────────────────

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file (JPEG, PNG, WebP)")
        return
      }

      const reader = new FileReader()
      reader.onload = (ev) => {
        const src = ev.target?.result as string
        const img = new window.Image()
        img.onload = () => {
          const MAX = 128
          const canvas = document.createElement("canvas")
          const scale = Math.min(1, MAX / img.width, MAX / img.height)
          canvas.width = Math.round(img.width * scale)
          canvas.height = Math.round(img.height * scale)
          const ctx = canvas.getContext("2d")!
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          setPreviewImage(canvas.toDataURL("image/jpeg", 0.85))
        }
        img.src = src
      }
      reader.readAsDataURL(file)
    },
    []
  )

  // ── Save profile ────────────────────────────────────────────────────────────

  const saveProfile = useCallback(async () => {
    setProfileStatus("saving")
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, image: previewImage }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(err.error ?? "Failed to save")
      }
      await updateSession({ name, image: previewImage })
      setProfileStatus("success")
      toast.success("Profile saved")
      setTimeout(() => setProfileStatus("idle"), 3000)
    } catch (err) {
      setProfileStatus("error")
      toast.error(err instanceof Error ? err.message : "Failed to save profile")
      setTimeout(() => setProfileStatus("idle"), 3000)
    }
  }, [name, previewImage, updateSession])

  // ── Request password reset ──────────────────────────────────────────────────

  const requestPasswordReset = useCallback(async () => {
    setResetStatus("saving")
    try {
      const res = await fetch("/api/user/password-reset", { method: "POST" })
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(err.error ?? "Failed to send")
      }
      setResetStatus("success")
    } catch (err) {
      setResetStatus("error")
      toast.error(err instanceof Error ? err.message : "Failed to send reset email")
      setTimeout(() => setResetStatus("idle"), 3000)
    }
  }, [])

  // ── Trigger FSRS optimization ───────────────────────────────────────────────

  const runOptimize = useCallback(async () => {
    setOptimizing(true)
    try {
      const res = await fetch("/api/user/optimize", { method: "POST" })
      const data = await res.json() as { error?: string }
      if (!res.ok) throw new Error(data.error ?? "Optimization failed")
      toast.success("FSRS parameters optimized for your study history")
      const updated = await fetch("/api/user/fsrs-params").then((r) => r.json())
      setFsrsData(updated)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Optimization failed")
    } finally {
      setOptimizing(false)
    }
  }, [])

  if (!session?.user) return null

  const isDirty =
    name !== (session.user.name ?? "") ||
    previewImage !== ((session.user.image as string | null) ?? null)

  const canOptimize = fsrsData && fsrsData.reviewCount >= fsrsData.minReviewsRequired

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-2">
      <div>
        <h1 className="text-2xl font-bold text-ink-1">Settings</h1>
        <p className="mt-1 text-sm text-ink-3">Manage your account information</p>
      </div>

      {/* ── Profile ──────────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-ink-6 bg-paper-raised p-6 shadow-s1">
        <h2 className="mb-5 text-base font-semibold text-ink-1">Profile</h2>

        {/* Avatar */}
        <div className="mb-6 flex items-center gap-5">
          <div className="relative">
            <Avatar src={previewImage} name={name || session.user.name} size={80} />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-ink-1 text-white shadow hover:bg-ink-2"
              title="Change photo"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink-2">Profile photo</p>
            <p className="mt-0.5 text-xs text-ink-4">
              JPEG, PNG or WebP · Resized to 128 × 128
            </p>
            <div className="mt-1.5 flex items-center gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-medium text-ds-blue-600 hover:underline"
              >
                Upload photo
              </button>
              {previewImage && (
                <button
                  onClick={() => setPreviewImage(null)}
                  className="text-xs text-ink-4 hover:text-ds-red-500"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Display name */}
        <div className="mb-6">
          <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-ink-2">
            <User className="h-4 w-4 text-ink-4" />
            Display name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full rounded-xl border border-ink-6 px-4 py-2.5 text-sm text-ink-1 placeholder:text-ink-4 focus:border-ds-blue-500 focus:outline-none focus:ring-2 focus:ring-ds-blue-100"
          />
        </div>

        {/* Email (read-only) */}
        <div className="mb-6">
          <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-ink-2">
            <Mail className="h-4 w-4 text-ink-4" />
            Email address
          </label>
          <input
            type="email"
            value={session.user.email ?? ""}
            readOnly
            className="w-full rounded-xl border border-ink-6 bg-paper-sunken px-4 py-2.5 text-sm text-ink-3 cursor-default select-none"
          />
          <p className="mt-1 text-xs text-ink-4">
            Email cannot be changed. Contact your admin.
          </p>
        </div>

        <button
          onClick={saveProfile}
          disabled={!isDirty || profileStatus === "saving"}
          className="flex items-center gap-2 rounded-xl bg-ink-1 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-ink-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {profileStatus === "saving" && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          )}
          {profileStatus === "success" && <CheckCircle className="h-4 w-4" />}
          {profileStatus === "error" && <AlertCircle className="h-4 w-4" />}
          {profileStatus === "saving"
            ? "Saving…"
            : profileStatus === "success"
            ? "Saved!"
            : "Save changes"}
        </button>
      </section>

      {/* ── Password ─────────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-ink-6 bg-paper-raised p-6 shadow-s1">
        <h2 className="mb-1 text-base font-semibold text-ink-1">Password</h2>
        <p className="mb-5 text-sm text-ink-3">
          We&apos;ll email a reset link to{" "}
          <span className="font-medium text-ink-2">{session.user.email}</span>
        </p>

        {resetStatus === "success" ? (
          <div className="flex items-start gap-3 rounded-xl bg-ds-green-50 p-4 text-ds-green-ink">
            <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-ds-green-500" />
            <div>
              <p className="font-medium">Reset link sent</p>
              <p className="mt-0.5 text-sm">
                Check your inbox at{" "}
                <span className="font-medium">{session.user.email}</span>. The
                link expires in 1 hour.
              </p>
            </div>
          </div>
        ) : (
          <button
            onClick={requestPasswordReset}
            disabled={resetStatus === "saving"}
            className="flex items-center gap-2 rounded-xl border border-ink-6 px-5 py-2.5 text-sm font-medium text-ink-2 hover:bg-paper-sunken disabled:opacity-50"
          >
            {resetStatus === "saving" ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink-5 border-t-transparent" />
            ) : (
              <Lock className="h-4 w-4 text-ink-4" />
            )}
            {resetStatus === "saving" ? "Sending…" : "Send reset link"}
          </button>
        )}
      </section>

      {/* ── FSRS Calibration ─────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-ink-6 bg-paper-raised p-6 shadow-s1">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-ink-1">
              <Brain className="h-4 w-4 text-ink-3" />
              Memory calibration
            </h2>
            <p className="mt-1 text-sm text-ink-3">
              Personalizes your review schedule using the FSRS algorithm trained on your own study history.
            </p>
          </div>
          <button
            onClick={runOptimize}
            disabled={!canOptimize || optimizing}
            title={!canOptimize ? `Complete ${fsrsData?.minReviewsRequired ?? 10} reviews to unlock` : undefined}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-ink-1 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-ink-2 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${optimizing ? "animate-spin" : ""}`} />
            {optimizing ? "Optimizing…" : "Optimize now"}
          </button>
        </div>

        {fsrsData ? (
          <>
            {/* Review count progress */}
            {!fsrsData.hasCustomParams && (
              <div className="mb-4 rounded-xl bg-paper-sunken p-4">
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="text-ink-3">Reviews completed</span>
                  <span className="font-medium text-ink-2">
                    {fsrsData.reviewCount} / {fsrsData.minReviewsRequired}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-ink-6">
                  <div
                    className="h-full rounded-full bg-ds-blue-500 transition-all"
                    style={{ width: `${Math.min(100, (fsrsData.reviewCount / fsrsData.minReviewsRequired) * 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-ink-4">
                  Using default FSRS parameters until you have enough history.
                </p>
              </div>
            )}

            {/* Current params */}
            {fsrsData.params && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-paper-sunken p-3">
                    <p className="text-xs text-ink-4">Log loss</p>
                    <p className="mt-0.5 text-lg font-semibold text-ink-1">
                      {fsrsData.params.logLoss !== null
                        ? fsrsData.params.logLoss.toFixed(4)
                        : "—"}
                    </p>
                    <p className="text-xs text-ink-4">lower is better</p>
                  </div>
                  <div className="rounded-xl bg-paper-sunken p-3">
                    <p className="text-xs text-ink-4">RMSE bins</p>
                    <p className="mt-0.5 text-lg font-semibold text-ink-1">
                      {fsrsData.params.rmseBins !== null
                        ? fsrsData.params.rmseBins.toFixed(4)
                        : "—"}
                    </p>
                    <p className="text-xs text-ink-4">retention accuracy</p>
                  </div>
                </div>

                <div className="rounded-xl bg-paper-sunken p-3">
                  <p className="mb-2 text-xs font-medium text-ink-3">Optimal learning steps</p>
                  <div className="flex flex-wrap gap-1.5">
                    {fsrsData.params.learningSteps.length > 0
                      ? fsrsData.params.learningSteps.map((s) => (
                          <span key={s} className="rounded-md bg-ds-blue-100 px-2 py-0.5 text-xs font-medium text-ds-blue-ink">
                            {s}
                          </span>
                        ))
                      : <span className="text-xs text-ink-4">Default (1m, 10m)</span>}
                  </div>
                  {fsrsData.params.relearningSteps.length > 0 && (
                    <>
                      <p className="mb-2 mt-3 text-xs font-medium text-ink-3">Relearning steps</p>
                      <div className="flex flex-wrap gap-1.5">
                        {fsrsData.params.relearningSteps.map((s) => (
                          <span key={s} className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                            {s}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <p className="text-right text-xs text-ink-4">
                  Last optimized: {new Date(fsrsData.params.lastOptimizedAt).toLocaleDateString()} ·{" "}
                  {fsrsData.params.reviewCount} reviews used
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="h-20 animate-pulse rounded-xl bg-paper-sunken" />
        )}
      </section>

      {/* ── Sign out ─────────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-ink-6 bg-paper-raised p-6 shadow-s1">
        <h2 className="mb-1 text-base font-semibold text-ink-1">Session</h2>
        <p className="mb-5 text-sm text-ink-3">
          Signed in as <span className="font-medium text-ink-2">{session.user.email}</span>
        </p>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-2 rounded-xl border border-ink-6 px-5 py-2.5 text-sm font-medium text-ds-red-600 hover:bg-ds-red-50 hover:border-ds-red-200"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </section>
    </div>
  )
}
