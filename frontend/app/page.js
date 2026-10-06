import Link from "next/link";

export default function Home() {
  const features = [
    {
      title: "OCR & Vision AI",
      description: "Automatically extract structured text, receipts, chat logs, code snippets, and event details with hybrid OCR.",
      icon: "⚡",
      tag: "Phase 2",
    },
    {
      title: "Smart Semantic Search",
      description: "Search your image collection by natural language query, topic, entity, or extracted context using Vector Embeddings.",
      icon: "🔍",
      tag: "Phase 3",
    },
    {
      title: "RAG & AI Chat Assistant",
      description: "Ask questions about past screenshots and get instant contextual answers with cited image sources.",
      icon: "🤖",
      tag: "Phase 3",
    },
    {
      title: "Automated Reminders",
      description: "Auto-detect event dates, payment due dates, and deadlines from images and sync directly to your calendar.",
      icon: "📅",
      tag: "Phase 4",
    },
    {
      title: "Perceptual Deduplication",
      description: "Identify duplicate and near-duplicate screenshots to reclaim storage space automatically.",
      icon: "🧹",
      tag: "Phase 4",
    },
    {
      title: "Encrypted Secure Vault",
      description: "Client-side encrypted private vault for sensitive documents, bank details, and confidential screenshots.",
      icon: "🔒",
      tag: "Phase 5",
    },
  ];

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden bg-slate-950 text-slate-100">
      {/* Background Glow Accents */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-tr from-indigo-600/30 via-purple-600/20 to-pink-500/10 blur-3xl pointer-events-none rounded-full" />
      <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] bg-blue-600/20 blur-3xl pointer-events-none rounded-full" />

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/70 border-b border-slate-800/60 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/25">
              RE
            </div>
            <span className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-indigo-200">
              RESecure
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors px-3 py-2"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-all px-4 py-2 rounded-lg shadow-lg shadow-indigo-600/30 hover:shadow-indigo-500/40"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-6 pt-20 pb-16 flex flex-col items-center text-center z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-950/60 border border-indigo-800/50 text-indigo-300 text-xs font-medium mb-8 backdrop-blur-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
          </span>
          Phase 1 Complete — Authentication & Core Architecture Ready
        </div>

        <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-4xl text-balance mb-6">
          Unlock the Intelligence Hidden in Your{" "}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
            Screenshots
          </span>
        </h1>

        <p className="text-lg md:text-xl text-slate-400 max-w-2xl text-balance mb-10 leading-relaxed">
          RESecure transforms scattered receipts, chat logs, tickets, and code snippets into a searchable, automated, and secure knowledge base.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 mb-20 w-full max-w-sm sm:max-w-none justify-center">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 transition-all shadow-xl shadow-indigo-600/25 hover:shadow-indigo-500/35"
          >
            Launch Dashboard
          </Link>
          <a
            href="#features"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-semibold text-slate-300 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:text-white transition-all"
          >
            Explore Features
          </a>
        </div>

        {/* Feature Grid */}
        <section id="features" className="w-full text-left pt-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-3">
              Built for High-Volume Screenshot Intelligence
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto text-sm md:text-base">
              From raw pixels to structured insight in seconds.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((item, idx) => (
              <div
                key={idx}
                className="group relative p-6 rounded-2xl bg-slate-900/50 border border-slate-800/80 hover:border-indigo-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-3xl">{item.icon}</span>
                    <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700">
                      {item.tag}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-100 group-hover:text-indigo-300 transition-colors mb-2">
                    {item.title}
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 py-8 text-center text-xs text-slate-500">
        <p>RESecure — AI Screenshot Intelligence Platform (ASIP) • College Software Project</p>
      </footer>
    </div>
  );
}
