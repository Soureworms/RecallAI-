import type { NextAuthConfig } from "next-auth"
import { assertRole } from "@/lib/auth/roles"
import { canAccessDashboardPath, defaultPathForRole } from "@/lib/auth/capabilities"

export const authConfig = {
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    // Runs in middleware (edge) AND in the Node.js auth instance.
    // Maps JWT token claims → session.user so the authorized callback
    // and client-side useSession() both see role / orgId / onboardedAt.
    session({ session, token }) {
      session.user.id = (token.id as string | undefined) ?? (token.sub ?? "")
      session.user.role = assertRole(token.role ?? "AGENT", "session token role")
      session.user.orgId = (token.orgId as string | undefined) ?? ""
      session.user.onboardedAt = (token.onboardedAt as string | null | undefined) ?? null
      return session
    },

    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const role = assertRole(auth?.user?.role ?? "AGENT", "authorized user role")
      const isOnboarded = !!auth?.user?.onboardedAt
      const isSuperAdmin = role === "SUPER_ADMIN"

      const path = nextUrl.pathname

      // ── Public routes ────────────────────────────────────────────────────────
      const isPublicAuth =
        path.startsWith("/login") ||
        path.startsWith("/reset-password") ||
        path.startsWith("/onboarding") ||
        path.startsWith("/invite/")

      if (isPublicAuth) {
        // Super admins and already-onboarded users skip onboarding
        if (path.startsWith("/onboarding") && isLoggedIn && (isOnboarded || isSuperAdmin)) {
          return Response.redirect(new URL(isSuperAdmin ? "/admin" : "/dashboard", nextUrl))
        }
        return true
      }

      // ── /admin — SUPER_ADMIN only ────────────────────────────────────────────
      if (path === "/admin" || path.startsWith("/admin/")) {
        if (!isLoggedIn) return false
        if (!canAccessDashboardPath(role, path)) {
          return Response.redirect(new URL(defaultPathForRole(role), nextUrl))
        }
        return true
      }

      // ── Dashboard routes ─────────────────────────────────────────────────────
      const isDashboard = [
        "/dashboard", "/review", "/decks", "/team", "/settings", "/stats", "/org",
      ].some((p) => path === p || path.startsWith(p + "/"))

      if (isDashboard) {
        if (!isLoggedIn) return false

        // Unonboarded users → onboarding (super admin exempt)
        if (!isOnboarded && !isSuperAdmin) {
          return Response.redirect(new URL("/onboarding", nextUrl))
        }

        if (!canAccessDashboardPath(role, path)) {
          return Response.redirect(new URL(defaultPathForRole(role), nextUrl))
        }

        return true
      }

      // Everything else (homepage, etc.) is public
      return true
    },
  },
  providers: [],
} satisfies NextAuthConfig
