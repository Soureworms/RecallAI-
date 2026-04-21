import Link from "next/link"

function LogoMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M5 7.5 A7 7 0 0 1 18 9.5" />
      <path d="M19 16.5 A7 7 0 0 1 6 14.5" />
      <circle cx="18" cy="9.5" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="6" cy="14.5" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  )
}

export default function HomePage() {
  return (
    <div style={{ background: "var(--paper)", minHeight: "100vh", fontFamily: "var(--font-sans)" }}>

      {/* Nav */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        borderBottom: "1px solid var(--ink-6)", background: "var(--paper)",
      }}>
        <div style={{
          maxWidth: 960, margin: "0 auto",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 28px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: "var(--ink-1)", color: "var(--paper)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <LogoMark size={16} />
            </div>
            <span style={{ fontSize: 15, fontWeight: 500, letterSpacing: "-0.02em", color: "var(--ink-1)" }}>
              recall<span style={{ color: "var(--ink-3)" }}>ai</span>
            </span>
          </div>
          <Link href="/login" style={{
            display: "inline-flex", alignItems: "center",
            padding: "7px 14px", borderRadius: 10,
            background: "var(--ink-1)", color: "var(--paper)",
            fontSize: 13, fontWeight: 500, textDecoration: "none",
            border: "1px solid transparent",
          }}>
            Sign in
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section style={{ maxWidth: 720, margin: "0 auto", padding: "80px 28px 72px", textAlign: "center" }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "4px 12px", borderRadius: 999,
          background: "var(--paper-sunken)", border: "1px solid var(--ink-6)",
          fontSize: 12, fontWeight: 500, color: "var(--ink-3)",
          marginBottom: 28,
        }}>
          Built for enterprise CX teams
        </div>

        <h1 style={{ fontSize: 42, fontWeight: 500, letterSpacing: "-0.03em", lineHeight: 1.1, color: "var(--ink-1)", margin: "0 0 20px" }}>
          Knowledge that actually sticks
        </h1>
        <p style={{ fontSize: 17, lineHeight: 1.6, color: "var(--ink-3)", margin: "0 0 36px", maxWidth: 540, marginLeft: "auto", marginRight: "auto" }}>
          RecallAI turns your SOPs, product guides, and training docs into a daily 5-minute review habit — powered by AI card generation and FSRS spaced repetition.
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
          <a href="mailto:hello@recallai.app" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "11px 20px", borderRadius: 12,
            background: "var(--ink-1)", color: "var(--paper)",
            fontSize: 14, fontWeight: 500, textDecoration: "none",
          }}>
            Request a demo
          </a>
          <Link href="/login" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "11px 20px", borderRadius: 12,
            background: "transparent", color: "var(--ink-2)",
            border: "1px solid var(--ink-6)",
            fontSize: 14, fontWeight: 500, textDecoration: "none",
          }}>
            Sign in to your workspace
          </Link>
        </div>
      </section>

      {/* Divider */}
      <div style={{ borderTop: "1px solid var(--ink-6)", maxWidth: 960, margin: "0 auto" }} />

      {/* How it works */}
      <section style={{ maxWidth: 960, margin: "0 auto", padding: "64px 28px" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-4)", marginBottom: 12 }}>
            How it works
          </div>
          <h2 style={{ fontSize: 28, fontWeight: 500, letterSpacing: "-0.02em", color: "var(--ink-1)", margin: 0 }}>
            From document to confident agent — in minutes
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
          {[
            {
              step: "01",
              title: "Upload your knowledge base",
              desc: "Drop in PDFs or paste text. RecallAI parses your SOPs, policies, and training materials.",
            },
            {
              step: "02",
              title: "AI generates flashcards",
              desc: "Claude extracts key facts, policies, and procedures — turning them into targeted Q&A cards ready for review.",
            },
            {
              step: "03",
              title: "Agents review daily",
              desc: "5–10 minutes a day. FSRS surfaces the right cards at the right time, building lasting knowledge across your team.",
            },
          ].map((item) => (
            <div key={item.step} style={{
              background: "var(--paper-raised)", border: "1px solid var(--ink-6)",
              borderRadius: 16, padding: "20px 20px 18px",
            }}>
              <div style={{
                fontFamily: "var(--font-mono)", fontSize: 10,
                letterSpacing: "0.08em", textTransform: "uppercase",
                color: "var(--ink-4)", marginBottom: 10,
              }}>
                Step {item.step}
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink-1)", marginBottom: 8 }}>{item.title}</div>
              <div style={{ fontSize: 13, color: "var(--ink-3)", lineHeight: 1.6 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Stats strip */}
      <div style={{ borderTop: "1px solid var(--ink-6)", borderBottom: "1px solid var(--ink-6)", background: "var(--paper-sunken)" }}>
        <div style={{
          maxWidth: 960, margin: "0 auto", padding: "32px 28px",
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16,
          textAlign: "center",
        }}>
          {[
            { value: "5–10 min",  label: "Daily review time" },
            { value: "90%+",      label: "Retention at 30 days" },
            { value: "FSRS 5",    label: "Algorithm powering reviews" },
            { value: "B2B only",  label: "Built for teams" },
          ].map((s) => (
            <div key={s.label}>
              <div style={{ fontSize: 24, fontWeight: 500, letterSpacing: "-0.02em", color: "var(--ink-1)" }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Admin features */}
      <section style={{ maxWidth: 960, margin: "0 auto", padding: "64px 28px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "start" }}>
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-4)", marginBottom: 12 }}>
              For team leads
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 500, letterSpacing: "-0.02em", color: "var(--ink-1)", marginBottom: 20 }}>
              Full control for your knowledge base
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { title: "Manage your knowledge library", desc: "Upload SOPs, review AI-generated cards, approve before publishing." },
                { title: "Invite and onboard your team",  desc: "Add team members by email. They receive a setup link and get started in minutes." },
                { title: "Track knowledge gaps",          desc: "See retention scores per topic. Identify struggling agents, prioritise next training." },
                { title: "Mandatory decks",               desc: "Mark critical policy decks as mandatory — they auto-assign to every team member." },
              ].map((item) => (
                <div key={item.title} style={{ display: "flex", gap: 10 }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: 999,
                    background: "var(--paper-sunken)", border: "1px solid var(--ink-6)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, marginTop: 1,
                  }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--green-600)" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-1)" }}>{item.title}</div>
                    <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2, lineHeight: 1.5 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mock admin panel */}
          <div style={{
            background: "var(--paper-raised)", border: "1px solid var(--ink-6)",
            borderRadius: 16, padding: 20, boxShadow: "var(--shadow-2)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 999,
                background: "var(--violet-100)", color: "var(--violet-ink)",
                fontSize: 11, fontWeight: 600,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>CA</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-1)" }}>Customer admin</div>
                <div style={{ fontSize: 11, color: "var(--ink-3)" }}>Acme Support</div>
              </div>
            </div>
            {[
              { label: "Team members", value: "24", note: "+3 this week" },
              { label: "Active decks",  value: "8",  note: "2 pending review" },
              { label: "Avg. retention", value: "87%", note: "↑ 4% vs last month" },
              { label: "Reviews today", value: "142", note: "68% completion rate" },
            ].map((row) => (
              <div key={row.label} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 0", borderBottom: "1px solid var(--ink-6)",
              }}>
                <span style={{ fontSize: 13, color: "var(--ink-3)" }}>{row.label}</span>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-1)" }}>{row.value}</span>
                  <span style={{ fontSize: 11, color: "var(--ink-4)", marginLeft: 8 }}>{row.note}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <div style={{ borderTop: "1px solid var(--ink-6)", background: "var(--paper-sunken)" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "64px 28px", textAlign: "center" }}>
          <h2 style={{ fontSize: 24, fontWeight: 500, letterSpacing: "-0.02em", color: "var(--ink-1)", marginBottom: 12 }}>
            Ready to close the knowledge gap?
          </h2>
          <p style={{ fontSize: 14, color: "var(--ink-3)", lineHeight: 1.6, marginBottom: 28 }}>
            RecallAI is available on an annual contract for CX teams. Get in touch to discuss your requirements.
          </p>
          <a href="mailto:hello@recallai.app" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "11px 20px", borderRadius: 12,
            background: "var(--ink-1)", color: "var(--paper)",
            fontSize: 14, fontWeight: 500, textDecoration: "none",
          }}>
            Get in touch
          </a>
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: "1px solid var(--ink-6)", padding: "20px 28px" }}>
        <div style={{
          maxWidth: 960, margin: "0 auto",
          display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10,
        }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-3)", letterSpacing: "-0.01em" }}>
            recall<span style={{ color: "var(--ink-5)" }}>ai</span>
          </span>
          <span style={{ fontSize: 12, color: "var(--ink-4)" }}>
            © {new Date().getFullYear()} RecallAI. All rights reserved.
          </span>
          <Link href="/login" style={{ fontSize: 12, color: "var(--ink-4)", textDecoration: "none" }}>Sign in</Link>
        </div>
      </div>

    </div>
  )
}
