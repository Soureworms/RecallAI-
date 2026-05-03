"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import {
  Play,
  Folder,
  BarChart2,
  Users,
  Settings,
  Building2,
  ShieldCheck,
  LogOut,
  LayoutDashboard,
} from "lucide-react"
import { getNavItemsForRole, type NavItemKey } from "@/lib/auth/capabilities"
import { assertRole } from "@/lib/auth/roles"

const NAV_ICONS: Record<NavItemKey, React.ElementType> = {
  dashboard: LayoutDashboard,
  study: Play,
  decks: Folder,
  team: Users,
  organisation: Building2,
  stats: BarChart2,
  settings: Settings,
  "platform-admin": ShieldCheck,
}

function LogoMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M5 7.5 A7 7 0 0 1 18 9.5" />
      <path d="M19 16.5 A7 7 0 0 1 6 14.5" />
      <circle cx="18" cy="9.5" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="6" cy="14.5" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  )
}

function initials(name: string | null | undefined, email: string | null | undefined) {
  if (name) return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()
  return (email ?? "?")[0].toUpperCase()
}

function NavLink({ href, label, icon: Icon, pathname }: { href: string; label: string; icon: React.ElementType; pathname: string }) {
  const active = pathname === href || (href !== "/dashboard" && href !== "/admin" && pathname.startsWith(href + "/"))
               || (href === "/admin" && pathname.startsWith("/admin"))
  return (
    <Link
      href={href}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "7px 10px", borderRadius: "var(--r-2)",
        background: active ? "var(--paper-sunken)" : "transparent",
        color: active ? "var(--ink-1)" : "var(--ink-2)",
        fontSize: 13, fontWeight: active ? 500 : 400,
        textDecoration: "none", transition: `background var(--dur-quick) var(--ease-out)`,
      }}
    >
      <Icon size={15} style={{ flexShrink: 0, color: active ? "var(--ink-1)" : "var(--ink-3)" }} strokeWidth={1.75} />
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
    </Link>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const role = assertRole(session?.user?.role ?? "AGENT", "session user role")
  const isSuperAdmin = role === "SUPER_ADMIN"

  const navItems = getNavItemsForRole(role).map((item) => ({
    ...item,
    icon: NAV_ICONS[item.key],
  }))

  // Mobile: always show Settings as the 5th tab; fill first 4 from non-settings items
  const settingsItem = navItems.find((i) => i.href === "/settings")
  const mobileItems = [
    ...navItems.filter((i) => i.href !== "/settings").slice(0, 4),
    ...(settingsItem ? [settingsItem] : []),
  ]

  const userName = session?.user?.name ?? null
  const userEmail = session?.user?.email ?? null
  const userInitials = initials(userName, userEmail)
  const roleLabel = isSuperAdmin ? "Super Admin" : role.charAt(0) + role.slice(1).toLowerCase()

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <aside
        className="hidden md:flex w-[240px] shrink-0 flex-col"
        style={{ borderRight: "1px solid var(--ink-6)", background: "var(--paper)" }}
      >
        <div style={{ padding: "16px 12px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 8px 14px" }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: "var(--ink-1)", color: "var(--paper)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <LogoMark size={16} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 500, letterSpacing: "-0.02em", color: "var(--ink-1)" }}>
              recall<span style={{ color: "var(--ink-3)" }}>ai</span>
            </div>
          </div>

          {isSuperAdmin && (
            <div style={{
              fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase",
              color: "var(--ink-4)", padding: "0 10px 8px",
              fontFamily: "var(--font-mono)",
            }}>
              Platform
            </div>
          )}

          <nav style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {navItems.map(({ href, label, icon }) => (
              <NavLink key={href} href={href} label={label} icon={icon} pathname={pathname} />
            ))}
          </nav>
        </div>

        {/* User footer */}
        <div style={{
          marginTop: "auto",
          borderTop: "1px solid var(--ink-6)",
          padding: "10px 12px",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <div style={{
            width: 26, height: 26, borderRadius: "999px",
            background: isSuperAdmin ? "var(--amber-100, #fef3c7)" : "var(--violet-100)",
            color: isSuperAdmin ? "var(--amber-700, #b45309)" : "var(--violet-ink)",
            fontSize: 11, fontWeight: 600,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            {userInitials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--ink-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {userName ?? userEmail ?? "User"}
            </div>
            <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{roleLabel}</div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Sign out"
            style={{
              background: "transparent", border: 0,
              color: "var(--ink-3)", cursor: "pointer", padding: 4,
              borderRadius: "var(--r-1)", flexShrink: 0,
            }}
          >
            <LogOut size={15} strokeWidth={1.75} />
          </button>
        </div>
      </aside>

      {/* ── Mobile bottom tab bar ────────────────────────────────────────── */}
      <nav
        className="fixed bottom-0 inset-x-0 z-50 flex md:hidden"
        style={{ borderTop: "1px solid var(--ink-6)", background: "var(--paper-raised)" }}
      >
        {mobileItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && href !== "/admin" && pathname.startsWith(href + "/"))
                       || (href === "/admin" && pathname.startsWith("/admin"))
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-1 flex-col items-center justify-center py-2 min-h-[56px]"
              style={{
                fontSize: 10, fontWeight: active ? 500 : 400,
                color: active ? "var(--ink-1)" : "var(--ink-3)",
                textDecoration: "none",
              }}
            >
              <Icon size={18} strokeWidth={1.75} style={{ marginBottom: 2 }} />
              {label}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
