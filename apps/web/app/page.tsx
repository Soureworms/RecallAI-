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
          Powered by memory science
        </div>

        <h1 style={{ fontSize: 42, fontWeight: 500, letterSpacing: "-0.03em", lineHeight: 1.1, color: "var(--ink-1)", margin: "0 0 20px" }}>
          Knowledge that actually sticks
        </h1>
        <p style={{ fontSize: 17, lineHeight: 1.6, color: "var(--ink-3)", margin: "0 0 36px", maxWidth: 540, marginLeft: "auto", marginRight: "auto" }}>
          RecallAI turns your documents, SOPs, and training materials into a daily 5-minute review habit — using AI to generate flashcards and FSRS to make sure your team retains them.
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
            From document to knowledgeable team — in minutes
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
          {[
            {
              step: "01",
              title: "Upload your knowledge base",
              desc: "Drop in PDFs, Word docs, or paste text. RecallAI parses your SOPs, policies, and training materials automatically.",
            },
            {
              step: "02",
              title: "AI generates flashcards",
              desc: "Claude reads your documents and extracts the key facts, procedures, and policies — turning them into targeted Q&A cards ready for review.",
            },
            {
              step: "03",
              title: "Your team reviews daily",
              desc: "5–10 minutes a day. FSRS surfaces the right cards at the right time for each person, building lasting knowledge across your whole team.",
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
            { value: "FSRS 5",    label: "Adaptive scheduling algorithm" },
            { value: "Any doc",   label: "PDF, Word, or plain text" },
          ].map((s) => (
            <div key={s.label}>
              <div style={{ fontSize: 24, fontWeight: 500, letterSpacing: "-0.02em", color: "var(--ink-1)" }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* FSRS section */}
      <section style={{ maxWidth: 960, margin: "0 auto", padding: "64px 28px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "start" }}>
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-4)", marginBottom: 12 }}>
              The science of remembering
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 500, letterSpacing: "-0.02em", color: "var(--ink-1)", marginBottom: 14 }}>
              Why most training doesn&apos;t stick — and why FSRS does
            </h2>
            <p style={{ fontSize: 14, color: "var(--ink-3)", lineHeight: 1.7, marginBottom: 24 }}>
              Without reinforcement, people forget up to 70% of new information within 24 hours. Workshops, slide decks, and one-off sessions create the illusion of learning — without lasting results.
            </p>
            <p style={{ fontSize: 14, color: "var(--ink-3)", lineHeight: 1.7, marginBottom: 28 }}>
              FSRS (Free Spaced Repetition Scheduler) is an open-source memory algorithm built on decades of cognitive science research. It tracks retention at the individual level — for each card, for each person — and schedules the next review at the precise moment before forgetting occurs.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { title: "Adapts to each person", desc: "Review intervals adjust to individual memory curves, not a fixed schedule." },
                { title: "Perfectly timed reviews", desc: "You only see a card when you need to — never too early, never too late." },
                { title: "Knowledge that compounds", desc: "Each review strengthens the memory trace. Retention improves over time, not in spite of time." },
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

          {/* Memory curve visual */}
          <div style={{
            background: "var(--paper-raised)", border: "1px solid var(--ink-6)",
            borderRadius: 16, padding: 24, boxShadow: "var(--shadow-2)",
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-2)", marginBottom: 4 }}>Without spaced repetition</div>
            <div style={{ fontSize: 12, color: "var(--ink-4)", marginBottom: 16 }}>Knowledge fades rapidly after training</div>
            <div style={{ position: "relative", height: 56, marginBottom: 24 }}>
              {[100, 58, 33, 19, 11].map((pct, i) => (
                <div key={i} style={{
                  position: "absolute", bottom: 0,
                  left: `${i * 22}%`, width: "16%",
                  height: `${pct}%`,
                  background: i === 0 ? "var(--ink-2)" : "var(--ink-6)",
                  borderRadius: "4px 4px 0 0",
                  display: "flex", alignItems: "flex-start", justifyContent: "center",
                  paddingTop: 4,
                }}>
                  <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: i === 0 ? "var(--paper)" : "var(--ink-4)" }}>{pct}%</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 4, marginBottom: 24, fontSize: 10, color: "var(--ink-4)", fontFamily: "var(--font-mono)" }}>
              {["Day 0", "Day 1", "Day 3", "Day 7", "Day 14"].map((d) => (
                <span key={d} style={{ flex: 1, textAlign: "center" }}>{d}</span>
              ))}
            </div>

            <div style={{ borderTop: "1px solid var(--ink-6)", paddingTop: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-2)", marginBottom: 4 }}>With FSRS</div>
              <div style={{ fontSize: 12, color: "var(--ink-4)", marginBottom: 16 }}>Reviews keep retention consistently high</div>
              <div style={{ position: "relative", height: 56 }}>
                {[100, 91, 93, 88, 92].map((pct, i) => (
                  <div key={i} style={{
                    position: "absolute", bottom: 0,
                    left: `${i * 22}%`, width: "16%",
                    height: `${pct}%`,
                    background: "var(--green-500)",
                    borderRadius: "4px 4px 0 0",
                    opacity: 0.85,
                    display: "flex", alignItems: "flex-start", justifyContent: "center",
                    paddingTop: 4,
                  }}>
                    <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--paper)" }}>{pct}%</span>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 4, marginTop: 6, fontSize: 10, color: "var(--ink-4)", fontFamily: "var(--font-mono)" }}>
                {["Day 0", "Day 1", "Day 3", "Day 7", "Day 14"].map((d) => (
                  <span key={d} style={{ flex: 1, textAlign: "center" }}>{d}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div style={{ borderTop: "1px solid var(--ink-6)", maxWidth: 960, margin: "0 auto" }} />

      {/* Team management features */}
      <section style={{ maxWidth: 960, margin: "0 auto", padding: "64px 28px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "start" }}>
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-4)", marginBottom: 12 }}>
              For team leads
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 500, letterSpacing: "-0.02em", color: "var(--ink-1)", marginBottom: 20 }}>
              Full visibility over your team&apos;s knowledge
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { title: "Manage your knowledge library", desc: "Upload documents, review AI-generated cards, and approve them before publishing to your team." },
                { title: "Onboard new members instantly",  desc: "Invite by email. New members receive a setup link and are reviewing within minutes." },
                { title: "Spot knowledge gaps early",      desc: "Retention scores per topic show exactly where the team is confident — and where they're not." },
                { title: "Mandatory decks",                desc: "Mark critical policy decks as required — they auto-assign to every team member on join." },
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
              }}>SL</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-1)" }}>Sarah L. — Team Lead</div>
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
            Ready to build a team that remembers?
          </h2>
          <p style={{ fontSize: 14, color: "var(--ink-3)", lineHeight: 1.7, marginBottom: 28 }}>
            Get in touch to see RecallAI in action with your own documents and team.
          </p>
          <a href="mailto:hello@recallai.app" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "11px 20px", borderRadius: 12,
            background: "var(--ink-1)", color: "var(--paper)",
            fontSize: 14, fontWeight: 500, textDecoration: "none",
          }}>
            Request a demo
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
