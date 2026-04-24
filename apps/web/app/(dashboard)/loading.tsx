function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-ink-6 ${className ?? ""}`} />
}

export default function DashboardLoading() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-r3 p-5 space-y-3"
            style={{
              background: "var(--paper-raised)",
              border: "1px solid var(--ink-6)",
              boxShadow: "var(--shadow-1)",
            }}
          >
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-20" />
          </div>
        ))}
      </div>
      <Skeleton className="h-12 w-56" />
    </div>
  )
}
