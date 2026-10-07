"use client";

import { useState, useEffect, useRef } from "react";
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

export default function Dashboard() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();

  // Navigation State
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Search & Modal State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedScreenshot, setSelectedScreenshot] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);

  // Backend Screenshot Data
  const [dbScreenshots, setDbScreenshots] = useState([]);
  const [dbLoading, setDbLoading] = useState(false);

  // Polling ref for processing state
  const pollIntervalRef = useRef(null);

  // Protect Route: Redirect unauthenticated users to /login
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  // Fetch real screenshots from MongoDB backend for logged-in user
  const loadScreenshots = async () => {
    if (!isAuthenticated) return;
    setDbLoading(true);
    try {
      const res = await fetchScreenshotsApi();
      if (res?.data && Array.isArray(res.data)) {
        setDbScreenshots(res.data);
      }
    } catch (err) {
      console.warn("Error fetching user screenshots:", err.message);
    } finally {
      setDbLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadScreenshots();
    }
  }, [isAuthenticated]);

  // Auto-poll selected screenshot if processing is pending
  useEffect(() => {
    if (
      selectedScreenshot &&
      (selectedScreenshot.processingPipeline?.overall !== "completed" &&
        selectedScreenshot.processingPipeline?.overall !== "failed" &&
        (selectedScreenshot.ocr?.status === "processing" ||
          selectedScreenshot.aiAnalysis?.status === "processing" ||
          selectedScreenshot.aiAnalysis?.status === "pending"))
    ) {
      pollIntervalRef.current = setInterval(async () => {
        try {
          const fresh = await fetchScreenshotByIdApi(
            selectedScreenshot._id || selectedScreenshot.id
          );
          if (fresh?.data) {
            setSelectedScreenshot(fresh.data);
            setDbScreenshots((prev) =>
              prev.map((item) =>
                (item._id || item.id) === (fresh.data._id || fresh.data.id)
                  ? fresh.data
                  : item
              )
            );
            if (
              fresh.data.processingPipeline?.overall === "completed" ||
              fresh.data.processingPipeline?.overall === "failed" ||
              (fresh.data.ocr?.status !== "processing" &&
                fresh.data.aiAnalysis?.status !== "processing" &&
                fresh.data.aiAnalysis?.status !== "pending")
            ) {
              clearInterval(pollIntervalRef.current);
            }
          }
        } catch (_err) {
          // ignore poll error
        }
      }, 2500);
    }

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [selectedScreenshot]);

  // Dynamic Greeting based on local time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const userName = user?.name || "AMAN";

  // Demo / Fallback Screenshots if database is empty for display
  const fallbackScreenshots = [
    {
      id: "demo-1",
      title: "Campus Note & Congestion Control",
      imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80",
      category: "Document",
      summary: "Congestion detection mechanisms in TCP protocols: timeout slow-start vs 3-ACK fast recovery.",
      tags: ["networking", "TCP", "notes"],
      ocr: {
        status: "completed",
        extractedText:
          "An implementation reacts to congestion detection in one of the following ways:\n\nIf detection is by time-out, a new slow start phase starts.\n\nIf detection is by three ACKs, a new congestion avoidance phase starts.",
      },
      aiAnalysis: {
        status: "completed",
        title: "Campus Note & Congestion Control",
        summary: "Congestion detection mechanisms in TCP protocols: timeout slow-start vs 3-ACK fast recovery.",
        category: "Document",
        tags: ["networking", "TCP", "notes"],
        entities: {
          dates: ["Tomorrow, 10:00 AM"],
          amounts: [],
          urls: ["https://ietf.org/rfc/tcp"],
          emails: [],
          phoneNumbers: [],
          addresses: [],
          names: ["TCP Protocol"],
        },
        extractedDates: [{ dateText: "Tomorrow, 10:00 AM", context: "Network lab session" }],
        extractedTasks: [{ task: "Submit Network Assignment", dueDate: "2026-10-15", priority: "high" }],
        extractedEvents: [],
        actionItems: [
          { description: "Submit Network Assignment", dueDate: "2026-10-15", isCompleted: false },
        ],
      },
      processingPipeline: { overall: "completed" },
      createdAt: new Date().toISOString(),
    },
    {
      id: "demo-2",
      title: "AWS Cloud Infrastructure Invoice",
      imageUrl: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80",
      category: "Receipt",
      summary: "Monthly AWS billing invoice showing $142.50 charge for EC2 and S3 resources.",
      tags: ["finance", "aws", "invoice"],
      ocr: {
        status: "completed",
        extractedText: "Amazon Web Services Invoice\nDate: Oct 01, 2026\nAccount: 4892-1029-3810\nTotal Due: $142.50\nPayment Method: Visa ending in 4092",
      },
      aiAnalysis: {
        status: "completed",
        title: "AWS Cloud Infrastructure Invoice",
        summary: "Monthly AWS billing invoice showing $142.50 charge for EC2 and S3 resources.",
        category: "Receipt",
        tags: ["finance", "aws", "invoice"],
        entities: {
          amounts: ["$142.50"],
          dates: ["Oct 01, 2026"],
          emails: ["billing@aws.amazon.com"],
          urls: [],
          phoneNumbers: [],
          addresses: [],
          names: ["Amazon Web Services"],
        },
        extractedDates: [{ dateText: "Oct 01, 2026", context: "Invoice date" }],
        extractedTasks: [{ task: "Process accounting expense entry", dueDate: "2026-10-15", priority: "medium" }],
        extractedEvents: [],
        actionItems: [
          { description: "Process accounting expense entry", dueDate: "2026-10-15", isCompleted: false },
        ],
      },
      processingPipeline: { overall: "completed" },
      createdAt: new Date().toISOString(),
    },
    {
      id: "demo-3",
      title: "Tech Conference Boarding Pass",
      imageUrl: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600&auto=format&fit=crop&q=80",
      category: "Ticket",
      summary: "Boarding ticket for Delta Flight DL492 leaving JFK at 08:30 AM.",
      tags: ["flight", "travel", "ticket"],
      ocr: {
        status: "completed",
        extractedText: "DELTA AIRLINES BOARDING PASS\nFLIGHT: DL492\nFROM: JFK TO: SFO\nDATE: 2026-10-20\nDEPART: 08:30 AM\nSEAT: 14B ZONE: 3",
      },
      aiAnalysis: {
        status: "completed",
        title: "Tech Conference Boarding Pass",
        summary: "Boarding ticket for Delta Flight DL492 leaving JFK at 08:30 AM.",
        category: "Ticket",
        tags: ["flight", "travel", "ticket"],
        entities: {
          dates: ["2026-10-20"],
          names: ["Delta Airlines"],
          amounts: [],
          urls: [],
          emails: [],
          phoneNumbers: [],
          addresses: [],
        },
        extractedDates: [{ dateText: "2026-10-20", context: "Flight departure date" }],
        extractedTasks: [],
        extractedEvents: [{ event: "Flight DL492", date: "2026-10-20", time: "08:30 AM", location: "JFK to SFO" }],
        actionItems: [],
      },
      processingPipeline: { overall: "completed" },
      createdAt: new Date().toISOString(),
    },
    {
      id: "demo-4",
      title: "React Debounce Custom Hook",
      imageUrl: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=80",
      category: "Code",
      summary: "Clean React custom hook implementation for input throttling.",
      tags: ["react", "javascript", "code"],
      ocr: {
        status: "completed",
        extractedText: "function useDebounce(value, delay) {\n  const [debouncedValue, setDebouncedValue] = useState(value);\n  useEffect(() => {\n    const handler = setTimeout(() => setDebouncedValue(value), delay);\n    return () => clearTimeout(handler);\n  }, [value, delay]);\n  return debouncedValue;\n}",
      },
      aiAnalysis: {
        status: "completed",
        title: "React Debounce Custom Hook",
        summary: "Clean React custom hook implementation for input throttling.",
        category: "Code",
        tags: ["react", "javascript", "code"],
        entities: { dates: [], amounts: [], urls: [], emails: [], phoneNumbers: [], addresses: [], names: [] },
        extractedDates: [],
        extractedTasks: [],
        extractedEvents: [],
        actionItems: [],
      },
      processingPipeline: { overall: "completed" },
      createdAt: new Date().toISOString(),
    },
  ];

  const displayScreenshots = dbScreenshots.length > 0 ? dbScreenshots : fallbackScreenshots;
  const screenshotCount = dbScreenshots.length > 0 ? dbScreenshots.length : 128;
  const taskCount = 13;
  const eventCount = 6;

  // File Upload Handler with Instant Details View opening
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStatus("Uploading to Cloudinary...");

    try {
      const res = await uploadScreenshotApi(file);
      if (res?.data) {
        const newDoc = res.data;
        setDbScreenshots((prev) => [newDoc, ...prev]);
        setUploadStatus("Upload complete — AI processing started...");
        // Open details modal immediately with actual MongoDB returned data!
        setSelectedScreenshot(newDoc);
      }
    } catch (err) {
      console.error("Upload error:", err.message);
      setUploadStatus(`Upload failed: ${err.message}`);
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setUploadStatus(null);
      }, 2000);
    }
  };

  const handleDeleteScreenshot = async (id) => {
    try {
      await deleteScreenshotApi(id);
      // Remove from UI state immediately
      setDbScreenshots((prev) => prev.filter((s) => s._id !== id && s.id !== id));
      setSelectedScreenshot(null);
    } catch (err) {
      console.error("Delete failed:", err.message);
      alert(`Failed to delete screenshot: ${err.message}`);
    }
  };

  // Helper to extract category, tags, and summary safely from document
  const getDocField = (doc, field, fallback = "") => {
    if (!doc) return fallback;
    if (field === "summary") {
      return doc.aiAnalysis?.summary || doc.summary || fallback;
    }
    if (field === "category") {
      return doc.aiAnalysis?.category || doc.category || fallback || "Other";
    }
    if (field === "title") {
      return doc.aiAnalysis?.title || doc.title || doc.originalName || fallback || "Screenshot Details";
    }
    if (field === "ocrText") {
      return doc.ocr?.extractedText || doc.extractedText || "";
    }
    return fallback;
  };

  // Extract tags array
  const getDocTags = (doc) => {
    if (!doc) return [];
    if (Array.isArray(doc.aiAnalysis?.tags) && doc.aiAnalysis.tags.length > 0) {
      return doc.aiAnalysis.tags;
    }
    if (Array.isArray(doc.tags)) return doc.tags;
    return [];
  };

  // Extract extracted dates
  const getDocExtractedDates = (doc) => {
    if (!doc) return [];
    if (Array.isArray(doc.aiAnalysis?.extractedDates) && doc.aiAnalysis.extractedDates.length > 0) {
      return doc.aiAnalysis.extractedDates;
    }
    // Fallback to entity dates
    if (Array.isArray(doc.aiAnalysis?.entities?.dates) && doc.aiAnalysis.entities.dates.length > 0) {
      return doc.aiAnalysis.entities.dates.map((d) => ({ dateText: d, context: "" }));
    }
    if (Array.isArray(doc.dates) && doc.dates.length > 0) {
      return doc.dates.map((d) => ({
        dateText: d instanceof Date ? d.toLocaleDateString() : String(d),
        context: "",
      }));
    }
    return [];
  };

  // Extract extracted tasks
  const getDocExtractedTasks = (doc) => {
    if (!doc) return [];
    if (Array.isArray(doc.aiAnalysis?.extractedTasks) && doc.aiAnalysis.extractedTasks.length > 0) {
      return doc.aiAnalysis.extractedTasks;
    }
    if (Array.isArray(doc.aiAnalysis?.actionItems) && doc.aiAnalysis.actionItems.length > 0) {
      return doc.aiAnalysis.actionItems.map((item) => ({
        task: item.description || "Task",
        dueDate: item.dueDate || null,
        priority: "medium",
      }));
    }
    if (Array.isArray(doc.tasks) && doc.tasks.length > 0) {
      return doc.tasks.map((t) => ({
        task: t.description || "Task",
        dueDate: t.dueDate || null,
        priority: t.priority || "medium",
      }));
    }
    return [];
  };

  // Extract extracted events
  const getDocExtractedEvents = (doc) => {
    if (!doc) return [];
    if (Array.isArray(doc.aiAnalysis?.extractedEvents) && doc.aiAnalysis.extractedEvents.length > 0) {
      return doc.aiAnalysis.extractedEvents;
    }
    return [];
  };

  // Extract entities object
  const getDocEntities = (doc) => {
    if (!doc || !doc.aiAnalysis?.entities) return null;
    const e = doc.aiAnalysis.entities;
    const hasAny =
      (e.amounts && e.amounts.length > 0) ||
      (e.urls && e.urls.length > 0) ||
      (e.emails && e.emails.length > 0) ||
      (e.phoneNumbers && e.phoneNumbers.length > 0) ||
      (e.addresses && e.addresses.length > 0) ||
      (e.names && e.names.length > 0);
    return hasAny ? e : null;
  };

  // Get processing pipeline status
  const getPipelineStatus = (doc) => {
    if (!doc) return null;
    return doc.processingPipeline || null;
  };

  const isProcessing = (doc) => {
    if (!doc) return false;
    const pipeline = doc.processingPipeline;
    if (pipeline) {
      return pipeline.overall !== "completed" && pipeline.overall !== "failed";
    }
    return (
      doc.ocr?.status === "processing" ||
      doc.aiAnalysis?.status === "processing" ||
      doc.aiAnalysis?.status === "pending"
    );
  };

  // Sidebar Menu Config
  const primaryNavItems = [
    { name: "Dashboard", icon: "🏠", href: "/dashboard" },
    { name: "Screenshots", icon: "📸", href: "/screenshots" },
    { name: "Categories", icon: "📂", href: "/screenshots" },
    { name: "Action Center", icon: "📝", href: "/action-center" },
    { name: "Calendar", icon: "📅", href: "/dashboard" },
    { name: "Reminders", icon: "🔔" },
    { name: "Vault", icon: "🔒" },
    { name: "Insights", icon: "📊" },
  ];

  const secondaryNavItems = [
    { name: "Settings", icon: "⚙️" },
    { name: "Help", icon: "❓" },
  ];

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-gray-500 font-sans">
        <div className="flex items-center gap-3">
          <svg className="animate-spin h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm font-medium">Authenticating & loading dashboard...</span>
        </div>
      </div>
    );
  }

  // Pipeline step indicator component
  const PipelineStep = ({ label, status, icon }) => {
    const statusColors = {
      pending: "bg-gray-200 text-gray-500",
      processing: "bg-amber-100 text-amber-700 animate-pulse",
      completed: "bg-emerald-100 text-emerald-700",
      failed: "bg-red-100 text-red-700",
    };
    const statusIcons = {
      pending: "⏳",
      processing: "⚙️",
      completed: "✅",
      failed: "❌",
    };

    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold ${statusColors[status] || statusColors.pending}`}>
        <span>{statusIcons[status] || icon}</span>
        <span>{label}</span>
      </div>
    );
  };

  const allActions = [];
  displayScreenshots.forEach((s) => {
    if (isProcessing(s)) return;
    
    if (s.aiAnalysis?.extractedTasks) {
       s.aiAnalysis.extractedTasks.forEach((t) => allActions.push({ title: t.task, date: t.dueDate, type: 'task', icon: '🔴', color: 'red', source: s }));
    } else if (s.aiAnalysis?.actionItems) { 
       s.aiAnalysis.actionItems.forEach((t) => allActions.push({ title: t.description, date: t.dueDate, type: 'task', icon: '🔴', color: 'red', source: s }));
    }

    if (s.aiAnalysis?.extractedEvents) {
       s.aiAnalysis.extractedEvents.forEach((e) => allActions.push({ title: e.event, date: e.date, type: 'event', icon: '🟣', color: 'indigo', source: s }));
    }

    if (s.aiAnalysis?.extractedDates) {
       s.aiAnalysis.extractedDates.forEach((d) => allActions.push({ title: d.context, date: d.dateText, type: 'date', icon: '🟡', color: 'amber', source: s }));
    }
  });

  const recentActions = allActions.slice(0, 3);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col antialiased">
      {/* 1. TOP HEADER BAR */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Toggle navigation"
          >
            <span className="text-xl">☰</span>
          </button>

          <Link href="/dashboard" className="flex items-center gap-2 group">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center font-extrabold text-white text-sm shadow-sm group-hover:bg-indigo-700 transition-colors">
              RE
            </div>
            <span className="font-extrabold text-xl tracking-tight text-gray-900">
              RESecure
            </span>
          </Link>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-md mx-4 hidden sm:block">
          <div className="relative">
            <input
              type="text"
              placeholder="Search screenshots..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 rounded-full py-2 px-4 pl-10 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
            <span className="absolute left-3.5 top-2.5 text-gray-400 text-sm">🔍</span>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3 sm:gap-5">
          <label className="cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition-all">
            <span>+ Upload</span>
            <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
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

      {/* DASHBOARD BODY */}
      <div className="flex-1 flex overflow-hidden">
        {/* 2. LEFT SIDEBAR */}
        <aside
          className={`${
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          } md:translate-x-0 fixed md:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 flex flex-col justify-between transition-transform duration-200 ease-in-out shrink-0`}
        >
          <div className="p-4 overflow-y-auto">
            <div className="px-3 py-2 font-extrabold text-xl tracking-tight text-gray-900">
              RESecure
            </div>

            <div className="border-t border-gray-200 my-3" />

            <nav className="space-y-1">
              {primaryNavItems.map((item) => {
                const isActive = activeTab === item.name;
                return (
                  <button
                    key={item.name}
                    onClick={() => {
                      if (item.name === "Screenshots" || item.name === "Categories") {
                        router.push("/screenshots");
                      } else if (item.name === "Action Center") {
                        router.push("/action-center");
                      } else {
                        setActiveTab(item.name);
                      }
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? "bg-indigo-50 text-indigo-600 font-semibold border-r-4 border-indigo-600"
                        : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    <span className="text-base">{item.icon}</span>
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </nav>

            <div className="border-t border-gray-200 my-4" />

            <nav className="space-y-1">
              {secondaryNavItems.map((item) => {
                const isActive = activeTab === item.name;
                return (
                  <button
                    key={item.name}
                    onClick={() => {
                      setActiveTab(item.name);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? "bg-indigo-50 text-indigo-600 font-semibold"
                        : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    <span className="text-base">{item.icon}</span>
                    <span className={item.name === "Help" ? "text-rose-600 font-semibold" : ""}>
                      {item.name}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-4 border-t border-gray-200 bg-gray-50/50">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Logged in as
            </div>
            <div className="text-sm font-bold text-gray-900 truncate">{userName}</div>
            <div className="text-xs text-gray-500 truncate">{user?.email}</div>
          </div>
        </aside>

        {mobileMenuOpen && (
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden fixed inset-0 z-20 bg-gray-900/30 backdrop-blur-xs"
          />
        )}

        {/* 3. MAIN DASHBOARD CONTENT AREA */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 max-w-7xl mx-auto w-full">
          {/* Upload Status Alert */}
          {isUploading && (
            <div className="mb-6 p-4 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-sm flex items-center gap-3 animate-pulse shadow-sm">
              <span className="h-3 w-3 rounded-full bg-indigo-600 animate-ping" />
              <span className="font-semibold">{uploadStatus}</span>
            </div>
          )}

          {/* GREETING HEADER */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              {getGreeting()}, {userName} 👋
            </h1>
            <p className="text-gray-500 text-sm sm:text-base mt-1 font-normal">
              Here's what your screenshots are telling you.
            </p>
          </div>

          {/* 4. STATISTICS CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">📸</span>
                <span className="font-extrabold text-xl text-gray-900">Screenshots</span>
              </div>
              <div className="text-4xl font-black text-gray-900 text-center py-2">
                {dbLoading ? "..." : screenshotCount}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">📋</span>
                <span className="font-extrabold text-xl text-gray-900">Task</span>
              </div>
              <div className="text-4xl font-black text-gray-900 text-center py-2">
                {taskCount}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">📅</span>
                <span className="font-extrabold text-xl text-gray-900">Events</span>
              </div>
              <div className="text-4xl font-black text-gray-900 text-center py-2">
                {eventCount}
              </div>
            </div>
          </div>

          {/* MIDDLE GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* 5. RECENT SCREENSHOTS CARD */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-gray-900 text-center mb-6">
                  Recent Screenshots
                </h2>

                <div className="grid grid-cols-4 gap-3 sm:gap-4 mb-6">
                  {displayScreenshots.slice(0, 8).map((item, idx) => (
                    <div
                      key={item._id || item.id || idx}
                      onClick={() => setSelectedScreenshot(item)}
                      className="group relative aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-200 cursor-pointer hover:shadow-md hover:border-indigo-400 transition-all"
                    >
                      <img
                        src={item.thumbnailUrl || item.imageUrl || item.storage?.thumbnailUrl || item.storage?.imageUrl || "https://images.unsplash.com/photo-1544717305-2782549b5136?w=300&auto=format&fit=crop&q=80"}
                        alt={getDocField(item, "title")}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      <div className="absolute inset-0 bg-gray-900/0 group-hover:bg-gray-900/10 transition-colors" />
                      {/* Processing indicator overlay */}
                      {isProcessing(item) && (
                        <div className="absolute bottom-1 right-1">
                          <span className="inline-block h-3 w-3 rounded-full bg-amber-400 animate-pulse border border-white shadow" title="Processing..." />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-start pt-2">
                <button
                  onClick={() => router.push("/screenshots")}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-900 hover:text-indigo-600 transition-colors"
                >
                  <span>🔍 View All →</span>
                </button>
              </div>
            </div>

            {/* 6. ACTION CENTER CARD */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-gray-900 text-center mb-8">
                  Action Center
                </h2>

                <div className="space-y-6 px-4">
                  {recentActions.length > 0 ? recentActions.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-base sm:text-lg font-medium text-gray-800">
                      <span className="text-lg">{item.type === 'task' ? '🔴' : item.type === 'event' ? '🟣' : '🟡'}</span>
                      <span className="truncate">{item.title}</span>
                    </div>
                  )) : (
                    <div className="text-gray-400 text-center text-sm italic">No suggested actions.</div>
                  )}
                </div>
              </div>
              
              <div className="flex justify-start pt-6">
                <Link
                  href="/action-center"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-900 hover:text-indigo-600 transition-colors"
                >
                  <span>📝 View Inbox →</span>
                </Link>
              </div>
            </div>
          </div>

          {/* BOTTOM GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 7. UPCOMING CARD */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-gray-900 text-center mb-8">
                  Upcoming
                </h2>

                <div className="space-y-6 px-4">
                  {recentActions.length > 0 ? recentActions.map((item, idx) => (
                    <div key={idx} className="flex flex-col mb-4">
                       <div className="flex items-center justify-between">
                         <div className="flex items-center gap-3 text-base font-medium text-gray-800">
                           <span className="text-lg">{item.icon}</span>
                           <span className="truncate max-w-[150px] sm:max-w-[200px]">{item.title}</span>
                         </div>
                         <button onClick={() => setSelectedScreenshot(item.source)} className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold bg-indigo-50 px-2 py-1 rounded">View</button>
                       </div>
                       {item.date && <div className="text-xs text-gray-500 ml-9 mt-1">Date: {item.date}</div>}
                    </div>
                  )) : (
                    <div className="text-gray-400 text-center text-sm italic">No upcoming items.</div>
                  )}
                </div>
              </div>
              
              <div className="flex justify-start pt-6">
                <Link
                  href="/action-center"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-900 hover:text-indigo-600 transition-colors"
                >
                  <span>🔍 View All →</span>
                </Link>
              </div>
            </div>

            {/* 8. SMART INSIGHTS CARD */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs">
              <h2 className="text-xl font-extrabold text-gray-900 text-center mb-8">
                Smart Insights
              </h2>

              <div className="space-y-6 px-4">
                <div className="flex items-center gap-3 text-base sm:text-lg font-medium text-gray-800">
                  <span className="text-lg">📸</span>
                  <span>20 Screenshots detected as notes</span>
                </div>

                <div className="flex items-center gap-3 text-base sm:text-lg font-medium text-gray-800">
                  <span className="text-lg">🧠</span>
                  <span>5 Possible actions</span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* REUSED SCREENSHOT DETAILS MODAL */}
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
