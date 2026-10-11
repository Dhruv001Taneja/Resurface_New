
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import {
  fetchScreenshotsApi,
  uploadScreenshotApi,
  fetchScreenshotByIdApi,
  deleteScreenshotApi,
} from "../utils/api";
import ScreenshotDetailsModal from "../components/ScreenshotDetailsModal";

const navigation = [
  { name: "Dashboard", icon: "▦", href: "/dashboard" },
  { name: "Screenshots", icon: "▧", href: "/screenshots" },
  { name: "Action Center", icon: "✓", href: "/action-center" },
  { name: "Calendar", icon: "▦", href: "/calendar" },
  { name: "Vault", icon: "▣", href: "/vault" },
];

function getTitle(item) {
  return (
    item?.aiAnalysis?.title ||
    item?.title ||
    item?.originalName ||
    "Untitled screenshot"
  );
}

function getSummary(item) {
  return (
    item?.aiAnalysis?.summary ||
    item?.summary ||
    "No summary available yet."
  );
}

function getCategory(item) {
  return item?.aiAnalysis?.category || item?.category || "Uncategorized";
}

function getImage(item) {
  return (
    item?.thumbnailUrl ||
    item?.imageUrl ||
    item?.storage?.thumbnailUrl ||
    item?.storage?.imageUrl ||
    item?.storage?.url ||
    ""
  );
}

function getTasks(item) {
  const analysis = item?.aiAnalysis;
  if (!analysis) return [];

  if (Array.isArray(analysis.extractedTasks)) {
    return analysis.extractedTasks.filter((task) => !task.isDismissed);
  }

  if (Array.isArray(analysis.actionItems)) {
    return analysis.actionItems.filter((task) => !task.isDismissed);
  }

  return [];
}

function getEvents(item) {
  return Array.isArray(item?.aiAnalysis?.extractedEvents)
    ? item.aiAnalysis.extractedEvents.filter((event) => !event.isDismissed)
    : [];
}

function getDates(item) {
  return Array.isArray(item?.aiAnalysis?.extractedDates)
    ? item.aiAnalysis.extractedDates.filter((date) => !date.isDismissed)
    : [];
}

function isProcessing(item) {
  const overall = item?.processingPipeline?.overall;

  if (overall) {
    return overall !== "completed" && overall !== "failed";
  }

  return (
    item?.ocr?.status === "processing" ||
    item?.aiAnalysis?.status === "processing" ||
    item?.aiAnalysis?.status === "pending"
  );
}

function getDate(item) {
  const value = item?.createdAt || item?.updatedAt;

  if (!value) return "Recently added";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Recently added";

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function StatCard({ label, value, icon, description }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#101722] p-5 transition hover:border-teal-400/30">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-white">
            {value}
          </p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-teal-400/15 bg-teal-400/[0.08] text-xl text-teal-300">
          {icon}
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-500">{description}</p>
    </div>
  );
}

export default function Dashboard() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();

  const [screenshots, setScreenshots] = useState([]);
  const [loadingScreenshots, setLoadingScreenshots] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedScreenshot, setSelectedScreenshot] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [pageError, setPageError] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const pollIntervalRef = useRef(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  const loadScreenshots = async () => {
    if (!isAuthenticated) return;

    setLoadingScreenshots(true);
    setPageError("");

    try {
      const response = await fetchScreenshotsApi();

      if (Array.isArray(response?.data)) {
        setScreenshots(response.data);
      } else {
        setScreenshots([]);
      }
    } catch (error) {
      console.error("Unable to load screenshots:", error);
      setPageError(
        error.message || "Unable to load screenshots. Please try again."
      );
    } finally {
      setLoadingScreenshots(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadScreenshots();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!selectedScreenshot) return;

    const screenshotId =
      selectedScreenshot._id || selectedScreenshot.id;

    if (!screenshotId) return;

    if (!isProcessing(selectedScreenshot)) return;

    pollIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetchScreenshotByIdApi(screenshotId);
        const fresh = response?.data;

        if (!fresh) return;

        setSelectedScreenshot(fresh);

        setScreenshots((previous) =>
          previous.map((item) =>
            (item._id || item.id) === (fresh._id || fresh.id)
              ? fresh
              : item
          )
        );
      } catch (error) {
        console.warn("Screenshot status refresh failed:", error);
      }
    }, 3000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [selectedScreenshot]);

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];

    // Allow selecting the same file again later.
    event.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUploadStatus("Please select an image file.");
      return;
    }

    setIsUploading(true);
    setUploadStatus("Uploading your screenshot...");
    setPageError("");

    try {
      const response = await uploadScreenshotApi(file);

      if (response?.data) {
        setScreenshots((previous) => [
          response.data,
          ...previous,
        ]);

        setSelectedScreenshot(response.data);
        setUploadStatus("Upload complete. AI processing has started.");
      } else {
        await loadScreenshots();
        setUploadStatus("Upload completed. Refreshing your screenshots...");
      }
    } catch (error) {
      console.error("Screenshot upload failed:", error);
      setPageError(error.message || "Screenshot upload failed.");
      setUploadStatus("");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteScreenshotApi(id);

      setScreenshots((previous) =>
        previous.filter((item) => (item._id || item.id) !== id)
      );

      setSelectedScreenshot(null);
    } catch (error) {
      console.error("Screenshot deletion failed:", error);
      setPageError(error.message || "Could not delete this screenshot.");
    }
  };

  const displayName = user?.name || "there";
  const firstName = displayName.trim().split(/\s+/)[0];

  const greeting = useMemo(() => {
    const hour = new Date().getHours();

    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const filteredScreenshots = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return screenshots;

    return screenshots.filter((item) => {
      const title = getTitle(item).toLowerCase();
      const summary = getSummary(item).toLowerCase();
      const category = getCategory(item).toLowerCase();

      return (
        title.includes(query) ||
        summary.includes(query) ||
        category.includes(query)
      );
    });
  }, [screenshots, searchQuery]);

  const favoriteCount = screenshots.filter(
    (item) => item.isFavorite || item.favorite
  ).length;

  const tasks = screenshots.flatMap((item) =>
    getTasks(item).map((task) => ({
      ...task,
      title: task.task || task.description || "Untitled task",
      date: task.dueDate,
      source: item,
      type: "task",
    }))
  );

  const events = screenshots.flatMap((item) =>
    getEvents(item).map((event) => ({
      ...event,
      title: event.event || event.title || "Untitled event",
      date: event.date,
      source: item,
      type: "event",
    }))
  );

  const dates = screenshots.flatMap((item) =>
    getDates(item).map((date) => ({
      ...date,
      title: date.context || date.dateText || "Extracted date",
      date: date.dateText,
      source: item,
      type: "date",
    }))
  );

  const recentActions = [...tasks, ...events, ...dates].slice(0, 4);

  if (isLoading || !isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#080d14] text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-teal-400/20 border-t-teal-400" />
          <p className="text-sm text-slate-400">
            Loading your workspace...
          </p>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#080d14] font-sans text-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#0b111b]/95 backdrop-blur-xl">
        <div className="flex h-[72px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="rounded-lg border border-white/10 px-3 py-2 text-slate-300 md:hidden"
              aria-label="Toggle navigation"
            >
              ☰
            </button>

            <Link href="/dashboard" className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-400 font-bold text-[#06252a]">
                RE
              </span>
              <span className="text-xl font-bold tracking-tight">
                ReSurface<span className="text-teal-300">.</span>
              </span>
            </Link>
          </div>

          <div className="hidden max-w-md flex-1 sm:block">
            <div className="relative mx-6">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                ⌕
              </span>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search your screenshots..."
                className="w-full rounded-xl border border-white/[0.08] bg-[#101722] py-2.5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-teal-400/50"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="cursor-pointer rounded-xl bg-teal-400 px-3 py-2.5 text-sm font-semibold text-[#06252a] transition hover:bg-teal-300 sm:px-4">
              <span>{isUploading ? "Uploading..." : "+ Upload"}</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleUpload}
                disabled={isUploading}
                className="hidden"
              />
            </label>

            <div className="hidden items-center gap-3 border-l border-white/10 pl-4 sm:flex">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-400/10 text-sm font-bold text-teal-300">
                {displayName.slice(0, 2).toUpperCase()}
              </div>

              <div className="hidden xl:block">
                <p className="max-w-36 truncate text-sm font-semibold">
                  {displayName}
                </p>
                <p className="max-w-36 truncate text-xs text-slate-500">
                  {user?.email}
                </p>
              </div>

              <button
                type="button"
                onClick={logout}
                className="text-xs text-slate-400 transition hover:text-rose-300"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-72px)]">
        {/* Mobile overlay */}
        {mobileMenuOpen && (
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 z-20 bg-black/60 md:hidden"
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed bottom-0 left-0 top-[72px] z-30 flex w-64 flex-col border-r border-white/[0.08] bg-[#0b111b] transition-transform duration-200 md:sticky md:top-[72px] md:h-[calc(100vh-72px)] md:translate-x-0 ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
            }`}
        >
          <div className="p-5">
            <p className="mb-4 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              WORKSPACE
            </p>

            <nav className="space-y-1">
              {navigation.map((item, index) => {
                const active = index === 0;

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${active
                        ? "border border-teal-400/15 bg-teal-400/10 font-semibold text-teal-300"
                        : "text-slate-400 hover:bg-white/[0.04] hover:text-white"
                      }`}
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.04] text-base">
                      {item.icon}
                    </span>
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            <div className="my-6 border-t border-white/[0.08]" />

            <p className="mb-4 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              PREFERENCES
            </p>

            <Link
              href="/settings"
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-400 transition hover:bg-white/[0.04] hover:text-white"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.04]">
                ⚙
              </span>
              Settings
            </Link>
          </div>

          <div className="mt-auto border-t border-white/[0.08] p-5">
            <div className="rounded-xl border border-teal-400/10 bg-teal-400/[0.04] p-4">
              <p className="text-xs font-semibold text-teal-200">
                Your workspace
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                Keep useful information organized and easy to find.
              </p>
            </div>

            <div className="mt-5 truncate text-xs text-slate-500">
              Signed in as {displayName}
            </div>
          </div>
        </aside>

        {/* Main dashboard */}
        <main className="min-w-0 flex-1 px-4 py-7 sm:px-6 sm:py-9 lg:px-9">
          <div className="mx-auto max-w-[1400px]">
            {uploadStatus && (
              <div className="mb-5 rounded-xl border border-teal-400/20 bg-teal-400/[0.08] px-4 py-3 text-sm text-teal-200">
                {uploadStatus}
              </div>
            )}

            {pageError && (
              <div
                role="alert"
                className="mb-5 flex items-center justify-between gap-4 rounded-xl border border-rose-400/20 bg-rose-400/[0.08] px-4 py-3 text-sm text-rose-300"
              >
                <span>{pageError}</span>
                <button
                  type="button"
                  onClick={loadScreenshots}
                  className="shrink-0 font-semibold underline underline-offset-4"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Greeting */}
            <section className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-teal-300">
                  YOUR PERSONAL WORKSPACE
                </p>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  {greeting}, {firstName}
                  <span className="text-teal-300">.</span>
                </h1>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Here's an overview of the information you've saved.
                </p>
              </div>

              <Link
                href="/screenshots"
                className="inline-flex w-fit items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-medium text-slate-300 transition hover:border-teal-400/30 hover:text-teal-300"
              >
                Browse screenshots <span>→</span>
              </Link>
            </section>

            {/* Overview cards */}
            <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Screenshots"
                value={loadingScreenshots ? "—" : screenshots.length}
                icon="▧"
                description="Images in your workspace"
              />
              <StatCard
                label="Favorites"
                value={loadingScreenshots ? "—" : favoriteCount}
                icon="☆"
                description="Screenshots marked as favorites"
              />
              <StatCard
                label="Extracted tasks"
                value={loadingScreenshots ? "—" : tasks.length}
                icon="✓"
                description="Tasks found in your screenshots"
              />
              <StatCard
                label="Detected events"
                value={loadingScreenshots ? "—" : events.length}
                icon="◷"
                description="Events found in saved information"
              />
            </section>

            {/* Screenshots and actions */}
            <section className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-[1.5fr_0.85fr]">
              <div className="min-w-0 rounded-2xl border border-white/[0.08] bg-[#101722] p-5 sm:p-6">
                <div className="mb-6 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">
                      Recent screenshots
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Your recently saved images
                    </p>
                  </div>

                  <Link
                    href="/screenshots"
                    className="shrink-0 text-xs font-semibold text-teal-300 transition hover:text-teal-200"
                  >
                    View all →
                  </Link>
                </div>

                {loadingScreenshots ? (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {[1, 2, 3, 4].map((item) => (
                      <div
                        key={item}
                        className="aspect-[4/5] animate-pulse rounded-xl bg-white/[0.04]"
                      />
                    ))}
                  </div>
                ) : filteredScreenshots.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 2xl:grid-cols-4">
                    {filteredScreenshots.slice(0, 8).map((item) => {
                      const image = getImage(item);

                      return (
                        <button
                          type="button"
                          key={item._id || item.id}
                          onClick={() => setSelectedScreenshot(item)}
                          className="group min-w-0 overflow-hidden rounded-xl border border-white/[0.08] bg-[#0b111b] text-left transition hover:border-teal-400/40"
                        >
                          <div className="relative aspect-[4/3] overflow-hidden bg-[#151e2b]">
                            {image ? (
                              <img
                                src={image}
                                alt={getTitle(item)}
                                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-3xl text-slate-600">
                                ▧
                              </div>
                            )}

                            {isProcessing(item) && (
                              <span className="absolute right-2 top-2 rounded-full border border-amber-300/20 bg-black/70 px-2 py-1 text-[10px] text-amber-200">
                                Processing
                              </span>
                            )}
                          </div>

                          <div className="p-3">
                            <p className="truncate text-sm font-medium text-slate-200">
                              {getTitle(item)}
                            </p>
                            <p className="mt-1 truncate text-xs text-slate-500">
                              {getCategory(item)}
                            </p>
                            <p className="mt-2 text-[10px] text-slate-600">
                              {getDate(item)}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-white/10 px-5 text-center">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-400/[0.08] text-2xl text-teal-300">
                      ▧
                    </div>
                    <h3 className="font-semibold text-white">
                      {searchQuery
                        ? "No matching screenshots"
                        : "Your workspace is ready"}
                    </h3>
                    <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">
                      {searchQuery
                        ? "Try another search term."
                        : "Upload an image to start extracting useful information."}
                    </p>

                    {!searchQuery && (
                      <label className="mt-5 cursor-pointer rounded-lg bg-teal-400 px-4 py-2.5 text-sm font-semibold text-[#06252a] hover:bg-teal-300">
                        Upload your first screenshot
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleUpload}
                          disabled={isUploading}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                )}
              </div>

              {/* Action center */}
              <div className="rounded-2xl border border-white/[0.08] bg-[#101722] p-5 sm:p-6">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">Action center</h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Tasks and dates extracted by AI
                    </p>
                  </div>
                  <span className="rounded-lg bg-teal-400/10 px-2.5 py-1.5 text-xs font-semibold text-teal-300">
                    {recentActions.length}
                  </span>
                </div>

                {recentActions.length > 0 ? (
                  <div className="space-y-3">
                    {recentActions.map((item, index) => (
                      <button
                        type="button"
                        key={`${item.type}-${index}`}
                        onClick={() => setSelectedScreenshot(item.source)}
                        className="flex w-full items-start gap-3 rounded-xl border border-white/[0.06] bg-[#0b111b] p-3 text-left transition hover:border-teal-400/25"
                      >
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-400/[0.08] text-teal-300">
                          {item.type === "task"
                            ? "✓"
                            : item.type === "event"
                              ? "◷"
                              : "◦"}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block break-words text-sm font-medium text-slate-200">
                            {item.title}
                          </span>
                          {item.date && (
                            <span className="mt-1 block text-xs text-slate-500">
                              {item.date}
                            </span>
                          )}
                        </span>
                        <span className="text-slate-600">↗</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex min-h-44 flex-col items-center justify-center text-center">
                    <span className="text-2xl text-slate-600">✓</span>
                    <p className="mt-3 text-sm font-medium text-slate-300">
                      Nothing needs your attention yet
                    </p>
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      Extracted tasks and events will appear here.
                    </p>
                  </div>
                )}

                <Link
                  href="/action-center"
                  className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-teal-300 hover:text-teal-200"
                >
                  Open Action Center →
                </Link>
              </div>
            </section>

            {/* Lower information cards */}
            <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/[0.08] bg-[#101722] p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-400/[0.08] text-xl text-teal-300">
                    ◈
                  </div>
                  <div>
                    <h2 className="font-semibold">AI processing</h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Screenshot intelligence status
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-white/[0.08] pt-4">
                  <span className="text-sm text-slate-400">
                    Currently processing
                  </span>
                  <span className="text-lg font-semibold text-white">
                    {screenshots.filter(isProcessing).length}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm text-slate-400">
                    Completed
                  </span>
                  <span className="text-sm font-semibold text-teal-300">
                    {screenshots.filter(
                      (item) =>
                        item.processingPipeline?.overall === "completed"
                    ).length}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-[#101722] p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-400/[0.08] text-xl text-teal-300">
                    ◷
                  </div>
                  <div>
                    <h2 className="font-semibold">Your next step</h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Make more of what you save
                    </p>
                  </div>
                </div>

                <p className="mt-5 text-sm leading-6 text-slate-400">
                  Review your saved screenshots and the tasks or events
                  identified in them.
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href="/screenshots"
                    className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-teal-400/30 hover:text-teal-300"
                  >
                    Browse screenshots
                  </Link>
                  <Link
                    href="/action-center"
                    className="rounded-lg bg-teal-400 px-3 py-2 text-xs font-semibold text-[#06252a] transition hover:bg-teal-300"
                  >
                    Review actions
                  </Link>
                </div>
              </div>
            </section>

            <footer className="mt-10 border-t border-white/[0.06] pt-5 text-center text-xs text-slate-600">
              ReSurface · AI Screenshot Intelligence Platform
            </footer>
          </div>
        </main>
      </div>

      {selectedScreenshot && (
        <ScreenshotDetailsModal
          screenshot={selectedScreenshot}
          onClose={() => setSelectedScreenshot(null)}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
