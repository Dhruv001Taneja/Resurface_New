
import Link from "next/link";

const features = [
  {
    number: "01",
    icon: "✦",
    title: "OCR & Vision AI",
    description:
      "Turn screenshots, receipts, conversations, and documents into searchable information.",
  },
  {
    number: "02",
    icon: "⌕",
    title: "Semantic Search",
    description:
      "Find what you remember using natural language instead of searching file by file.",
  },
  {
    number: "03",
    icon: "◈",
    title: "AI Knowledge Assistant",
    description:
      "Explore your saved information and get contextual answers from your screenshot library.",
  },
  {
    number: "04",
    icon: "◷",
    title: "Smart Reminders",
    description:
      "Keep track of detected dates, upcoming events, and important deadlines.",
  },
  {
    number: "05",
    icon: "⧉",
    title: "Smart Organization",
    description:
      "Keep your visual memories organized and identify duplicate screenshots.",
  },
  {
    number: "06",
    icon: "⬡",
    title: "Secure Vault",
    description:
      "Keep sensitive screenshots and private information in a dedicated vault.",
  },
];

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500 text-lg font-black text-white shadow-lg shadow-violet-500/25">
        R
      </span>
      <span className="text-xl font-bold tracking-tight text-white">
        ReSurface<span className="text-violet-400">.</span>
      </span>
    </Link>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#080b14] text-white selection:bg-violet-500/30">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-64 left-1/2 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-violet-600/10 blur-[140px]" />
        <div className="absolute right-[-200px] top-[500px] h-[400px] w-[400px] rounded-full bg-indigo-500/10 blur-[120px]" />
      </div>

      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#080b14]/85 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Logo />

          <div className="hidden items-center gap-8 text-sm text-slate-400 md:flex">
            <a href="#features" className="transition hover:text-white">
              Features
            </a>
            <a href="#how-it-works" className="transition hover:text-white">
              How it works
            </a>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-xl px-3 py-2 text-sm font-medium text-slate-300 transition hover:text-white sm:px-4"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition hover:bg-violet-400"
            >
              Get started <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </nav>
      </header>

      <main className="relative z-10">
        {/* Hero */}
        <section className="mx-auto grid max-w-7xl items-center gap-14 px-5 pb-24 pt-20 sm:px-8 sm:pt-28 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:pb-32">
          <div>
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/[0.07] px-4 py-2 text-xs font-medium text-violet-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              YOUR SECOND BRAIN FOR VISUAL INFORMATION
            </div>

            <h1 className="max-w-2xl text-4xl font-semibold leading-[1.12] tracking-tight sm:text-6xl lg:text-[68px]">
              Your screenshots.
              <br />
              <span className="bg-gradient-to-r from-violet-300 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
                More intelligent.
              </span>
            </h1>

            <p className="mt-7 max-w-xl text-base leading-8 text-slate-400 sm:text-lg">
              Stop losing important information in your camera roll.
              ReSurface transforms screenshots into a searchable, organized
              knowledge space that helps you remember what matters.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-3 rounded-xl bg-violet-500 px-6 py-4 font-semibold text-white shadow-xl shadow-violet-500/20 transition hover:-translate-y-0.5 hover:bg-violet-400"
              >
                Get started for free <span>→</span>
              </Link>

              <a
                href="#features"
                className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-6 py-4 font-medium text-slate-200 transition hover:bg-white/[0.07]"
              >
                Explore features
              </a>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 text-xs text-slate-500">
              <span className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span> AI-powered organization
              </span>
              <span className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span> Privacy-focused design
              </span>
            </div>
          </div>

          {/* Decorative product preview */}
          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute -inset-5 rounded-[32px] bg-gradient-to-br from-violet-500/15 to-indigo-500/5 blur-2xl" />

            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#101421] shadow-2xl shadow-black/40">
              <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/15 text-violet-300">
                    ✦
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      Your knowledge space
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      A smarter way to remember
                    </p>
                  </div>
                </div>
                <span className="rounded-lg border border-white/10 px-2.5 py-1 text-[11px] text-slate-400">
                  Preview
                </span>
              </div>

              <div className="p-5 sm:p-6">
                <div className="mb-5 rounded-xl border border-white/10 bg-[#080b14] px-4 py-3">
                  <div className="flex items-center gap-3 text-sm text-slate-400">
                    <span>⌕</span>
                    <span>Find anything in your screenshots...</span>
                    <span className="ml-auto hidden rounded border border-white/10 px-2 py-1 text-[10px] sm:inline">
                      Search
                    </span>
                  </div>
                </div>

                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">
                    Explore your memories
                  </p>
                  <span className="text-xs text-violet-300">View all ↗</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-white/[0.08] bg-gradient-to-br from-indigo-500/15 to-indigo-500/[0.03] p-4">
                    <div className="mb-7 flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-400/15 text-lg text-indigo-300">
                      ▤
                    </div>
                    <p className="text-sm font-medium text-slate-100">
                      Documents
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Important information
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/[0.08] bg-gradient-to-br from-fuchsia-500/15 to-fuchsia-500/[0.03] p-4">
                    <div className="mb-7 flex h-9 w-9 items-center justify-center rounded-lg bg-fuchsia-400/15 text-lg text-fuchsia-300">
                      ◈
                    </div>
                    <p className="text-sm font-medium text-slate-100">
                      Saved insights
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Ideas worth keeping
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/[0.08] bg-gradient-to-br from-emerald-500/10 to-emerald-500/[0.03] p-4">
                    <div className="mb-7 flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-400/15 text-lg text-emerald-300">
                      ◷
                    </div>
                    <p className="text-sm font-medium text-slate-100">
                      Reminders
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Dates and deadlines
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/[0.08] bg-gradient-to-br from-amber-500/10 to-amber-500/[0.03] p-4">
                    <div className="mb-7 flex h-9 w-9 items-center justify-center rounded-lg bg-amber-400/15 text-lg text-amber-300">
                      ⬡
                    </div>
                    <p className="text-sm font-medium text-slate-100">
                      Private vault
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Sensitive screenshots
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-3 rounded-xl border border-violet-400/15 bg-violet-500/[0.06] p-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-violet-300">
                    ✧
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-100">
                      Information, connected.
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Search, organize, and rediscover what you saved.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-5 -left-3 hidden rounded-xl border border-white/10 bg-[#151a29] px-4 py-3 shadow-xl sm:block sm:-left-6">
              <p className="text-xs font-medium text-emerald-300">
                ✦ Built for discovery
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Your visual information, organized
              </p>
            </div>
          </div>
        </section>

        {/* Feature section */}
        <section id="features" className="border-t border-white/[0.07] bg-white/[0.015]">
          <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-28">
            <div className="mx-auto mb-14 max-w-2xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-300">
                Everything connected
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">
                Less searching.
                <br />
                <span className="text-slate-500">More discovering.</span>
              </h2>
              <p className="mt-5 leading-7 text-slate-400">
                A unified workspace that turns everyday screenshots into useful,
                accessible information.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <article
                  key={feature.number}
                  className="group rounded-2xl border border-white/[0.08] bg-[#101421]/80 p-6 transition duration-300 hover:-translate-y-1 hover:border-violet-400/30 hover:bg-[#14192a]"
                >
                  <div className="flex items-start justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-violet-400/15 bg-violet-400/[0.08] text-xl text-violet-300 transition group-hover:bg-violet-400/15">
                      {feature.icon}
                    </span>
                    <span className="text-xs tracking-widest text-slate-600">
                      {feature.number}
                    </span>
                  </div>
                  <h3 className="mt-6 text-lg font-semibold text-white">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-400">
                    {feature.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-300">
                A simpler workflow
              </p>
              <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                From screenshot
                <br />
                to something useful.
              </h2>
              <p className="mt-5 max-w-lg leading-7 text-slate-400">
                ReSurface is designed to help you move beyond storing images.
                Build a visual knowledge space you can return to whenever you
                need it.
              </p>
            </div>

            <div className="space-y-4">
              {[
                ["01", "Capture", "Save the screenshots and visual information that matter."],
                ["02", "Understand", "Use available AI features to extract and organize useful context."],
                ["03", "Rediscover", "Search your collection and revisit information when you need it."],
              ].map(([number, title, description]) => (
                <div
                  key={number}
                  className="flex gap-5 rounded-xl border border-white/[0.08] bg-white/[0.025] p-5"
                >
                  <span className="text-sm font-semibold text-violet-300">
                    {number}
                  </span>
                  <div>
                    <h3 className="font-semibold text-white">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      {description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-5 pb-24 sm:px-8">
          <div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl border border-violet-400/20 bg-gradient-to-br from-violet-500/15 via-[#151326] to-indigo-500/10 px-6 py-14 text-center sm:px-12 sm:py-20">
            <div className="pointer-events-none absolute left-1/2 top-0 h-48 w-96 -translate-x-1/2 rounded-full bg-violet-500/15 blur-[80px]" />
            <div className="relative">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-300">
                Your next idea is already saved somewhere
              </p>
              <h2 className="mx-auto mt-5 max-w-2xl text-3xl font-semibold tracking-tight sm:text-5xl">
                Make your screenshots work for you.
              </h2>
              <p className="mx-auto mt-5 max-w-xl leading-7 text-slate-400">
                Bring your visual information together in one intelligent workspace.
              </p>
              <Link
                href="/register"
                className="mt-8 inline-flex items-center gap-3 rounded-xl bg-white px-6 py-3.5 font-semibold text-[#101020] transition hover:bg-violet-100"
              >
                Create your account <span>→</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.08]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-7 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <Logo />
          <p>ReSurface — AI-powered screenshot intelligence.</p>
          <p>Built to help you remember what matters.</p>
        </div>
      </footer>
    </div>
  );
}
