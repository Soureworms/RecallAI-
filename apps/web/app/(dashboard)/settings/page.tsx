"use client"

import { useSession } from "next-auth/react"
import { useState, useRef, useCallback } from "react"
import { Camera, User, Mail, Lock, CheckCircle, AlertCircle } from "lucide-react"
import { toast } from "sonner"

type Status = "idle" | "saving" | "success" | "error"

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

  const fileInputRef = useRef<HTMLInputElement>(null)

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

  if (!session?.user) return null

  const isDirty =
    name !== (session.user.name ?? "") ||
    previewImage !== ((session.user.image as string | null) ?? null)

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
    </div>
  )
}
