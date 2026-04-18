export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      {/* Tailwind smoke-test: indigo banner */}
      <div className="rounded-xl bg-indigo-600 px-8 py-4 text-white shadow-lg">
        <p className="text-sm font-medium tracking-wide uppercase">Tailwind ✓</p>
      </div>

      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">
          RecallAI
        </h1>
        <p className="mt-2 text-lg text-gray-500">
          AI-powered spaced repetition for CX teams
        </p>
      </div>
    </main>
  );
}
