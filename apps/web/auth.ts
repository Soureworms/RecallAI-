import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import type { Role } from "@prisma/client"
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
        if (typeof email !== "string" || typeof password !== "string") {
          return null
        }

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
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string
        token.role = user.role
        token.orgId = user.orgId
      }
      return token
    },
    session({ session, token }) {
      // token extends Record<string, unknown> in beta — explicit cast is required
      session.user.id = token.id as string
      session.user.role = token.role as Role
      session.user.orgId = token.orgId as string
      return session
    },
  },
})
