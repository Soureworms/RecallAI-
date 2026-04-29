import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { authConfig } from "./auth.config"
import { prisma } from "@/lib/db"
import { assertRole } from "@/lib/auth/roles"

const REMEMBER_ME_SECS = 30 * 24 * 60 * 60  // 30 days
const SESSION_SECS     =      24 * 60 * 60   // 24 hours

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt", maxAge: REMEMBER_ME_SECS },
  providers: [
    Credentials({
      credentials: {
        email:      { label: "Email",       type: "email"    },
        password:   { label: "Password",    type: "password" },
        rememberMe: { label: "Remember me", type: "checkbox" },
      },
      async authorize(credentials) {
        const email    = credentials?.email
        const password = credentials?.password
        if (typeof email !== "string" || typeof password !== "string") return null

        const user = await prisma.user.findUnique({ where: { email } })
        if (!user) return null

        const valid = await bcrypt.compare(password, user.hashedPassword)
        if (!valid) return null

        return {
          id:          user.id,
          email:       user.email,
          name:        user.name ?? undefined,
          image:       user.image ?? undefined,
          role:        user.role,
          orgId:       user.orgId,
          onboardedAt: user.onboardedAt ? user.onboardedAt.toISOString() : null,
          rememberMe:  credentials.rememberMe === "true",
        }
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,

    async jwt({ token, user, trigger }) {
      if (user) {
        token.id          = user.id as string
        token.role        = assertRole(user.role, "authenticated user role")
        token.orgId       = user.orgId
        token.onboardedAt = user.onboardedAt ?? null
        token.rememberMe  = (user as { rememberMe?: boolean }).rememberMe ?? true

        // Short session when "Remember me" is unchecked
        if (!token.rememberMe) {
          token.exp = Math.floor(Date.now() / 1000) + SESSION_SECS
        }
      }
      // Re-read onboardedAt from DB when the client calls session.update()
      if (trigger === "update" && token.id) {
        const fresh = await prisma.user.findUnique({
          where:  { id: token.id as string },
          select: { onboardedAt: true },
        })
        if (fresh) {
          token.onboardedAt = fresh.onboardedAt ? fresh.onboardedAt.toISOString() : null
        }
      }
      token.role = assertRole(token.role ?? "AGENT", "jwt token role")
      return token
    },
  },
})
