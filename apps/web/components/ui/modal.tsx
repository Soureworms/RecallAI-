"use client"

import { useEffect, type ReactNode } from "react"
import { X } from "lucide-react"

type ModalProps = {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  size?: "sm" | "md" | "lg"
}

const sizeClasses = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-2xl",
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
}: ModalProps) {
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div
        className="absolute inset-0"
        style={{ background: "rgba(26,25,23,0.45)" }}
        onClick={onClose}
        aria-hidden
      />
      <div
        className={`relative z-10 w-full ${sizeClasses[size]} rounded-t-2xl sm:rounded-2xl`}
        style={{
          background: "var(--paper-raised)",
          border: "1px solid var(--ink-6)",
          boxShadow: "var(--shadow-lift)",
        }}
      >
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "1px solid var(--ink-6)" }}
        >
          <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--ink-1)", letterSpacing: "-0.01em" }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 min-h-[36px] min-w-[36px] flex items-center justify-center transition-colors"
            style={{ color: "var(--ink-4)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--paper-sunken)"
              e.currentTarget.style.color = "var(--ink-2)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent"
              e.currentTarget.style.color = "var(--ink-4)"
            }}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[80vh] overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  )
}
