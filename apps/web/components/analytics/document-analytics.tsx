"use client"

import { useEffect, useState } from "react"
import { FileText, AlertTriangle } from "lucide-react"

type DocumentItem = {
  documentId: string
  filename: string
  deckName: string
  totalCards: number
  avgRetention: number
  totalReviews: number
  activeUsers: number
}

function RetentionBadge({ value }: { value: number }) {
  const bg =
    value === 0
      ? "var(--paper-sunken)"
      : value >= 80
      ? "var(--green-50, #f0fdf4)"
      : value >= 60
      ? "var(--amber-50, #fffbeb)"
      : "var(--red-50, #fef2f2)"
  const color =
    value === 0
      ? "var(--ink-4)"
      : value >= 80
      ? "var(--green-700, #15803d)"
      : value >= 60
      ? "var(--amber-700, #b45309)"
      : "var(--red-700, #b91c1c)"

  return (
    <span
      style={{
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        background: bg,
        color,
        whiteSpace: "nowrap",
      }}
    >
      {value === 0 ? "No data" : `${value}%`}
    </span>
  )
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-ink-6 ${className ?? ""}`} />
}

export function DocumentAnalytics() {
  const [items, setItems] = useState<DocumentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void fetch("/api/analytics/documents")
      .then(async (r) => {
        if (!r.ok) throw new Error("Failed to load")
        return r.json() as Promise<DocumentItem[]>
      })
      .then((d) => { setItems(d); setLoading(false) })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Unknown error")
        setLoading(false)
      })
  }, [])

  if (error || (!loading && items.length === 0)) return null

  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{ marginBottom: 14 }}>
        <h2
          style={{
            fontSize: 17,
            fontWeight: 700,
            letterSpacing: "-0.01em",
            color: "var(--ink-1)",
          }}
        >
          Performance by Source File
        </h2>
        <p style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 2 }}>
          Retention and engagement broken down by uploaded document
        </p>
      </div>

      <div
        style={{
          background: "var(--paper-raised)",
          border: "1px solid var(--ink-6)",
          borderRadius: 14,
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 120px 80px 80px 70px",
            padding: "10px 20px",
            borderBottom: "1px solid var(--ink-6)",
            gap: 8,
          }}
        >
          {["File", "Deck", "Cards", "Reviews", "Retention"].map((h) => (
            <span
              key={h}
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--ink-4)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              {h}
            </span>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.documentId}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 120px 80px 80px 70px",
                padding: "12px 20px",
                borderBottom: "1px solid var(--ink-6)",
                alignItems: "center",
                gap: 8,
              }}
            >
              {/* Filename */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                {item.avgRetention > 0 && item.avgRetention < 70 && (
                  <AlertTriangle
                    size={13}
                    style={{ color: "var(--amber-500)", flexShrink: 0 }}
                    strokeWidth={1.75}
                  />
                )}
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: "var(--ink-1)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={item.filename}
                  >
                    {item.filename}
                  </div>
                  {item.activeUsers > 0 && (
                    <div style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 1 }}>
                      {item.activeUsers} user{item.activeUsers !== 1 ? "s" : ""} studying
                    </div>
                  )}
                </div>
              </div>

              {/* Deck name */}
              <span
                style={{
                  fontSize: 12,
                  color: "var(--ink-3)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={item.deckName}
              >
                {item.deckName}
              </span>

              {/* Total cards */}
              <span style={{ fontSize: 13, color: "var(--ink-2)", fontVariantNumeric: "tabular-nums" }}>
                {item.totalCards}
              </span>

              {/* Total reviews */}
              <span style={{ fontSize: 13, color: "var(--ink-2)", fontVariantNumeric: "tabular-nums" }}>
                {item.totalReviews.toLocaleString()}
              </span>

              {/* Retention badge */}
              <RetentionBadge value={item.avgRetention} />
            </div>
          ))
        )}

        {/* Footer — lowest-retention callout */}
        {!loading && items.length > 0 && items[0].avgRetention > 0 && items[0].avgRetention < 70 && (
          <div
            style={{
              padding: "10px 20px",
              background: "var(--amber-50, #fffbeb)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <AlertTriangle size={13} style={{ color: "var(--amber-600)" }} strokeWidth={1.75} />
            <span style={{ fontSize: 12, color: "var(--amber-700)" }}>
              <strong>{items[0].filename}</strong> has the lowest retention ({items[0].avgRetention}%). Consider reviewing the source material or adding more practice cards.
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
