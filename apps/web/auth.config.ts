import type { NextAuthConfig } from "next-auth"

const ROLE_RANK: Record<string, number> = {
  AGENT: 0,
  MANAGER: 1,
  ADMIN: 2,
  SUPER_ADMIN: 3,
}

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const role = auth?.user?.role ?? "AGENT"
      const rank = ROLE_RANK[role] ?? 0
      const isOnboarded = !!auth?.user?.onboardedAt
      const isSuperAdmin = role === "SUPER_ADMIN"

      const path = nextUrl.pathname

      // Public routes — always allow
      const isPublicAuth = path.startsWith("/login") || path.startsWith("/reset-password") || path.startsWith("/onboarding")
      if (isPublicAuth) {
        // Redirect already-onboarded users away from onboarding
        if (path.startsWith("/onboarding") && isLoggedIn && (isOnboarded || isSuperAdmin)) {
          return Response.redirect(new URL("/dashboard", nextUrl))
        }
        return true
      }

      // Dashboard routes — must be logged in
      const isDashboard = ["/dashboard", "/review", "/decks", "/team", "/settings", "/stats", "/org"].some(
        (p) => path === p || path.startsWith(p + "/")
      )

      if (isDashboard) {
        if (!isLoggedIn) return false

        // Redirect unonboarded non-super-admins to onboarding
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

      // /admin requires SUPER_ADMIN
      if (path === "/admin" || path.startsWith("/admin/")) {
        if (!isLoggedIn) return false
        if (!isSuperAdmin) return false
        return true
      }

      // Everything else (root, marketing page) is public
      return true
    },
  },
  providers: [],
} satisfies NextAuthConfig
