"use server"

import { AuthError } from "next-auth"
import { signIn } from "@/auth"

export async function loginAction(
  _prev: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  try {
    await signIn("credentials", {
      email:      formData.get("email"),
      password:   formData.get("password"),
      rememberMe: formData.get("rememberMe") === "on" ? "true" : "false",
      redirectTo: "/dashboard",
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return "Invalid email or password."
    }
    throw error // re-throw NEXT_REDIRECT
  }
}
