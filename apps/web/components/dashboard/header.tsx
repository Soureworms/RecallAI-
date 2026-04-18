"use client"

import { useSession, signOut } from "next-auth/react"
import { LogOut } from "lucide-react"

export function Header() {
  const { data: session } = useSession()
  const name = session?.user?.name ?? session?.user?.email ?? "User"

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 pl-14 md:pl-4">
      <span className="text-sm font-medium text-gray-700">{name}</span>
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      >
        <LogOut className="h-4 w-4" />
        Logout
      </button>
    </header>
  )
}
