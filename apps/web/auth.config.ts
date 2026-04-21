import type { NextAuthConfig } from "next-auth"

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isSuperAdmin = auth?.user?.role === "SUPER_ADMIN"
      const isOnboarded = !!auth?.user?.onboardedAt

      const isDashboard = ["/dashboard", "/review", "/decks", "/team", "/settings", "/stats"].some(
        (p) => nextUrl.pathname.startsWith(p)
      )
      const isAdminArea = nextUrl.pathname.startsWith("/admin")
      const isOnboardingPage = nextUrl.pathname.startsWith("/onboarding")

      // Protect all dashboard routes
      if (isDashboard || isAdminArea) {
        if (!isLoggedIn) return false
      }

      // Admin area requires SUPER_ADMIN
      if (isAdminArea && !isSuperAdmin) return false

      // Redirect unonboarded non-super-admins into onboarding
      if (isLoggedIn && !isSuperAdmin && !isOnboarded && isDashboard) {
        return Response.redirect(new URL("/onboarding", nextUrl))
      }

      // Once onboarded, skip the onboarding page
      if (isOnboardingPage && isLoggedIn && (isOnboarded || isSuperAdmin)) {
        return Response.redirect(new URL("/dashboard", nextUrl))
      }

      return true
    },
  },
  providers: [],
} satisfies NextAuthConfig
