const opt = (key: string, fallback = "") => process.env[key] || fallback

export const env = {
  // Auth
  NEXTAUTH_URL: opt("NEXTAUTH_URL", "http://localhost:3000"),

  // AI
  OPENAI_API_KEY: opt("OPENAI_API_KEY"),

  // Queue (Upstash QStash)
  QSTASH_TOKEN:               opt("QSTASH_TOKEN"),
  QSTASH_CURRENT_SIGNING_KEY: opt("QSTASH_CURRENT_SIGNING_KEY"),
  QSTASH_NEXT_SIGNING_KEY:    opt("QSTASH_NEXT_SIGNING_KEY"),

  // Cache (Upstash Redis)
  UPSTASH_REDIS_REST_URL:   opt("UPSTASH_REDIS_REST_URL"),
  UPSTASH_REDIS_REST_TOKEN: opt("UPSTASH_REDIS_REST_TOKEN"),

  // Email (SMTP / Resend)
  SMTP_HOST: opt("SMTP_HOST"),
  SMTP_PORT: opt("SMTP_PORT", "587"),
  SMTP_USER: opt("SMTP_USER"),
  SMTP_PASS: opt("SMTP_PASS"),
  SMTP_FROM: opt("SMTP_FROM", "RecallAI <noreply@recallai.app>"),

  // Background jobs
  CRON_SECRET: opt("CRON_SECRET"),

  NODE_ENV: opt("NODE_ENV", "development"),
} as const
