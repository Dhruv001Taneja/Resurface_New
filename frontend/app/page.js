import Link from "next/link";

export default function Home() {
  const features = [
    {
      title: "OCR & Vision AI",
      description: "Automatically extract structured text, receipts, chat logs, code snippets, and event details with hybrid OCR.",
      icon: "⚡",
    },
    {
      title: "Smart Semantic Search",
      description: "Search your image collection by natural language query, topic, entity, or extracted context using Vector Embeddings.",
      icon: "🔍",
    },
    {
      title: "RAG & AI Chat Assistant",
      description: "Ask questions about past screenshots and get instant contextual answers with cited image sources.",
      icon: "🤖",
    },
    {
      title: "Automated Reminders",
      description: "Auto-detect event dates, payment due dates, and deadlines from images and sync directly to your calendar.",
      icon: "📅",
    },
    {
      title: "Perceptual Deduplication",
      description: "Identify duplicate and near-duplicate screenshots to reclaim storage space automatically.",
      icon: "🧹",
    },
    {
      title: "Encrypted Secure Vault",
      description: "Client-side encrypted private vault for sensitive documents, bank details, and confidential screenshots.",
      icon: "🔒",
    },
  ];

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden bg-slate-50 text-slate-900">
      {/* Background Glow Accents */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-tr from-indigo-200/50 via-purple-200/40 to-pink-200/30 blur-3xl pointer-events-none rounded-full" />
      <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] bg-blue-200/40 blur-3xl pointer-events-none rounded-full" />

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/70 border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/25">
              RE
            </div>
            <span className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-600">
              RESecure
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors px-3 py-2"
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

        <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-4xl text-balance mb-6">
          Unlock the Intelligence Hidden in Your{" "}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">
            Screenshots
          </span>
        </h1>

        <p className="text-lg md:text-xl text-slate-600 max-w-2xl text-balance mb-10 leading-relaxed">
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
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-semibold text-slate-700 bg-white/80 hover:bg-slate-50 border border-slate-200 hover:text-slate-900 transition-all shadow-sm"
          >
            Explore Features
          </a>
        </div>

        {/* Feature Grid */}
        <section id="features" className="w-full text-left pt-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 mb-3">
              Built for High-Volume Screenshot Intelligence
            </h2>
            <p className="text-slate-600 max-w-xl mx-auto text-sm md:text-base">
              From raw pixels to structured insight in seconds.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((item, idx) => (
              <div
                key={idx}
                className="group relative p-6 rounded-2xl bg-white border border-slate-200 hover:border-indigo-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-3xl">{item.icon}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors mb-2">
                    {item.title}
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8 text-center text-xs text-slate-500">
        <p>RESecure — AI Screenshot Intelligence Platform (ASIP) • College Software Project</p>
      </footer>
    </div>
  );
}
