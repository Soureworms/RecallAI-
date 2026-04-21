import { Sidebar } from "@/components/dashboard/sidebar"
import type { ReactNode } from "react"

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--paper)" }}>
      <Sidebar />
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* pb-16 on mobile leaves room for the bottom tab bar */}
        <div className="flex-1 overflow-y-auto pb-16 md:pb-0">{children}</div>
      </main>
    </div>
  )
}
