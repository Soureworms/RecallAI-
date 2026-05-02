import type { NextAuthConfig } from "next-auth"
import { ROLE_RANK, assertRole } from "@/lib/auth/roles"

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
      const rank = ROLE_RANK[role]
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
        if (!isSuperAdmin) return Response.redirect(new URL("/dashboard", nextUrl))
        return true
      }

      // ── Dashboard routes ─────────────────────────────────────────────────────
      const isDashboard = [
        "/dashboard", "/review", "/decks", "/team", "/settings", "/stats", "/org",
      ].some((p) => path === p || path.startsWith(p + "/"))

      if (isDashboard) {
        if (!isLoggedIn) return false

        // Super admins belong in /admin — redirect them away from all workspace
        // routes. /settings is the sole exception (profile/password management).
        if (isSuperAdmin && path !== "/settings" && !path.startsWith("/settings/")) {
          return Response.redirect(new URL("/admin", nextUrl))
        }

        // Unonboarded users → onboarding (super admin exempt)
        if (!isOnboarded && !isSuperAdmin) {
          return Response.redirect(new URL("/onboarding", nextUrl))
        }

        // /org requires ADMIN+
        if ((path === "/org" || path.startsWith("/org/")) && rank < ROLE_RANK.ADMIN) {
          return Response.redirect(new URL("/dashboard", nextUrl))
        }

        // /team requires MANAGER+
        if ((path === "/team" || path.startsWith("/team/")) && rank < ROLE_RANK.MANAGER) {
          return Response.redirect(new URL("/dashboard", nextUrl))
        }

        return true
      }

      // Everything else (homepage, etc.) is public
      return true
    },
  },
  providers: [],
} satisfies NextAuthConfig
