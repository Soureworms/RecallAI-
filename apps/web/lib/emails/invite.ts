import { sendEmail } from "@/lib/email"
import { env } from "@/lib/env"

/**
 * Sends a welcome / account-setup email containing a password-reset link.
 * Used when an admin or super-admin creates a user account directly.
 */
export async function sendWelcomeEmail({
  name,
  email,
  role,
  token,
}: {
  name:  string
  email: string
  role:  string
  token: string
}): Promise<void> {
  const setupUrl = `${env.NEXTAUTH_URL}/reset-password/${token}`
  const roleNote =
    role !== "AGENT" ? ` with the <strong>${role}</strong> role` : ""

  await sendEmail({
    to: email,
    subject: "You've been invited to RecallAI",
    html: `
      <p>Hi ${name},</p>
      <p>A RecallAI account has been created for you${roleNote}.</p>
      <p><a href="${setupUrl}" style="color:#4f46e5;font-weight:bold">Set up your password and sign in</a></p>
      <p>This link expires in <strong>7 days</strong>.</p>
      <p>— The RecallAI team</p>
    `,
    text: [
      `You've been invited to RecallAI.`,
      ``,
      `Set your password here (expires in 7 days):`,
      setupUrl,
    ].join("\n"),
  })
}
