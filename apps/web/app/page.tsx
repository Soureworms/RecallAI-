import Link from "next/link"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <span className="text-xl font-bold text-indigo-600">RecallAI</span>
          <Link
            href="/login"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-sm font-medium text-indigo-700 mb-8">
          Built for enterprise CX teams
        </div>
        <h1 className="text-5xl font-extrabold tracking-tight text-gray-900 sm:text-6xl">
          Knowledge that{" "}
          <span className="text-indigo-600">actually sticks</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-xl text-gray-500 leading-relaxed">
          RecallAI turns your SOPs, product guides, and training documents into a
          daily review habit — powered by AI card generation and proven spaced
          repetition science.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="mailto:hello@recallai.app"
            className="rounded-xl bg-indigo-600 px-8 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
          >
            Request a demo
          </a>
          <Link
            href="/login"
            className="rounded-xl border border-gray-300 px-8 py-3.5 text-base font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Sign in to your workspace
          </Link>
        </div>
      </section>

      {/* Social proof strip */}
      <section className="border-y border-gray-100 bg-gray-50 py-10">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-gray-400 mb-6">
            Designed for teams that care about retention
          </p>
          <div className="flex flex-wrap justify-center gap-10 text-gray-400">
            {["SaaS Support", "Fintech CX", "E-commerce Ops", "Insurance Claims", "Retail Service"].map((t) => (
              <span key={t} className="text-sm font-medium">{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900">
            From document upload to confident agents — in minutes
          </h2>
          <p className="mt-4 text-lg text-gray-500">
            No manual card writing. No guessing what to train. RecallAI handles the full loop.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              step: "01",
              title: "Upload your knowledge base",
              desc: "Drop in PDFs, Word docs, or paste text. RecallAI parses your SOPs, policies, and training materials automatically.",
              icon: (
                <svg className="w-7 h-7 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              ),
            },
            {
              step: "02",
              title: "AI generates flashcards",
              desc: "Claude extracts the key facts, policies, and procedures from your documents and turns them into targeted Q&A cards — ready for review.",
              icon: (
                <svg className="w-7 h-7 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              ),
            },
            {
              step: "03",
              title: "Agents review daily",
              desc: "FSRS spaced repetition surfaces the right cards at the right time. 5–10 minutes a day builds lasting knowledge across your entire team.",
              icon: (
                <svg className="w-7 h-7 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ),
            },
          ].map((f) => (
            <div key={f.step} className="rounded-2xl border border-gray-200 bg-white p-8 hover:border-indigo-200 hover:shadow-md transition-all">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50">
                  {f.icon}
                </div>
                <span className="text-xs font-bold text-indigo-400 tracking-widest">STEP {f.step}</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats section */}
      <section className="bg-indigo-600 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: "5–10 min", label: "Daily review time" },
              { value: "90%+", label: "Retention at 30 days" },
              { value: "FSRS 5", label: "Algorithm powering reviews" },
              { value: "B2B only", label: "Built for teams, not individuals" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-3xl font-extrabold text-white">{stat.value}</p>
                <p className="mt-1 text-sm text-indigo-200">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How the platform works for admins */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Full control for your team leads
            </h2>
            <div className="space-y-5">
              {[
                {
                  title: "Manage your knowledge library",
                  desc: "Upload SOPs, review AI-generated cards, approve or edit before publishing to your team.",
                },
                {
                  title: "Invite and onboard your team",
                  desc: "Add team members by email. They receive a setup link and get started in minutes — no IT required.",
                },
                {
                  title: "Track knowledge gaps in real time",
                  desc: "See retention scores per topic, identify struggling agents, and prioritise your next training focus.",
                },
                {
                  title: "Mandatory and optional decks",
                  desc: "Mark critical policy decks as mandatory — they auto-assign to every team member and flag incomplete reviews.",
                },
              ].map((item) => (
                <div key={item.title} className="flex gap-3">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100">
                    <svg className="h-3 w-3 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 p-8 space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">CA</div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Customer Admin</p>
                <p className="text-xs text-gray-400">Acme Corp</p>
              </div>
            </div>
            {[
              { label: "Team members", value: "24", trend: "+3 this week" },
              { label: "Active decks", value: "8", trend: "2 pending review" },
              { label: "Avg. retention", value: "87%", trend: "↑ 4% vs last month" },
              { label: "Reviews today", value: "142", trend: "68% completion rate" },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <span className="text-sm text-gray-600">{row.label}</span>
                <div className="text-right">
                  <span className="text-sm font-bold text-gray-900">{row.value}</span>
                  <span className="ml-2 text-xs text-gray-400">{row.trend}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gray-50 border-t border-gray-100 py-20">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="text-3xl font-bold text-gray-900">Ready to close the knowledge gap?</h2>
          <p className="mt-4 text-lg text-gray-500">
            RecallAI is available on an annual contract for CX teams. Get in touch to discuss your team size and requirements.
          </p>
          <a
            href="mailto:hello@recallai.app"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
          >
            Get in touch
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="mx-auto max-w-6xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm font-bold text-indigo-600">RecallAI</span>
          <p className="text-sm text-gray-400">© {new Date().getFullYear()} RecallAI. All rights reserved.</p>
          <Link href="/login" className="text-sm text-gray-400 hover:text-gray-600">
            Sign in
          </Link>
        </div>
      </footer>
    </div>
  )
}
