import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { authConfig } from "./auth.config"
import { prisma } from "@/lib/db"

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email
        const password = credentials?.password
        if (typeof email !== "string" || typeof password !== "string") return null

        const user = await prisma.user.findUnique({ where: { email } })
        if (!user) return null

        const valid = await bcrypt.compare(password, user.hashedPassword)
        if (!valid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          image: user.image ?? undefined,
          role: user.role,
          orgId: user.orgId,
          onboardedAt: user.onboardedAt ? user.onboardedAt.toISOString() : null,
        }
      },
    }),
  ],
  callbacks: {
    // Inherit session callback from authConfig (maps token → session.user).
    // This runs in both the Node.js instance and the middleware instance.
    ...authConfig.callbacks,

    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id as string
        token.role = user.role
        token.orgId = user.orgId
        token.onboardedAt = user.onboardedAt ?? null
      }
      // Re-read onboardedAt from DB when the client calls session.update()
      // so the middleware sees the updated value immediately after onboarding.
      if (trigger === "update" && token.id) {
        const fresh = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { onboardedAt: true },
        })
        if (fresh) {
          token.onboardedAt = fresh.onboardedAt ? fresh.onboardedAt.toISOString() : null
        }
      }
      return token
    },
  },
})
