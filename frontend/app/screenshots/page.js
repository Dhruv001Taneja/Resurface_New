"use client";



import { useState, useEffect, useRef, useCallback } from "react";

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

import Sidebar from "../components/Sidebar";



const CATEGORIES = [

  "All",

  "Study",

  "Work",

  "Shopping",

  "Travel",

  "Finance",

  "Personal",

  "Notes",

  "Events",

  "Documents",

  "Other",

];



function Icon({ name, size = 20, className = "" }) {

  const common = {

    width: size,

    height: size,

    viewBox: "0 0 24 24",

    fill: "none",

    stroke: "currentColor",

    strokeWidth: 1.7,

    strokeLinecap: "round",

    strokeLinejoin: "round",

    className,

    "aria-hidden": true,

  };



  const paths = {

    "grid-2x2": <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,

    images: <><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></>,

    zap: <path d="m13 2-3 8H5l6 12 3-8h5L13 2Z" />,

    "calendar-days": <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18M8 14h2M14 14h2M8 17h2" /></>,

    "bell-ring": <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4M2 8a10 10 0 0 1 2-5M22 8a10 10 0 0 0-2-5" /></>,

    "shield-check": <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></>,

    "chart-no-axes-combined": <><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-5 5" /><path d="M15 9h4v4" /></>,

    "settings-2": <><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M2 14h4M10 8h4M18 16h4" /></>,

    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,

    upload: <><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v4h16v-4" /></>,

    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,

    menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,

    close: <path d="m18 6-12 12M6 6l12 12" />,

    filter: <><path d="M4 7h16M7 12h10M10 17h4" /><circle cx="8" cy="7" r="1.5" fill="currentColor" /><circle cx="15" cy="12" r="1.5" fill="currentColor" /></>,

    "arrow-up-down": <><path d="m7 3-4 4 4 4M3 7h12M17 21l4-4-4-4M21 17H9" /></>,

    "more-horizontal": <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,

    "external-link": <><path d="M14 3h7v7M10 14 21 3" /><path d="M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6" /></>,

    "image-plus": <><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21M16 3v6M13 6h6" /></>,

    "clock-3": <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,

    "layout-grid": <><rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="3" width="8" height="8" rx="1.5" /><rect x="3" y="13" width="8" height="8" rx="1.5" /><rect x="13" y="13" width="8" height="8" rx="1.5" /></>,

    "list": <><path d="M9 6h12M9 12h12M9 18h12" /><path d="M4 6h.01M4 12h.01M4 18h.01" /></>,

    "heart": <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />,

    "file-image": <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M8 17l3-3 2 2 2-2 2 3" /></>,

    "refresh-cw": <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M5.6 9a7 7 0 0 1 11.6-2L20 12M4 12l2.8 5a7 7 0 0 0 11.6-2" /></>,

    "log-out": <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></>,

    "check-circle": <><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>,

    "alert-circle": <><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></>,

    "arrow-left": <><path d="m12 19-7-7 7-7M5 12h14" /></>,

  };



  return <svg {...common}>{paths[name] || <circle cx="12" cy="12" r="9" />}</svg>;

}



function getTitle(item) {

  return (

    item?.title ||

    item?.aiAnalysis?.title ||

    item?.originalName ||

    item?.fileName ||

    "Untitled screenshot"

  );

}



function getSummary(item) {

  return (

    item?.aiAnalysis?.summary ||

    item?.summary ||

    item?.ocr?.text ||

    item?.description ||

    "No description available yet."

  );

}







function getCategory(item) {

  const rawCategory =

    item?.aiAnalysis?.category ||

    item?.category ||

    item?.aiAnalysis?.tags?.[0] ||

    "Other";



  const category = String(rawCategory).trim().toLowerCase();



  const categoryMap = {

    study: "Study",

    education: "Study",

    academic: "Study",



    work: "Work",

    business: "Work",



    shopping: "Shopping",

    travel: "Travel",



    finance: "Finance",

    financial: "Finance",

    banking: "Finance",



    personal: "Personal",



    notes: "Notes",

    note: "Notes",



    events: "Events",

    event: "Events",



    documents: "Documents",

    document: "Documents",



    other: "Other",

  };



  return categoryMap[category] || "Other";

}







function getImageUrl(item) {

  return (

    item?.thumbnailUrl ||

    item?.imageUrl ||

    item?.storage?.thumbnailUrl ||

    item?.storage?.url ||

    item?.url ||

    item?.image ||

    ""

  );

}



function formatDate(value) {

  if (!value) return "Recently added";



  const date = new Date(value);



  if (Number.isNaN(date.getTime())) return "Recently added";



  return date.toLocaleDateString("en-IN", {

    day: "numeric",

    month: "short",

    year: "numeric",

  });

}



function isProcessing(item) {

  if (

    item?.processingPipeline?.overall === "completed" ||

    item?.processingPipeline?.overall === "failed"

  ) {

    return false;

  }



  return (

    item?.ocr?.status === "processing" ||

    item?.aiAnalysis?.status === "processing" ||

    item?.aiAnalysis?.status === "pending" ||

    item?.processingPipeline?.overall === "processing" ||

    item?.processingPipeline?.overall === "pending"

  );

}



function ScreenshotCard({ screenshot, onOpen }) {

  const imageUrl = getImageUrl(screenshot);

  const category = getCategory(screenshot);

  const processing = isProcessing(screenshot);



  return (

    <article className="group overflow-hidden rounded-2xl border border-slate-800/90 bg-[#101722] transition-all duration-200 hover:-translate-y-1 hover:border-teal-400/40 hover:shadow-[0_12px_35px_rgba(0,0,0,0.24)]">

      <button

        type="button"

        onClick={() => onOpen(screenshot)}

        className="block w-full text-left"

        aria-label={`Open ${getTitle(screenshot)}`}

      >

        <div className="relative aspect-[4/3] overflow-hidden bg-[#0b111b]">

          {imageUrl ? (

            <img

              src={imageUrl}

              alt={getTitle(screenshot)}

              loading="lazy"

              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"

            />

          ) : (

            <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-600">

              <Icon name="file-image" size={38} />

              <span className="text-xs">Preview unavailable</span>

            </div>

          )}



          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10 opacity-60 transition-opacity group-hover:opacity-90" />



          <div className="absolute left-3 top-3">

            <span className="rounded-lg border border-white/10 bg-[#080d14]/80 px-2.5 py-1.5 text-[11px] font-medium text-slate-200 backdrop-blur-md">

              {category}

            </span>

          </div>



          {processing && (

            <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-lg border border-teal-300/20 bg-[#080d14]/85 px-2.5 py-1.5 text-[11px] text-teal-300 backdrop-blur-md">

              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal-300" />

              Processing

            </div>

          )}



          <div className="absolute bottom-3 right-3 flex h-9 w-9 translate-y-2 items-center justify-center rounded-xl border border-white/15 bg-black/45 text-white opacity-0 backdrop-blur-md transition-all group-hover:translate-y-0 group-hover:opacity-100">

            <Icon name="external-link" size={17} />

          </div>

        </div>

      </button>



      <div className="p-4">

        <div className="mb-2 flex items-start justify-between gap-3">

          <button

            type="button"

            onClick={() => onOpen(screenshot)}

            className="min-w-0 flex-1 text-left"

          >

            <h3 className="truncate text-sm font-semibold text-slate-100 transition-colors group-hover:text-teal-300">

              {getTitle(screenshot)}

            </h3>

          </button>

          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-400/80" />

        </div>



        <p className="mb-4 line-clamp-2 min-h-10 text-xs leading-5 text-slate-400">

          {getSummary(screenshot)}

        </p>



        <div className="flex items-center justify-between border-t border-slate-800 pt-3">

          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">

            <Icon name="clock-3" size={13} />

            <span>{formatDate(screenshot?.createdAt || screenshot?.created_at)}</span>

          </div>

          <button

            type="button"

            onClick={() => onOpen(screenshot)}

            className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-300 transition-colors hover:text-teal-200"

          >

            View details <Icon name="arrow-left" size={13} className="rotate-180" />

          </button>

        </div>

      </div>

    </article>

  );

}



export default function ScreenshotsPage() {

  const { user, isAuthenticated, isLoading, logout } = useAuth();

  const router = useRouter();



  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [selectedScreenshot, setSelectedScreenshot] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");

  const [selectedCategory, setSelectedCategory] = useState("All");

  const [sortBy, setSortBy] = useState("newest");

  const [page, setPage] = useState(1);

  const limit = 12;



  const [screenshots, setScreenshots] = useState([]);

  const [pagination, setPagination] = useState({

    total: 0,

    page: 1,

    pages: 1,

  });

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  const [isUploading, setIsUploading] = useState(false);

  const [uploadStatus, setUploadStatus] = useState("");

  const [successMessage, setSuccessMessage] = useState("");

  const [viewMode, setViewMode] = useState("grid");

  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);



  const fileInputRef = useRef(null);

  const pollIntervalRef = useRef(null);



  const userName =

    user?.name || user?.fullName || user?.email?.split("@")[0] || "User";



  useEffect(() => {

    if (!isLoading && !isAuthenticated) {

      router.replace("/login");

    }

  }, [isAuthenticated, isLoading, router]);



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



      if (selectedCategory !== "All") {

        params.category = selectedCategory;

      }



      if (searchQuery.trim()) {

        params.search = searchQuery.trim();

      }



      const res = await fetchScreenshotsApi(params);



      if (Array.isArray(res?.data)) {

        setScreenshots(res.data);

      } else {

        setScreenshots([]);

      }



      if (res?.pagination) {

        setPagination(res.pagination);

      } else {

        setPagination({

          total: Array.isArray(res?.data) ? res.data.length : 0,

          page,

          pages: 1,

        });

      }

    } catch (err) {

      console.error("Error loading screenshots:", err);

      setError("Unable to load your screenshots. Please try again.");

    } finally {

      setLoading(false);

    }

  }, [

    isAuthenticated,

    page,

    limit,

    sortBy,

    selectedCategory,

    searchQuery,

  ]);



  useEffect(() => {

    if (isAuthenticated) loadScreenshots();

  }, [isAuthenticated, loadScreenshots]);



  useEffect(() => {

    const hasUnfinished = screenshots.some(isProcessing);



    if (!hasUnfinished) {

      if (pollIntervalRef.current) {

        clearInterval(pollIntervalRef.current);

        pollIntervalRef.current = null;

      }

      return;

    }



    pollIntervalRef.current = setInterval(async () => {

      try {

        const params = { page, limit, sort: sortBy };



        if (selectedCategory !== "All") {

          params.category = selectedCategory;

        }



        if (searchQuery.trim()) {

          params.search = searchQuery.trim();

        }



        const refreshed = await fetchScreenshotsApi(params);



        if (Array.isArray(refreshed?.data)) {

          setScreenshots(refreshed.data);

        }

      } catch {

        // Ignore temporary background refresh errors.

      }

    }, 5000);



    return () => {

      if (pollIntervalRef.current) {

        clearInterval(pollIntervalRef.current);

        pollIntervalRef.current = null;

      }

    };

  }, [

    screenshots,

    page,

    limit,

    sortBy,

    selectedCategory,

    searchQuery,

  ]);



  const handleFileUpload = async (event) => {

    const file = event.target.files?.[0];

    if (!file) return;



    if (!file.type.startsWith("image/")) {

      setError("Please select an image file.");

      event.target.value = "";

      return;

    }



    setIsUploading(true);

    setUploadStatus("Uploading your screenshot...");

    setError(null);

    setSuccessMessage("");



    try {

      const res = await uploadScreenshotApi(file);



      if (res?.data) {

        setScreenshots((previous) => [

          res.data,

          ...previous.filter(

            (item) =>

              (item._id || item.id) !== (res.data._id || res.data.id)

          ),

        ]);



        setSelectedScreenshot(res.data);

        setSuccessMessage("Screenshot uploaded successfully.");

        setUploadStatus("");

        await loadScreenshots();

      } else {

        setUploadStatus("");

        setSuccessMessage("Upload completed. Refreshing screenshots...");

        await loadScreenshots();

      }

    } catch (err) {

      console.error("Upload failed:", err);

      setError(err?.message || "Upload failed. Please try again.");

    } finally {

      setIsUploading(false);

      setUploadStatus("");

      if (fileInputRef.current) fileInputRef.current.value = "";

    }

  };



  const handleDeleteScreenshot = async (id) => {

    try {

      await deleteScreenshotApi(id);



      setScreenshots((previous) =>

        previous.filter((item) => (item._id || item.id) !== id)

      );



      setSelectedScreenshot(null);

      setSuccessMessage("Screenshot deleted successfully.");

      await loadScreenshots();

    } catch (err) {

      console.error("Delete failed:", err);

      setError(err?.message || "Unable to delete this screenshot.");

    }

  };



  const clearSearch = () => {

    setSearchQuery("");

    setPage(1);

  };



  const totalPages = Math.max(

    1,

    Number(pagination?.pages) || 1

  );



  if (isLoading || (!isAuthenticated && !isLoading)) {

    return (

      <div className="flex min-h-screen items-center justify-center bg-[#080d14] text-slate-300">

        <div className="flex items-center gap-3 text-sm">

          <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-700 border-t-teal-300" />

          Loading your workspace...

        </div>

      </div>

    );

  }



  const handleOpenScreenshot = async (screenshot) => {

    const screenshotId = screenshot?._id || screenshot?.id;



    if (!screenshotId) {

      setSelectedScreenshot(screenshot);

      return;

    }



    try {

      const response = await fetchScreenshotByIdApi(screenshotId);

      setSelectedScreenshot(response?.data || screenshot);

    } catch (err) {

      console.error("Failed to load screenshot details:", err);

      setSelectedScreenshot(screenshot);

    }

  };





  return (

    <div className="min-h-screen bg-[#080d14] font-sans text-slate-100">

      <style jsx global>{`

        * {

          scrollbar-width: thin;

          scrollbar-color: #293747 #080d14;

        }

        ::selection {

          background: rgba(94, 234, 212, 0.22);

          color: #f8fafc;

        }

        .line-clamp-2 {

          display: -webkit-box;

          -webkit-line-clamp: 2;

          -webkit-box-orient: vertical;

          overflow: hidden;

        }

      `}</style>



      {/* Top navigation */}

      <header className="sticky top-0 z-40 flex h-[72px] items-center justify-between border-b border-slate-800/80 bg-[#0b111b]/95 px-4 backdrop-blur-xl sm:px-6 lg:px-8">

        <div className="flex min-w-0 items-center gap-3">

          <button

            type="button"

            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}

            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white md:hidden"

            aria-label="Toggle navigation"

          >

            <Icon name="menu" />

          </button>

          <Link

            href="/dashboard"

            className="font-extrabold text-xl tracking-tight text-gray-900 flex items-center gap-2 hover:text-indigo-600 transition-colors"

          >

            <span>RESecure</span>

          </Link>

        </div>



        <div className="mx-5 hidden w-full max-w-md lg:block">

          <div className="relative">

            <Icon

              name="search"

              size={17}

              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"

            />

            <input

              value={searchQuery}

              onChange={(event) => {

                setSearchQuery(event.target.value);

                setPage(1);

              }}

              placeholder="Search your screenshots..."

              className="w-full rounded-xl border border-slate-800 bg-[#101722] py-2.5 pl-10 pr-4 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-teal-400/50 focus:ring-2 focus:ring-teal-400/10"

            />

          </div>

        </div>



        <div className="flex shrink-0 items-center gap-2 sm:gap-4">

          <button

            type="button"

            onClick={() => setMobileSearchOpen(!mobileSearchOpen)}

            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-teal-300 lg:hidden"

            aria-label="Search"

          >

            <Icon name="search" />

          </button>



          <button

            type="button"

            onClick={() => fileInputRef.current?.click()}

            disabled={isUploading}

            className="inline-flex items-center gap-2 rounded-xl bg-teal-300 px-3.5 py-2.5 text-sm font-semibold text-[#071116] transition hover:bg-teal-200 disabled:cursor-not-allowed disabled:opacity-60 sm:px-4"

          >

            <Icon name="upload" size={17} />

            <span className="hidden sm:inline">

              {isUploading ? "Uploading..." : "Upload"}

            </span>

          </button>



          <div className="hidden h-8 w-px bg-slate-800 sm:block" />



          <div className="flex items-center gap-2.5">

            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-teal-300/20 bg-teal-300/10 text-xs font-bold text-teal-300">

              {userName.slice(0, 2).toUpperCase()}

            </div>

            <div className="hidden max-w-32 sm:block">

              <p className="truncate text-sm font-medium text-slate-200">

                {userName}

              </p>

              <p className="text-[11px] text-slate-500">Workspace</p>

            </div>

          </div>



          {typeof logout === "function" && (

            <button

              type="button"

              onClick={logout}

              title="Log out"

              className="hidden rounded-lg p-2 text-slate-500 transition hover:bg-rose-400/10 hover:text-rose-300 sm:block"

            >

              <Icon name="log-out" size={18} />

            </button>

          )}

        </div>

      </header>



      {mobileSearchOpen && (

        <div className="border-b border-slate-800 bg-[#0b111b] p-4 lg:hidden">

          <div className="relative">

            <Icon

              name="search"

              size={17}

              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"

            />

            <input

              autoFocus

              value={searchQuery}

              onChange={(event) => {

                setSearchQuery(event.target.value);

                setPage(1);

              }}

              placeholder="Search your screenshots..."

              className="w-full rounded-xl border border-slate-800 bg-[#101722] py-3 pl-10 pr-4 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-teal-400/50"

            />

          </div>

        </div>

      )}



      <div className="flex min-h-[calc(100vh-72px)]">

        {/* Shared Sidebar */}

        <Sidebar

          mobileMenuOpen={mobileMenuOpen}

          setMobileMenuOpen={setMobileMenuOpen}

          user={user}

          userName={userName}

        />



        {/* Main content */}

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-9">

          <div className="mx-auto max-w-[1440px]">

            {/* Breadcrumb */}

            <div className="mb-5 flex items-center gap-2 text-xs text-slate-500">

              <Link href="/dashboard" className="transition hover:text-slate-300">

                Workspace

              </Link>

              <span>/</span>

              <span className="text-teal-300">Screenshots</span>

            </div>



            {/* Page heading */}

            <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">

              <div>

                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-teal-300/15 bg-teal-300/[0.06] px-3 py-1.5 text-[11px] font-medium text-teal-300">

                  <Icon name="images" size={14} />

                  VISUAL LIBRARY

                </div>

                <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-[38px]">

                  Screenshots<span className="text-teal-300">.</span>

                </h1>

                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">

                  Your captured ideas, references, and discoveries — organized in one place.

                </p>

              </div>



              <div className="flex items-center gap-3">

                <div className="rounded-xl border border-slate-800 bg-[#101722] px-4 py-3">

                  <p className="text-[10px] uppercase tracking-wider text-slate-500">

                    In your library

                  </p>

                  <p className="mt-1 text-xl font-semibold text-slate-100">

                    {pagination?.total ?? screenshots.length}

                    <span className="ml-2 text-xs font-normal text-slate-500">

                      screenshots

                    </span>

                  </p>

                </div>

                <button

                  type="button"

                  onClick={() => loadScreenshots()}

                  disabled={loading}

                  title="Refresh screenshots"

                  className="flex h-[54px] w-[54px] items-center justify-center rounded-xl border border-slate-800 bg-[#101722] text-slate-400 transition hover:border-teal-300/30 hover:text-teal-300 disabled:opacity-50"

                >

                  <Icon

                    name="refresh-cw"

                    size={18}

                    className={loading ? "animate-spin" : ""}

                  />

                </button>

              </div>

            </div>



            {/* Status messages */}

            {isUploading && (

              <div className="mb-5 flex items-center gap-3 rounded-xl border border-teal-300/20 bg-teal-300/[0.06] px-4 py-3.5 text-sm text-teal-200">

                <span className="h-4 w-4 animate-spin rounded-full border-2 border-teal-300/30 border-t-teal-300" />

                {uploadStatus || "Uploading your screenshot..."}

              </div>

            )}



            {successMessage && (

              <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] px-4 py-3.5 text-sm text-emerald-300">

                <span className="flex items-center gap-2">

                  <Icon name="check-circle" size={17} />

                  {successMessage}

                </span>

                <button

                  type="button"

                  onClick={() => setSuccessMessage("")}

                  className="text-emerald-300/70 hover:text-emerald-200"

                  aria-label="Dismiss message"

                >

                  <Icon name="close" size={16} />

                </button>

              </div>

            )}



            {error && (

              <div className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-rose-400/20 bg-rose-400/[0.06] px-4 py-3.5 text-sm text-rose-300">

                <span className="flex items-start gap-2">

                  <Icon name="alert-circle" size={17} className="mt-0.5" />

                  {error}

                </span>

                <button

                  type="button"

                  onClick={() => setError(null)}

                  aria-label="Dismiss error"

                >

                  <Icon name="close" size={16} />

                </button>

              </div>

            )}



            {/* Search and sorting controls */}

            <section className="mb-6 rounded-2xl border border-slate-800/90 bg-[#0d141e] p-3 sm:p-4">

              <div className="flex flex-col gap-3 md:flex-row md:items-center">

                <div className="relative min-w-0 flex-1">

                  <Icon

                    name="search"

                    size={18}

                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"

                  />

                  <input

                    type="text"

                    value={searchQuery}

                    onChange={(event) => {

                      setSearchQuery(event.target.value);

                      setPage(1);

                    }}

                    placeholder="Search by title, text, tags, or description..."

                    className="w-full rounded-xl border border-slate-800 bg-[#101722] py-3 pl-11 pr-10 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-teal-300/50 focus:ring-2 focus:ring-teal-300/10"

                  />

                  {searchQuery && (

                    <button

                      type="button"

                      onClick={clearSearch}

                      aria-label="Clear search"

                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-white"

                    >

                      <Icon name="close" size={16} />

                    </button>

                  )}

                </div>



                <div className="flex items-center gap-2">

                  <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-800 bg-[#101722] px-3">

                    <Icon name="filter" size={16} className="shrink-0 text-slate-500" />

                    <select

                      value={selectedCategory}

                      onChange={(event) => {

                        setSelectedCategory(event.target.value);

                        setPage(1);

                      }}

                      className="min-w-0 flex-1 cursor-pointer bg-transparent py-3 text-xs text-slate-300 outline-none sm:text-sm"

                    >

                      {CATEGORIES.map((category) => (

                        <option

                          key={category}

                          value={category}

                          className="bg-[#101722]"

                        >

                          {category === "All" ? "All categories" : category}

                        </option>

                      ))}

                    </select>

                  </label>



                  <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-800 bg-[#101722] px-3">

                    <Icon

                      name="arrow-up-down"

                      size={16}

                      className="shrink-0 text-slate-500"

                    />

                    <select

                      value={sortBy}

                      onChange={(event) => {

                        setSortBy(event.target.value);

                        setPage(1);

                      }}

                      className="min-w-0 flex-1 cursor-pointer bg-transparent py-3 text-xs text-slate-300 outline-none sm:text-sm"

                    >

                      <option value="newest" className="bg-[#101722]">

                        Newest first

                      </option>

                      <option value="oldest" className="bg-[#101722]">

                        Oldest first

                      </option>

                    </select>

                  </label>

                </div>

              </div>

            </section>



            {/* Category tabs */}

            <div className="mb-7 flex items-center justify-between gap-4">

              <div className="flex min-w-0 items-center gap-2 overflow-x-auto pb-1">

                {CATEGORIES.map((category) => {

                  const active = selectedCategory === category;



                  return (

                    <button

                      key={category}

                      type="button"

                      onClick={() => {

                        setSelectedCategory(category);

                        setPage(1);

                      }}

                      className={`shrink-0 rounded-xl px-4 py-2.5 text-xs font-medium transition sm:text-sm ${active

                        ? "border border-teal-300/20 bg-teal-300 text-[#071116] shadow-[0_3px_15px_rgba(94,234,212,0.08)]"

                        : "border border-slate-800 bg-[#101722] text-slate-400 hover:border-slate-700 hover:text-slate-100"

                        }`}

                    >

                      {category}

                    </button>

                  );

                })}

              </div>



              <div className="hidden shrink-0 items-center gap-1 rounded-xl border border-slate-800 bg-[#101722] p-1 sm:flex">

                <button

                  type="button"

                  onClick={() => setViewMode("grid")}

                  title="Grid view"

                  className={`rounded-lg p-2 transition ${viewMode === "grid"

                    ? "bg-slate-700/70 text-teal-300"

                    : "text-slate-500 hover:text-slate-200"

                    }`}

                >

                  <Icon name="layout-grid" size={17} />

                </button>

                <button

                  type="button"

                  onClick={() => setViewMode("list")}

                  title="List view"

                  className={`rounded-lg p-2 transition ${viewMode === "list"

                    ? "bg-slate-700/70 text-teal-300"

                    : "text-slate-500 hover:text-slate-200"

                    }`}

                >

                  <Icon name="list" size={17} />

                </button>

              </div>

            </div>



            {/* Results heading */}

            <div className="mb-4 flex items-center justify-between gap-3">

              <div>

                <h2 className="text-sm font-semibold text-slate-200">

                  {searchQuery.trim()

                    ? "Search results"

                    : selectedCategory === "All"

                      ? "All screenshots"

                      : `${selectedCategory} screenshots`}

                </h2>

                <p className="mt-1 text-xs text-slate-500">

                  {loading

                    ? "Updating your library..."

                    : `${screenshots.length} shown on this page`}

                </p>

              </div>

              <span className="hidden text-xs text-slate-500 sm:block">

                Page {page} of {totalPages}

              </span>

            </div>



            {/* Loading state */}

            {loading && (

              <div

                className={`grid gap-5 ${viewMode === "grid"

                  ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"

                  : "grid-cols-1"

                  }`}

              >

                {Array.from({ length: 8 }).map((_, index) => (

                  <div

                    key={index}

                    className="overflow-hidden rounded-2xl border border-slate-800 bg-[#101722]"

                  >

                    <div className="aspect-[4/3] animate-pulse bg-slate-800/70" />

                    <div className="space-y-3 p-4">

                      <div className="h-3 w-1/3 animate-pulse rounded bg-slate-800" />

                      <div className="h-4 w-3/4 animate-pulse rounded bg-slate-800" />

                      <div className="h-3 w-full animate-pulse rounded bg-slate-800/70" />

                    </div>

                  </div>

                ))}

              </div>

            )}



            {/* Error state */}

            {!loading && error && screenshots.length === 0 && (

              <div className="rounded-2xl border border-slate-800 bg-[#0d141e] px-6 py-16 text-center">

                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-400/10 text-rose-300">

                  <Icon name="alert-circle" size={26} />

                </div>

                <h3 className="text-base font-semibold text-white">

                  We couldn't load your library

                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">

                  Check your connection and try loading your screenshots again.

                </p>

                <button

                  type="button"

                  onClick={loadScreenshots}

                  className="mt-5 rounded-xl bg-teal-300 px-5 py-2.5 text-sm font-semibold text-[#071116] transition hover:bg-teal-200"

                >

                  Try again

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



            {/* Screenshot Cards */}

            {!loading && !error && screenshots.length > 0 && (

              <div

                className={`grid gap-5 ${viewMode === "grid"

                  ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"

                  : "grid-cols-1"

                  }`}

              >

                {screenshots.map((screenshot) => (

                  <ScreenshotCard

                    key={screenshot._id || screenshot.id}

                    screenshot={screenshot}

                    onOpen={handleOpenScreenshot}

                  />

                ))}

              </div>

            )}





            {/* Pagination */}

            {!loading && screenshots.length > 0 && totalPages > 1 && (

              <div className="mt-9 flex flex-col items-center justify-between gap-4 border-t border-slate-800 pt-5 sm:flex-row">

                <p className="text-xs text-slate-500">

                  Page <span className="font-medium text-slate-300">{page}</span>{" "}

                  of <span className="font-medium text-slate-300">{totalPages}</span>

                </p>



                <div className="flex items-center gap-2">

                  <button

                    type="button"

                    disabled={page <= 1}

                    onClick={() => setPage((previous) => Math.max(1, previous - 1))}

                    className="rounded-xl border border-slate-800 bg-[#101722] px-4 py-2.5 text-xs font-medium text-slate-300 transition hover:border-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"

                  >

                    Previous

                  </button>

                  <span className="flex h-9 min-w-9 items-center justify-center rounded-lg bg-teal-300 px-3 text-xs font-semibold text-[#071116]">

                    {page}

                  </span>

                  <button

                    type="button"

                    disabled={page >= totalPages}

                    onClick={() =>

                      setPage((previous) => Math.min(totalPages, previous + 1))

                    }

                    className="rounded-xl border border-slate-800 bg-[#101722] px-4 py-2.5 text-xs font-medium text-slate-300 transition hover:border-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"

                  >

                    Next

                  </button>

                </div>

              </div>

            )}



            <footer className="mt-12 border-t border-slate-800/70 py-5 text-center text-[11px] text-slate-600">

              ReSurface · Your visual workspace

            </footer>

          </div>

        </main>

      </div>



      {/* Hidden file picker */}

      <input

        ref={fileInputRef}

        type="file"

        accept="image/*"

        onChange={handleFileUpload}

        className="hidden"

      />



      {/* Existing screenshot details modal */}

      {selectedScreenshot && (

        <ScreenshotDetailsModal

          screenshot={selectedScreenshot}

          onClose={() => setSelectedScreenshot(null)}

          onDelete={handleDeleteScreenshot}

        />

      )}

    </div>

  );

}