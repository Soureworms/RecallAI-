/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV === "development"

// 'unsafe-eval' is only needed in dev (HMR / hot-reload).
// Production builds do not require it — removing it closes an XSS escalation path.
const scriptSrc = isDev
  ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
  : "script-src 'self' 'unsafe-inline'"

const nextConfig = {
  output: "standalone",
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse"],
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // ── Clickjacking & framing ──────────────────────────────────────
          { key: "X-Frame-Options",           value: "DENY" },

          // ── MIME sniffing ───────────────────────────────────────────────
          { key: "X-Content-Type-Options",    value: "nosniff" },

          // ── Referrer ────────────────────────────────────────────────────
          { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },

          // ── HSTS — enforce HTTPS for 2 years, include all subdomains ───
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },

          // ── Permissions — deny all browser feature APIs we don't use ───
          { key: "Permissions-Policy",        value: "camera=(), microphone=(), geolocation=(), payment=(), browsing-topics=()" },

          // ── DNS prefetch control ────────────────────────────────────────
          { key: "X-DNS-Prefetch-Control",    value: "off" },

          // ── Content Security Policy ─────────────────────────────────────
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              scriptSrc,
              "style-src 'self' 'unsafe-inline'",     // Next.js requires inline styles
              "img-src 'self' data: blob:",            // data: for avatars, blob: for previews
              "font-src 'self'",
              "connect-src 'self'",
              "worker-src 'self' blob:",
              "object-src 'none'",                    // block Flash / plugin content
              "base-uri 'self'",                      // prevent <base> tag hijacking
              "form-action 'self'",                   // restrict form submissions to same origin
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
