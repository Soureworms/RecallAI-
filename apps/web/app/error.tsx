"use client"

import { useEffect } from "react"
import { AlertTriangle } from "lucide-react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center px-4">
      <div
        className="flex h-16 w-16 items-center justify-center rounded-r4"
        style={{ background: "var(--red-50)", border: "1px solid var(--red-100)" }}
      >
        <AlertTriangle className="h-8 w-8" style={{ color: "var(--red-500)" }} />
      </div>
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--ink-1)", letterSpacing: "-0.01em" }}>
          Something went wrong
        </h2>
        <p
          className="mt-2 max-w-sm"
          style={{ fontSize: 13, color: "var(--ink-3)", lineHeight: 1.55 }}
        >
          An unexpected error occurred. If this keeps happening, please refresh the page.
        </p>
      </div>
      <button
        onClick={reset}
        className="rounded-r3 px-6 py-2.5"
        style={{
          background: "var(--ink-1)",
          color: "var(--paper)",
          fontSize: 14,
          fontWeight: 500,
          border: "1px solid transparent",
          cursor: "pointer",
        }}
      >
        Try again
      </button>
    </div>
  )
}
