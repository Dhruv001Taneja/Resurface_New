"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import {
  fetchScreenshotsApi,
  uploadScreenshotApi,
  fetchScreenshotByIdApi,
} from "../utils/api";
import Sidebar from "../components/Sidebar";
import ScreenshotDetailsModal from "../components/ScreenshotDetailsModal";

export default function ScreenshotsPage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();

  // Navigation & UI States
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedScreenshot, setSelectedScreenshot] = useState(null);

  // Filter, Search, Sort & Pagination States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);
  const [limit] = useState(12);

  // Backend Data & Status States
  const [screenshots, setScreenshots] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Upload States
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const fileInputRef = useRef(null);

  // Polling ref for background AI processing
  const pollIntervalRef = useRef(null);

  // Category definitions with emoji icons
  const categories = [
    { name: "All", icon: "🌐" },
    { name: "Study", icon: "📚" },
    { name: "Work", icon: "💼" },
    { name: "Shopping", icon: "🛒" },
    { name: "Travel", icon: "✈️" },
    { name: "Notes", icon: "📝" },
    { name: "Other", icon: "📁" },
  ];

  // Helper for category badge icons
  const getCategoryIcon = (category = "") => {
    const cat = (category || "").toLowerCase();
    if (cat.includes("study")) return "📚";
    if (cat.includes("work")) return "💼";
    if (cat.includes("shopping") || cat.includes("cart")) return "🛒";
    if (cat.includes("travel") || cat.includes("ticket") || cat.includes("flight")) return "✈️";
    if (cat.includes("note")) return "📝";
    if (cat.includes("finance") || cat.includes("receipt") || cat.includes("invoice")) return "💳";
    if (cat.includes("event") || cat.includes("calendar")) return "🗓️";
    if (cat.includes("document") || cat.includes("code")) return "📄";
    return "📁";
  };

  // Helper to format date
  const formatDate = (dateStr) => {
    if (!dateStr) return "Recent";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "Recent";
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch (_e) {
      return "Recent";
    }
  };

  // Route Protection: redirect unauthenticated users
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  // Load screenshots from backend API scoped to user
  const loadScreenshots = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);

    try {
      const params = {
        page,
        limit,
        sort: sortBy,
      };

      if (selectedCategory && selectedCategory !== "All") {
        params.category = selectedCategory;
      }

      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const res = await fetchScreenshotsApi(params);

      if (res && res.data) {
        setScreenshots(res.data);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      } else {
        setScreenshots([]);
      }
    } catch (err) {
      console.error("Error loading screenshots:", err.message);
      setError("Unable to load your screenshots.");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, page, limit, sortBy, selectedCategory, searchQuery]);

  useEffect(() => {
    if (isAuthenticated) {
      loadScreenshots();
    }
  }, [loadScreenshots, isAuthenticated]);

  // Auto-polling for active background processing pipeline
  useEffect(() => {
    const hasUnfinished =
      screenshots.some(
        (s) =>
          s.processingPipeline?.overall !== "completed" &&
          s.processingPipeline?.overall !== "failed" &&
          (s.ocr?.status === "processing" ||
            s.aiAnalysis?.status === "processing" ||
            s.aiAnalysis?.status === "pending")
      ) ||
      (selectedScreenshot &&
        selectedScreenshot.processingPipeline?.overall !== "completed" &&
        selectedScreenshot.processingPipeline?.overall !== "failed");

    if (hasUnfinished) {
      pollIntervalRef.current = setInterval(async () => {
        try {
          if (selectedScreenshot?._id) {
            const fresh = await fetchScreenshotByIdApi(selectedScreenshot._id);
            if (fresh?.data) {
              setSelectedScreenshot(fresh.data);
            }
          }
          // Also refresh list data quietly
          const params = { page, limit, sort: sortBy };
          if (selectedCategory !== "All") params.category = selectedCategory;
          if (searchQuery.trim()) params.search = searchQuery.trim();
          const refreshed = await fetchScreenshotsApi(params);
          if (refreshed?.data) {
            setScreenshots(refreshed.data);
          }
        } catch (_err) {
          // ignore background poll error
        }
      }, 3000);
    }

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [screenshots, selectedScreenshot, page, limit, sortBy, selectedCategory, searchQuery]);

  // Upload handler triggering the existing backend Cloudinary upload
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStatus("Uploading to Cloudinary...");

    try {
      const res = await uploadScreenshotApi(file);
      if (res?.data) {
        const newDoc = res.data;
        setScreenshots((prev) => [newDoc, ...prev]);
        setUploadStatus("Upload complete — AI analysis started...");
        // Open details modal immediately
        setSelectedScreenshot(newDoc);
        // Refresh full list
        loadScreenshots();
      }
    } catch (err) {
      console.error("Upload failed:", err.message);
      setUploadStatus(`Upload failed: ${err.message}`);
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setUploadStatus(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }, 2500);
    }
  };

  const userName = user?.name || user?.email?.split("@")[0] || "User";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans antialiased text-gray-900">
      {/* 1. TOP HEADER (Identical to Dashboard) */}
      <header className="h-16 bg-white border-b border-gray-200 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-gray-600 hover:text-gray-900 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Toggle menu"
          >
            <span className="text-xl">☰</span>
          </button>
          <Link
            href="/dashboard"
            className="font-extrabold text-xl tracking-tight text-gray-900 flex items-center gap-2 hover:text-indigo-600 transition-colors"
          >
            <span>RESecure</span>
          </Link>
        </div>

        {/* Top Centered Search bar */}
        <div className="flex-1 max-w-md mx-4 hidden sm:block">
          <div className="relative">
            <input
              type="text"
              placeholder="Search screenshots..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full bg-gray-50 border border-gray-300 rounded-full py-2 px-4 pl-10 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
            <span className="absolute left-3.5 top-2.5 text-gray-400 text-sm">🔍</span>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3 sm:gap-5">
          <label className="cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition-all">
            <span>+ Upload</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors">
            <span className="text-lg">🔔</span>
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
          </button>

          <div className="flex items-center gap-2 border-l border-gray-200 pl-3 sm:pl-4">
            <div className="h-8 w-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center font-bold text-indigo-700 text-xs">
              {userName.substring(0, 2).toUpperCase()}
            </div>
            <span className="font-bold text-sm text-gray-800 hidden sm:inline-block">
              {userName}
            </span>
            <button
              onClick={logout}
              title="Sign Out"
              className="ml-1 text-xs font-semibold text-gray-500 hover:text-rose-600 hover:bg-rose-50 px-2 py-1 rounded transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* 2. BODY LAYOUT: SIDEBAR + MAIN CONTENT */}
      <div className="flex-1 flex overflow-hidden">
        {/* SIDEBAR COMPONENT */}
        <Sidebar
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          user={user}
          userName={userName}
          activePage="Screenshots"
        />

        {/* MAIN SCREENSHOTS CONTENT */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 max-w-7xl mx-auto w-full">
          {/* Upload Status Banner */}
          {isUploading && (
            <div className="mb-6 p-4 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-sm flex items-center gap-3 animate-pulse shadow-sm">
              <span className="h-3 w-3 rounded-full bg-indigo-600 animate-ping" />
              <span className="font-semibold">{uploadStatus}</span>
            </div>
          )}

          {/* ================================================== */}
          {/* 1. PAGE HEADER                                     */}
          {/* ================================================== */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                Screenshots
              </h1>
              <p className="text-gray-500 text-sm sm:text-base mt-1 font-normal">
                Manage and explore all your screenshots
              </p>
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-xs hover:shadow-md transition-all text-sm shrink-0 self-start sm:self-auto"
            >
              <span className="text-base font-bold">+</span>
              <span>Upload Screenshot</span>
            </button>
          </div>

          {/* ================================================== */}
          {/* 2. SEARCH & FILTER ROW                            */}
          {/* ================================================== */}
          <div className="bg-white border border-gray-200 rounded-2xl p-3 sm:p-4 mb-6 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search screenshots (title, OCR text, tags, summary)..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-gray-50 border border-gray-300 rounded-xl py-2.5 px-4 pl-10 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
              <span className="absolute left-3.5 top-3 text-gray-400 text-sm">🔍</span>
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setPage(1);
                  }}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 text-sm"
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter and Sort Dropdowns */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Category Filter Dropdown (mobile quick select) */}
              <div className="relative">
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setPage(1);
                  }}
                  className="appearance-none bg-gray-50 border border-gray-300 rounded-xl py-2.5 pl-3.5 pr-8 text-xs sm:text-sm font-semibold text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
                >
                  <option value="All">Filter: All Categories</option>
                  <option value="Study">📚 Study</option>
                  <option value="Work">💼 Work</option>
                  <option value="Shopping">🛒 Shopping</option>
                  <option value="Travel">✈️ Travel</option>
                  <option value="Notes">📝 Notes</option>
                  <option value="Finance">💳 Finance</option>
                  <option value="Other">📁 Other</option>
                </select>
                <span className="absolute right-2.5 top-3 text-gray-400 text-xs pointer-events-none">
                  ▾
                </span>
              </div>

              {/* Sort Dropdown */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setPage(1);
                  }}
                  className="appearance-none bg-gray-50 border border-gray-300 rounded-xl py-2.5 pl-3.5 pr-8 text-xs sm:text-sm font-semibold text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
                >
                  <option value="newest">Sort: Newest ▾</option>
                  <option value="oldest">Sort: Oldest ▾</option>
                </select>
                <span className="absolute right-2.5 top-3 text-gray-400 text-xs pointer-events-none">
                  ▾
                </span>
              </div>
            </div>
          </div>

          {/* ================================================== */}
          {/* 3. CATEGORY FILTER TABS                            */}
          {/* ================================================== */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-8 no-scrollbar">
            {categories.map((cat) => {
              const active = selectedCategory === cat.name;
              return (
                <button
                  key={cat.name}
                  onClick={() => {
                    setSelectedCategory(cat.name);
                    setPage(1);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
                    active
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300"
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>

          {/* ================================================== */}
          {/* 11. LOADING SKELETON STATE                         */}
          {/* ================================================== */}
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(8)].map((_, i) => (
                <div
                  key={`skeleton-${i}`}
                  className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs animate-pulse"
                >
                  <div className="h-48 bg-gray-200" />
                  <div className="p-4 space-y-2.5">
                    <div className="h-3.5 w-16 bg-gray-200 rounded" />
                    <div className="h-4 w-3/4 bg-gray-200 rounded" />
                    <div className="h-3 w-20 bg-gray-100 rounded" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ================================================== */}
          {/* 12. ERROR STATE                                    */}
          {/* ================================================== */}
          {!loading && error && (
            <div className="bg-white border border-red-200 rounded-2xl p-10 text-center shadow-xs my-8 max-w-lg mx-auto">
              <span className="text-4xl mb-3 block">⚠️</span>
              <h3 className="text-lg font-bold text-gray-900 mb-1">
                Unable to load your screenshots.
              </h3>
              <p className="text-gray-500 text-sm mb-6">
                Please check your network connection and try again.
              </p>
              <button
                onClick={loadScreenshots}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-xs"
              >
                Try Again
              </button>
            </div>
          )}

          {/* ================================================== */}
          {/* 10. EMPTY STATE                                    */}
          {/* ================================================== */}
          {!loading && !error && screenshots.length === 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-xs my-6 max-w-md mx-auto flex flex-col items-center">
              <div className="h-16 w-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center text-3xl mb-4 shadow-xs">
                📸
              </div>
              <h3 className="text-lg sm:text-xl font-extrabold text-gray-900 mb-2">
                {searchQuery || selectedCategory !== "All"
                  ? "No matching screenshots"
                  : "No screenshots yet"}
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-6">
                {searchQuery || selectedCategory !== "All"
                  ? "Try adjusting your search terms or clearing category filters."
                  : "Upload your first screenshot to let RESecure understand and organize it."}
              </p>

              {searchQuery || selectedCategory !== "All" ? (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("All");
                    setPage(1);
                  }}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-semibold px-5 py-2.5 rounded-xl transition-all"
                >
                  Clear Filters
                </button>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-xs flex items-center gap-2"
                >
                  <span>+</span>
                  <span>Upload Screenshot</span>
                </button>
              )}
            </div>
          )}

          {/* ================================================== */}
          {/* 5. SCREENSHOT GRID                                 */}
          {/* ================================================== */}
          {!loading && !error && screenshots.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {screenshots.map((item) => {
                const title =
                  item.aiAnalysis?.title || item.title || item.originalName || "Untitled Screenshot";
                const category = item.aiAnalysis?.category || item.category || "Other";
                const icon = getCategoryIcon(category);
                const date = formatDate(item.createdAt);
                const imageUrl =
                  item.storage?.imageUrl ||
                  item.imageUrl ||
                  item.storage?.thumbnailUrl ||
                  item.thumbnailUrl;
                const isProcessing =
                  item.processingPipeline?.overall !== "completed" &&
                  item.processingPipeline?.overall !== "failed" &&
                  (item.ocr?.status === "processing" ||
                    item.aiAnalysis?.status === "processing" ||
                    item.aiAnalysis?.status === "pending");

                return (
                  <div
                    key={item._id || item.id}
                    onClick={() => setSelectedScreenshot(item)}
                    className="group bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-lg hover:border-indigo-400 transition-all duration-200 cursor-pointer flex flex-col justify-between"
                  >
                    {/* Top Image Preview (Cloudinary URL) */}
                    <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden border-b border-gray-100">
                      <img
                        src={
                          imageUrl ||
                          "https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80"
                        }
                        alt={title}
                        loading="lazy"
                        className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-200"
                      />
                      <div className="absolute inset-0 bg-gray-900/0 group-hover:bg-gray-900/10 transition-colors" />

                      {/* Processing Badge on image */}
                      {isProcessing && (
                        <div className="absolute top-2 right-2">
                          <span className="inline-flex items-center gap-1 bg-amber-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow backdrop-blur-xs">
                            <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
                            Processing...
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Card Content Footer */}
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        {/* Category Tag */}
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className="text-xs">{icon}</span>
                          <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                            {category}
                          </span>
                        </div>

                        {/* AI-Generated Title */}
                        <h3
                          className="font-bold text-sm text-gray-900 line-clamp-2 leading-snug group-hover:text-indigo-600 transition-colors"
                          title={title}
                        >
                          {title}
                        </h3>
                      </div>

                      {/* Date */}
                      <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400 font-medium">
                        <span>{date}</span>
                        <span className="text-gray-300 group-hover:text-indigo-400 transition-colors">
                          View details →
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ================================================== */}
          {/* 9. PAGINATION ROW                                  */}
          {/* ================================================== */}
          {!loading && !error && pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4 pb-8">
              {/* Prev button */}
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3.5 py-2 rounded-xl text-sm font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                aria-label="Previous page"
              >
                ← Prev
              </button>

              {/* Page numbers */}
              {[...Array(pagination.pages)].map((_, idx) => {
                const pageNum = idx + 1;
                // Show first, last, and window around current page
                if (
                  pageNum === 1 ||
                  pageNum === pagination.pages ||
                  (pageNum >= page - 1 && pageNum <= page + 1)
                ) {
                  const isActive = page === pageNum;
                  return (
                    <button
                      key={`page-${pageNum}`}
                      onClick={() => setPage(pageNum)}
                      className={`h-9 w-9 rounded-xl text-sm font-bold transition-all ${
                        isActive
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                } else if (pageNum === page - 2 || pageNum === page + 2) {
                  return (
                    <span key={`dots-${pageNum}`} className="text-gray-400 px-1">
                      ...
                    </span>
                  );
                }
                return null;
              })}

              {/* Next button */}
              <button
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                disabled={page >= pagination.pages}
                className="px-3.5 py-2 rounded-xl text-sm font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                aria-label="Next page"
              >
                Next →
              </button>
            </div>
          )}
        </main>
      </div>

      {/* ================================================== */}
      {/* 7. SCREENSHOT DETAILS MODAL (Reused Component)     */}
      {/* ================================================== */}
      {selectedScreenshot && (
        <ScreenshotDetailsModal
          screenshot={selectedScreenshot}
          onClose={() => setSelectedScreenshot(null)}
        />
      )}
    </div>
  );
}
