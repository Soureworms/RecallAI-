function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-ink-6 ${className ?? ""}`} />
}
export default function Loading() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-32 rounded-r2" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-r3" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-r3" />
      <Skeleton className="h-80 w-full rounded-r3" />
    </div>
  )
}
