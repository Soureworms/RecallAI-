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
      <style>{`
        .hp-two-col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 48px;
          align-items: center;
        }
        .hp-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          text-align: center;
        }
        .hp-steps-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        .hp-shell {
          max-width: 960px;
          margin: 0 auto;
          padding-left: 28px;
          padding-right: 28px;
        }
        .hp-section {
          padding-top: 64px;
          padding-bottom: 64px;
        }
        @media (max-width: 680px) {
          .hp-shell {
            padding-left: 18px;
            padding-right: 18px;
          }
          .hp-two-col {
            grid-template-columns: 1fr;
            gap: 28px;
            align-items: start;
          }
          .hp-two-col-reverse > *:first-child {
            order: 2;
          }
          .hp-two-col-reverse > *:last-child {
            order: 1;
          }
          .hp-stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .hp-steps-grid {
            grid-template-columns: 1fr;
          }
          .hp-hero-title {
            font-size: 32px !important;
          }
          .hp-section-title {
            font-size: 22px !important;
          }
          .hp-section-h2 {
            font-size: 20px !important;
          }
          .hp-mobile-center {
            justify-content: center !important;
            text-align: center;
          }
        }
      `}</style>

      {/* Nav */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        borderBottom: "1px solid var(--ink-6)", background: "var(--paper)",
      }}>
        <div className="hp-shell" style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          paddingTop: 14, paddingBottom: 14,
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
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <a href="mailto:hello@recallai.app?subject=Trust%20Center%20Request" style={{
              fontSize: 12, fontWeight: 500, color: "var(--ink-3)",
              textDecoration: "none", borderBottom: "1px solid var(--ink-6)",
              paddingBottom: 1,
            }}>
              Trust Center
            </a>
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
          Grounded in cognitive science
        </div>

        <h1 className="hp-hero-title" style={{ fontSize: 42, fontWeight: 500, letterSpacing: "-0.03em", lineHeight: 1.1, color: "var(--ink-1)", margin: "0 0 20px" }}>
          Reduce ramp time and compliance risk across support, operations, clinical, and field teams.
        </h1>
        <p style={{ fontSize: 17, lineHeight: 1.6, color: "var(--ink-3)", margin: "0 0 36px", maxWidth: 620, marginLeft: "auto", marginRight: "auto" }}>
          RecallAI turns your SOPs and training docs into AI-generated flashcards with FSRS-powered review so people retain critical procedures and improve 30-day recall. FSRS has been benchmarked on hundreds of millions of real review events and consistently outperforms classic SM-2 style scheduling on predictive recall accuracy.
        </p>


        <div style={{
          margin: "0 auto 34px",
          maxWidth: 700,
          textAlign: "left",
          background: "var(--paper-sunken)",
          border: "1px solid var(--ink-6)",
          borderRadius: 12,
          padding: "14px 16px",
        }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-4)", marginBottom: 8 }}>
            Evidence behind FSRS
          </div>
          <ul style={{ margin: "0 0 0 18px", padding: 0, display: "grid", gap: 6 }}>
            <li style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.6 }}>
              <a href="https://github.com/open-spaced-repetition/srs-benchmark" target="_blank" rel="noreferrer" style={{ color: "var(--ink-2)" }}>Open Spaced Repetition benchmark</a> reports FSRS variants beating SM-2-family baselines across 10,000 collections and 519M+ evaluation reviews (with same-day reviews).
            </li>
            <li style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.6 }}>
              <a href="https://github.com/open-spaced-repetition/fsrs4anki/wiki" target="_blank" rel="noreferrer" style={{ color: "var(--ink-2)" }}>FSRS4Anki wiki</a> documents the algorithm, optimization process, and links to peer-reviewed spaced-repetition research by the same research line.
            </li>
            <li style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.6 }}>
              The <a href="https://docs.ankiweb.net/deck-options.html#fsrs" target="_blank" rel="noreferrer" style={{ color: "var(--ink-2)" }}>Anki manual</a> explains how FSRS schedules by predicted recall probability (retrievability) and desired retention, replacing older manual interval tuning.
            </li>
          </ul>
        </div>
        <div style={{ display: "grid", gap: 14, justifyContent: "center" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
            <a href="mailto:hello@recallai.app?subject=Book%20demo" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "11px 20px", borderRadius: 12,
              background: "var(--ink-1)", color: "var(--paper)",
              fontSize: 14, fontWeight: 500, textDecoration: "none",
            }}>
              Book demo
            </a>
            <a href="mailto:hello@recallai.app?subject=Platform%20Overview" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "11px 20px", borderRadius: 12,
              background: "transparent", color: "var(--ink-2)",
              border: "1px solid var(--ink-6)",
              fontSize: 14, fontWeight: 500, textDecoration: "none",
            }}>
              See platform overview
            </a>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div style={{ borderTop: "1px solid var(--ink-6)", maxWidth: 960, margin: "0 auto" }} />

      {/* How it works */}
      <section className="hp-shell hp-section">
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-4)", marginBottom: 12 }}>
            How it works
          </div>
          <h2 className="hp-section-title" style={{ fontSize: 28, fontWeight: 500, letterSpacing: "-0.02em", color: "var(--ink-1)", margin: 0 }}>
            From document to knowledgeable team, in minutes
          </h2>
        </div>

        <div className="hp-steps-grid">
          {[
            {
              step: "01",
              title: "Upload your knowledge base",
              desc: "Drop in PDFs, Word docs, or paste text. RecallAI parses your SOPs, policies, and training materials automatically.",
            },
            {
              step: "02",
              title: "AI generates flashcards",
              desc: "Claude reads your documents and extracts the key facts, procedures, and policies, turning them into targeted Q&A cards ready for review.",
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
        <div className="hp-shell hp-stats-grid" style={{ paddingTop: 32, paddingBottom: 32 }}>
          {[
            { value: "5–10 min", label: "Daily review time" },
            { value: "~80–90%",  label: "30-day retention (pilot cohort, n<50; preliminary)" },
            { value: "FSRS 5",   label: "Adaptive scheduling algorithm" },
            { value: "Any doc",  label: "PDF, Word, or plain text" },
          ].map((s) => (
            <div key={s.label}>
              <div style={{ fontSize: 24, fontWeight: 500, letterSpacing: "-0.02em", color: "var(--ink-1)" }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
        <div className="hp-shell" style={{ paddingTop: 0, paddingBottom: 20 }}>
          <p style={{ fontSize: 11, color: "var(--ink-4)", margin: 0, textAlign: "center" }}>
            How measured: Early indicators based on internal pilot usage and product telemetry; methodology and sample details will be published at
            {" "}<a href="/methodology" style={{ color: "var(--ink-3)", textDecoration: "underline" }}>Methodology</a>.
          </p>
        </div>
      </div>

      {/* FSRS section */}
      <section className="hp-shell hp-section">
        <div className="hp-two-col">
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-4)", marginBottom: 12 }}>
              The science of remembering
            </div>
            <h2 className="hp-section-h2" style={{ fontSize: 24, fontWeight: 500, letterSpacing: "-0.02em", color: "var(--ink-1)", marginBottom: 14 }}>
              Why most training doesn&apos;t stick, and why FSRS does
            </h2>
            <p style={{ fontSize: 14, color: "var(--ink-3)", lineHeight: 1.7, marginBottom: 20 }}>
              Without reinforcement, people forget up to 70% of new information within 24 hours. Workshops, slide decks, and one-off sessions create the illusion of learning without producing lasting results.
            </p>
            <p style={{ fontSize: 14, color: "var(--ink-3)", lineHeight: 1.7, marginBottom: 28 }}>
              FSRS (Free Spaced Repetition Scheduler) is an open-source memory algorithm built on decades of cognitive science research. It tracks retention at the individual level (for each card, for each person) and estimates the next review window before predicted forgetting occurs.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { title: "Adapts to each person", desc: "Review intervals adjust to individual memory curves, not a fixed schedule." },
                { title: "Timing-aware reviews", desc: "Reviews are scheduled based on recall probability estimates, not a fixed interval." },
                { title: "Knowledge that compounds", desc: "Each review strengthens the memory trace. Retention improves over time, not in spite of it." },
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

          {/* Retention comparison visual (illustrative) */}
          <div style={{
            background: "var(--paper-raised)", border: "1px solid var(--ink-6)",
            borderRadius: 16, padding: 24, boxShadow: "var(--shadow-2)",
          }}>
            {/* Without FSRS */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-2)", marginBottom: 2 }}>Without spaced repetition</div>
              <div style={{ fontSize: 12, color: "var(--ink-4)", marginBottom: 16 }}>Retention fades within days of training</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 80 }}>
                {[
                  { pct: 100, label: "Day 0" },
                  { pct: 58,  label: "Day 1" },
                  { pct: 33,  label: "Day 3" },
                  { pct: 19,  label: "Day 7" },
                  { pct: 11,  label: "Day 14" },
                ].map(({ pct, label }) => (
                  <div key={label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--ink-3)", fontWeight: 500 }}>{pct}%</span>
                    <div style={{
                      width: "100%", height: `${pct * 0.6}px`,
                      background: pct === 100 ? "var(--ink-2)" : "var(--ink-6)",
                      borderRadius: "3px 3px 0 0",
                    }} />
                    <span style={{ fontSize: 9, color: "var(--ink-4)", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ borderTop: "1px solid var(--ink-6)", paddingTop: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-2)", marginBottom: 2 }}>With FSRS</div>
              <div style={{ fontSize: 12, color: "var(--ink-4)", marginBottom: 6 }}>Illustrative trajectory (not a production benchmark)</div>
              <div style={{ fontSize: 11, color: "var(--ink-4)", marginBottom: 16 }}>Timely reviews can support stronger retention over time when review compliance is high.</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 80 }}>
                {[
                  { pct: 100, label: "Day 0" },
                  { pct: 91,  label: "Day 1" },
                  { pct: 93,  label: "Day 3" },
                  { pct: 88,  label: "Day 7" },
                  { pct: 92,  label: "Day 14" },
                ].map(({ pct, label }) => (
                  <div key={label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--green-700, #15803d)", fontWeight: 500 }}>{pct}%</span>
                    <div style={{
                      width: "100%", height: `${pct * 0.6}px`,
                      background: "var(--green-500, #22c55e)",
                      borderRadius: "3px 3px 0 0",
                      opacity: 0.85,
                    }} />
                    <span style={{ fontSize: 9, color: "var(--ink-4)", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div style={{ marginTop: 28, textAlign: "center" }}>
          <a href="mailto:hello@recallai.app?subject=Pricing%20and%20Rollout" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "10px 18px", borderRadius: 12,
            border: "1px solid var(--ink-6)",
            background: "var(--paper-raised)", color: "var(--ink-2)",
            textDecoration: "none", fontSize: 13, fontWeight: 500,
          }}>
            Talk pricing and rollout
          </a>
        </div>
      </section>

      {/* Divider */}
      <div style={{ borderTop: "1px solid var(--ink-6)", maxWidth: 960, margin: "0 auto" }} />

      {/* Team management features */}
      <section className="hp-shell hp-section">
        <div className="hp-two-col hp-two-col-reverse">
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-4)", marginBottom: 12 }}>
              For team leads
            </div>
            <h2 className="hp-section-h2" style={{ fontSize: 24, fontWeight: 500, letterSpacing: "-0.02em", color: "var(--ink-1)", marginBottom: 20 }}>
              Full visibility over your team&apos;s knowledge
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { title: "Manage your knowledge library", desc: "Upload documents, review AI-generated cards, and approve them before publishing to your team." },
                { title: "Onboard new members instantly", desc: "Invite by email. New members receive a setup link and are reviewing within minutes." },
                { title: "Spot knowledge gaps early",     desc: "Retention scores per topic show exactly where the team is confident and where they are not." },
                { title: "Mandatory decks",               desc: "Mark critical policy decks as required; they auto-assign to every team member on join." },
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
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-1)" }}>Sarah L., Team Lead</div>
                <div style={{ fontSize: 11, color: "var(--ink-3)" }}>Acme Support</div>
              </div>
            </div>
            {[
              { label: "Team members",  value: "24",  note: "+3 this week" },
              { label: "Active decks",  value: "8",   note: "2 pending review" },
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

      {/* Divider */}
      <div style={{ borderTop: "1px solid var(--ink-6)", maxWidth: 960, margin: "0 auto" }} />

      {/* Enterprise operations fit */}
      <section className="hp-shell hp-section">
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-4)", marginBottom: 12 }}>
            Enterprise readiness
          </div>
          <h2 className="hp-section-title" style={{ fontSize: 28, fontWeight: 500, letterSpacing: "-0.02em", color: "var(--ink-1)", margin: "0 0 14px" }}>
            Built for enterprise operations
          </h2>
          <p style={{ fontSize: 15, color: "var(--ink-3)", margin: "0 auto", maxWidth: 620, lineHeight: 1.6 }}>
            Align rollout, governance, and identity with your existing operating model.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {[
            {
              title: "Identity and access",
              points: [
                "SSO authentication for managed enterprise sign-in.",
                "SAML and OIDC identity provider integration.",
                "Role provisioning and deprovisioning workflows for admins and managers.",
              ],
            },
            {
              title: "Data flow and lifecycle",
              points: [
                "Ingests documents you upload (PDF, Word, plain text) and parses them into reviewable card content.",
                "Stores extracted knowledge, card history, and review telemetry scoped by organisation.",
                "Retention and deletion controls for content lifecycle and account closure workflows.",
              ],
            },
            {
              title: "Admin controls",
              points: [
                "Hard organisation isolation on data access paths to prevent cross-tenant exposure.",
                "Role-based permissions for Agent, Manager, Admin, and Super Admin actions.",
                "Admin-facing audit trails for content changes, role updates, and policy-sensitive actions.",
              ],
            },
            {
              title: "Rollout model",
              points: [
                "Pilot: start with one team and a bounded set of SOP decks.",
                "Team rollout: expand to adjacent teams with manager-level oversight and required decks.",
                "Org expansion: scale with formal governance, identity integration, and security review.",
              ],
            },
          ].map((item) => (
            <div key={item.title} style={{
              background: "var(--paper-raised)", border: "1px solid var(--ink-6)",
              borderRadius: 16, padding: "20px 20px 18px",
            }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-4)", marginBottom: 10 }}>
                {item.title}
              </div>
              <ul style={{ margin: "0 0 0 18px", padding: 0, display: "grid", gap: 8 }}>
                {item.points.map((point) => (
                  <li key={point} style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.55 }}>{point}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div style={{
          marginTop: 24,
          border: "1px solid var(--ink-6)",
          borderRadius: 14,
          padding: "16px 18px",
          background: "var(--paper-sunken)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}>
          <p style={{ margin: 0, fontSize: 13, color: "var(--ink-3)", lineHeight: 1.6 }}>
            Need a deeper architecture walkthrough or help mapping controls to your procurement checklist?
          </p>
          <a href="mailto:hello@recallai.app?subject=Security%20and%20Sales%20Engineering%20Discussion" style={{
            display: "inline-flex", alignItems: "center",
            padding: "9px 14px", borderRadius: 10,
            border: "1px solid var(--ink-6)",
            color: "var(--ink-2)", textDecoration: "none",
            fontSize: 12, fontWeight: 500, background: "var(--paper-raised)",
          }}>
            Talk to security/sales engineering
          </a>
        </div>
      </section>

      {/* Divider */}
      <div style={{ borderTop: "1px solid var(--ink-6)", maxWidth: 960, margin: "0 auto" }} />

      {/* Security section */}
      <section className="hp-shell hp-section">
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-4)", marginBottom: 12 }}>
            Security &amp; privacy
          </div>
          <h2 className="hp-section-title" style={{ fontSize: 28, fontWeight: 500, letterSpacing: "-0.02em", color: "var(--ink-1)", margin: "0 0 14px" }}>
            Enterprise-grade security, by design
          </h2>
          <p style={{ fontSize: 15, color: "var(--ink-3)", margin: "0 auto", maxWidth: 560, lineHeight: 1.6 }}>
            Your SOPs and training materials are sensitive. We organize our security program into clear trust pillars with concrete controls and auditable proof artifacts.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {[
            {
              pillar: "Data Protection",
              value: "Your content stays confidential and segregated from other organizations at every stage of processing.",
              controls: [
                "TLS 1.3 encryption for data in transit.",
                "Extracted text is encrypted at rest and scoped to your organisation.",
                "Hard organisation ID scoping on all data-access paths.",
              ],
              proof: "Proof artifacts: data flow diagram, encryption key management summary, tenant-isolation test evidence.",
            },
            {
              pillar: "Access Control",
              value: "Only the right people can access the right actions, with permissions aligned to role and risk.",
              controls: [
                "Role-based access control across Agent, Manager, Admin, and Super Admin roles.",
                "Managers and above control document upload and card publication actions.",
                "Signed httpOnly session cookies and single-use password reset tokens (1-hour expiry).",
              ],
              proof: "Proof artifacts: role-permission matrix, auth/session control spec, access-review checklist.",
            },
            {
              pillar: "Application Security",
              value: "The platform is designed to reduce abuse and malicious payload risk before it reaches business logic.",
              controls: [
                "Magic-byte file signature verification blocks disguised uploads before parsing.",
                "Per-user rate limiting on all API endpoints with tighter limits for login/reset/upload routes.",
                "Password hashing with bcrypt (12 salt rounds).",
              ],
              proof: "Proof artifacts: secure upload validation test logs, API abuse-throttling policy, password storage standard.",
            },
            {
              pillar: "Compliance & Governance",
              value: "Security operations are backed by documented policies, accountability, and customer-facing transparency.",
              controls: [
                "Documented incident response process with defined escalation and communication paths.",
                "Published privacy and data-processing terms for enterprise review.",
                "Versioned security documentation and control ownership records.",
              ],
              proof: "Proof artifacts: incident response summary, policy register, governance review cadence and owners.",
            },
          ].map((item) => (
            <div key={item.pillar} style={{
              background: "var(--paper-raised)", border: "1px solid var(--ink-6)",
              borderLeft: "3px solid var(--blue-100)",
              borderRadius: 16, padding: "20px 20px 18px",
            }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-4)", marginBottom: 8 }}>
                {item.pillar}
              </div>
              <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6, marginBottom: 12 }}>{item.value}</div>
              <ul style={{ margin: "0 0 10px 18px", padding: 0, display: "grid", gap: 6 }}>
                {item.controls.map((control) => (
                  <li key={control} style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.55 }}>{control}</li>
                ))}
              </ul>
              <div style={{ fontSize: 11, color: "var(--ink-4)", lineHeight: 1.5 }}>{item.proof}</div>
            </div>
          ))}
        </div>

        <div style={{
          marginTop: 28,
          background: "var(--paper-sunken)",
          border: "1px solid var(--ink-6)",
          borderRadius: 14,
          padding: "20px 22px",
        }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-4)", marginBottom: 10 }}>
            Trust Center
          </div>
          <div style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 14, lineHeight: 1.6 }}>
            Need details for procurement or security review? Request our trust documentation package.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10, marginBottom: 16 }}>
            {[
              "Security overview",
              "DPA / privacy terms",
              "Subprocessor list",
              "Incident response summary",
              "Certification status",
            ].map((artifact) => (
              <div key={artifact} style={{ fontSize: 12, color: "var(--ink-2)", padding: "10px 12px", background: "var(--paper-raised)", border: "1px solid var(--ink-6)", borderRadius: 10 }}>
                {artifact}
              </div>
            ))}
          </div>
          <a href="mailto:hello@recallai.app?subject=Security%20Review%20Request" style={{ display: "inline-flex", alignItems: "center", padding: "9px 14px", borderRadius: 10, border: "1px solid var(--ink-6)", color: "var(--ink-2)", textDecoration: "none", fontSize: 12, fontWeight: 500 }}>
            Review security
          </a>
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
            Book demo
          </a>
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: "1px solid var(--ink-6)", padding: "20px 0" }}>
        <div className="hp-shell" style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10,
        }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-3)", letterSpacing: "-0.01em" }}>
            recall<span style={{ color: "var(--ink-5)" }}>ai</span>
          </span>
          <span style={{ fontSize: 12, color: "var(--ink-4)" }}>
            © {new Date().getFullYear()} RecallAI. All rights reserved.
          </span>
          <div className="hp-mobile-center" style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <a href="mailto:hello@recallai.app?subject=Trust%20Center%20Request" style={{ fontSize: 12, color: "var(--ink-3)", textDecoration: "none" }}>Trust Center</a>
            <a href="/security" style={{ fontSize: 12, color: "var(--ink-4)", textDecoration: "none" }}>Security</a>
            <a href="/privacy" style={{ fontSize: 12, color: "var(--ink-4)", textDecoration: "none" }}>Privacy Policy</a>
            <a href="/terms" style={{ fontSize: 12, color: "var(--ink-4)", textDecoration: "none" }}>Terms</a>
            <a href="/dpa" style={{ fontSize: 12, color: "var(--ink-4)", textDecoration: "none" }}>Data Processing Addendum</a>
            <a href="/subprocessors" style={{ fontSize: 12, color: "var(--ink-4)", textDecoration: "none" }}>Subprocessors</a>
            <Link href="/login" style={{ fontSize: 12, color: "var(--ink-4)", textDecoration: "none" }}>Sign in</Link>
          </div>
        </div>
      </div>

    </div>
  )
}
