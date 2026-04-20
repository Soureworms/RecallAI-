"use client"

import { useEffect } from "react"
import { AlertTriangle } from "lucide-react"

export default function GlobalError({
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
    <html lang="en">
      <body className="bg-gray-50">
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 text-center px-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Something went wrong</h2>
            <p className="mt-2 text-sm text-gray-500 max-w-sm">
              A critical error occurred. Please try refreshing the page.
            </p>
          </div>
          <button
            onClick={reset}
            className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-indigo-500"
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  )
}
