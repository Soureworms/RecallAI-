export type DigestData = {
  name: string | null
  dueCount: number
  newCount: number
  deckSummaries: { name: string; newCards: number; dueCards: number }[]
  appUrl: string
}

export function dailyDigestEmail(d: DigestData): { subject: string; html: string; text: string } {
  const firstName = d.name?.split(" ")[0] ?? "there"
  const total = d.dueCount
  const hasNew = d.newCount > 0

  const subject = hasNew
    ? `${d.newCount} new card${d.newCount !== 1 ? "s" : ""} added: ${total} ready to review on RecallAI`
    : `${total} card${total !== 1 ? "s" : ""} ready for your review on RecallAI`

  // ── Deck rows ──────────────────────────────────────────────────────────────
  const deckRows = d.deckSummaries
    .map(
      (deck) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f0eee9;">
          <span style="font-size:14px;color:#1a1917;font-weight:500;">${escHtml(deck.name)}</span>
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #f0eee9;text-align:right;white-space:nowrap;">
          ${
            deck.newCards > 0
              ? `<span style="display:inline-block;background:#ede9fe;color:#5b21b6;font-size:11px;font-weight:600;padding:2px 8px;border-radius:999px;margin-right:6px;">${deck.newCards} new</span>`
              : ""
          }
          <span style="font-size:13px;color:#6b6a66;">${deck.dueCards} due</span>
        </td>
      </tr>`
    )
    .join("")

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>RecallAI: Daily Review</title>
</head>
<body style="margin:0;padding:0;background:#f7f5f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f5f2;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

          <!-- Logo -->
          <tr>
            <td style="padding-bottom:24px;text-align:center;">
              <span style="display:inline-flex;align-items:center;gap:8px;background:#1a1917;color:#ffffff;font-size:13px;font-weight:600;letter-spacing:-0.02em;padding:7px 14px;border-radius:8px;">
                recallai
              </span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:16px;border:1px solid #e8e4dc;padding:32px;">

              <!-- Greeting -->
              <p style="margin:0 0 6px;font-size:15px;font-weight:600;color:#1a1917;">Hi ${escHtml(firstName)},</p>
              <p style="margin:0 0 28px;font-size:14px;color:#6b6a66;line-height:1.5;">
                ${
                  hasNew
                    ? `New cards have been added to your training. Time to get ahead of the curve.`
                    : `Your daily study reminder. Consistent short sessions keep your knowledge sharp.`
                }
              </p>

              <!-- Hero stat -->
              <div style="background:#f7f5f2;border-radius:12px;padding:20px 24px;margin-bottom:28px;text-align:center;">
                <div style="font-size:48px;font-weight:700;letter-spacing:-0.04em;color:#1a1917;line-height:1;">${total}</div>
                <div style="font-size:13px;color:#6b6a66;margin-top:4px;">card${total !== 1 ? "s" : ""} to review today</div>
                ${
                  hasNew
                    ? `<div style="margin-top:10px;display:inline-block;background:#ede9fe;color:#5b21b6;font-size:12px;font-weight:600;padding:3px 10px;border-radius:999px;">${d.newCount} newly added</div>`
                    : ""
                }
              </div>

              <!-- Deck breakdown -->
              ${
                d.deckSummaries.length > 0
                  ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                      <thead>
                        <tr>
                          <th style="padding:0 0 8px;text-align:left;font-size:11px;font-weight:600;color:#9d9b96;text-transform:uppercase;letter-spacing:0.06em;">Deck</th>
                          <th style="padding:0 0 8px;text-align:right;font-size:11px;font-weight:600;color:#9d9b96;text-transform:uppercase;letter-spacing:0.06em;">Cards</th>
                        </tr>
                      </thead>
                      <tbody>${deckRows}</tbody>
                    </table>`
                  : ""
              }

              <!-- CTA -->
              <a href="${d.appUrl}/review"
                 style="display:block;text-align:center;background:#1a1917;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:14px 24px;border-radius:10px;letter-spacing:-0.01em;">
                Start Reviewing →
              </a>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9d9b96;line-height:1.6;">
                You're receiving this because you have an active RecallAI account.<br />
                <a href="${d.appUrl}/settings" style="color:#9d9b96;text-decoration:underline;">Manage notification settings</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  // Plain-text fallback
  const deckText = d.deckSummaries
    .map(
      (dk) =>
        `  - ${dk.name}: ${dk.dueCards} due${dk.newCards > 0 ? ` (${dk.newCards} new)` : ""}`
    )
    .join("\n")

  const text = `Hi ${firstName},

${
  hasNew
    ? `New cards have been added to your training. Time to review.`
    : `Your daily study reminder.`
}

You have ${total} card${total !== 1 ? "s" : ""} to review today${hasNew ? ` (${d.newCount} newly added)` : ""}.

${d.deckSummaries.length > 0 ? `Breakdown:\n${deckText}\n` : ""}
Review now: ${d.appUrl}/review

– The RecallAI team`

  return { subject, html, text }
}

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}
