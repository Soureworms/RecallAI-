import nodemailer from "nodemailer"

function createTransport() {
  const host = process.env.SMTP_HOST
  const port = parseInt(process.env.SMTP_PORT ?? "587", 10)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !user || !pass) return null

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })
}

export async function sendEmail(opts: {
  to: string
  subject: string
  html: string
  text: string
}): Promise<void> {
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "noreply@recallai.app"
  const transport = createTransport()

  if (!transport) {
    // Dev fallback: log to console so the flow can be tested without SMTP
    console.log("\n──────────────────────────────────────────────")
    console.log(`📧  EMAIL (dev mode — SMTP not configured)`)
    console.log(`To:      ${opts.to}`)
    console.log(`Subject: ${opts.subject}`)
    console.log(opts.text)
    console.log("──────────────────────────────────────────────\n")
    return
  }

  await transport.sendMail({ from, ...opts })
}
