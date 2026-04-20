"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  LayoutDashboard,
  Play,
  Folder,
  Users,
  Settings,
  BarChart2,
  UserCog,
} from "lucide-react"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/review", label: "Review", icon: Play },
  { href: "/decks", label: "Decks", icon: Folder },
  { href: "/stats", label: "My Stats", icon: BarChart2 },
  { href: "/team", label: "Team Analytics", icon: Users, managerOnly: true },
  { href: "/team/settings", label: "Team Settings", icon: UserCog, managerOnly: true },
  { href: "/settings", label: "Settings", icon: Settings },
]

// Items shown in mobile bottom bar (limited to 5 most important)
const mobileTabItems = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/review", label: "Review", icon: Play },
  { href: "/decks", label: "Decks", icon: Folder },
  { href: "/stats", label: "Stats", icon: BarChart2 },
  { href: "/settings", label: "Settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const role = session?.user?.role

  const visible = navItems.filter(
    (item) => !item.managerOnly || role === "MANAGER" || role === "ADMIN"
  )

  return (
    <>
      {/* ── Desktop sidebar ──────────────────────────────────────────────── */}
      <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-gray-200 bg-white">
        <div className="flex h-14 shrink-0 items-center border-b border-gray-200 px-4">
          <span className="text-base font-bold text-indigo-600">RecallAI</span>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {visible.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/")
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* ── Mobile bottom tab bar ────────────────────────────────────────── */}
      <nav className="fixed bottom-0 inset-x-0 z-50 flex border-t border-gray-200 bg-white md:hidden">
        {mobileTabItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/")
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center justify-center py-2 text-xs font-medium transition-colors min-h-[56px] ${
                active ? "text-indigo-600" : "text-gray-500"
              }`}
            >
              <Icon className={`h-5 w-5 mb-0.5 ${active ? "text-indigo-600" : "text-gray-400"}`} />
              {label}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
