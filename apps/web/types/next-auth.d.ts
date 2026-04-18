import type { Role } from "@prisma/client"
import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: Role
      orgId: string
    } & DefaultSession["user"]
  }

  interface User {
    role: Role
    orgId: string
  }
}

// next-auth/jwt re-exports @auth/core/jwt — augment the source module
declare module "@auth/core/jwt" {
  interface JWT {
    id: string
    role: Role
    orgId: string
  }
}
