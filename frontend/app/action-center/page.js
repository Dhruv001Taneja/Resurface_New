"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { fetchScreenshotsApi, deleteScreenshotApi } from "../utils/api";
import Sidebar from "../components/Sidebar";
import ScreenshotDetailsModal from "../components/ScreenshotDetailsModal";

export default function ActionCenter() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [screenshots, setScreenshots] = useState([]);
  const [dbLoading, setDbLoading] = useState(true);
  
  const [filter, setFilter] = useState("All"); 
  const [selectedScreenshot, setSelectedScreenshot] = useState(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      const loadData = async () => {
        try {
          const res = await fetchScreenshotsApi();
          if (res?.data && Array.isArray(res.data)) {
            setScreenshots(res.data);
          }
        } catch (err) {
          console.warn(err);
        } finally {
          setDbLoading(false);
        }
      };
      loadData();
    }
  }, [isAuthenticated]);

  const handleDeleteScreenshot = async (id) => {
    try {
      await deleteScreenshotApi(id);
      setScreenshots((prev) => prev.filter((s) => s._id !== id && s.id !== id));
      setSelectedScreenshot(null);
    } catch (err) {
      alert(`Failed to delete screenshot: ${err.message}`);
    }
  };

  const handleReminder = () => {
    alert("Reminder integration not yet implemented.");
  };

  const handleCalendar = () => {
    alert("Calendar integration not yet implemented.");
  };
  
  const handleDismiss = () => {
     alert("Dismiss functionality is not yet implemented in the data model.");
  };

  // Derive items
  const allTasks = [];
  const allEvents = [];
  const allDates = [];

  screenshots.forEach((s) => {
    const pipeline = s.processingPipeline;
    if (pipeline && (pipeline.overall === "processing" || pipeline.overall === "failed")) return;
    
    if (s.aiAnalysis?.extractedTasks) {
       s.aiAnalysis.extractedTasks.forEach((t, i) => allTasks.push({ ...t, type: 'task', id: `t-${s._id}-${i}`, source: s }));
    } else if (s.aiAnalysis?.actionItems) { 
       s.aiAnalysis.actionItems.forEach((t, i) => allTasks.push({ task: t.description, dueDate: t.dueDate, type: 'task', id: `t-${s._id}-${i}`, source: s }));
    }

    if (s.aiAnalysis?.extractedEvents) {
       s.aiAnalysis.extractedEvents.forEach((e, i) => allEvents.push({ ...e, type: 'event', id: `e-${s._id}-${i}`, source: s }));
    }

    if (s.aiAnalysis?.extractedDates) {
       s.aiAnalysis.extractedDates.forEach((d, i) => allDates.push({ ...d, type: 'date', id: `d-${s._id}-${i}`, source: s }));
    }
  });

  const totalItems = allTasks.length + allEvents.length + allDates.length;

  const getFilteredItems = () => {
    if (filter === "Tasks") return allTasks;
    if (filter === "Events") return allEvents;
    if (filter === "Important Dates") return allDates;
    return [...allTasks, ...allEvents, ...allDates];
  };

  const userName = user?.name || user?.email?.split("@")[0] || "User";

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-gray-500 font-sans">
        Authenticating...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans antialiased text-gray-900">
      <header className="h-16 bg-white border-b border-gray-200 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-gray-600 hover:text-gray-900 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <span className="text-xl">☰</span>
          </button>
          <Link href="/dashboard" className="font-extrabold text-xl tracking-tight text-gray-900 flex items-center gap-2 hover:text-indigo-600 transition-colors">
            RESecure
          </Link>
        </div>

        <div className="flex items-center gap-3 sm:gap-5">
          <div className="flex items-center gap-2 border-l border-gray-200 pl-3 sm:pl-4">
            <div className="h-8 w-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center font-bold text-indigo-700 text-xs">
              {userName.substring(0, 2).toUpperCase()}
            </div>
            <span className="font-bold text-sm text-gray-800 hidden sm:inline-block">
              {userName}
            </span>
            <button
              onClick={logout}
              className="ml-1 text-xs font-semibold text-gray-500 hover:text-rose-600 hover:bg-rose-50 px-2 py-1 rounded transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          user={user}
          userName={userName}
          activePage="Action Center"
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-8 max-w-5xl mx-auto w-full">
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Action Center
            </h1>
            <p className="text-gray-500 text-sm sm:text-base mt-1 font-normal">
              AI-detected tasks, events and important dates from your screenshots.
            </p>
          </div>

          {/* SUMMARY CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs text-center">
              <div className="text-gray-500 text-xs font-bold uppercase mb-1">Total Items</div>
              <div className="text-3xl font-black text-gray-900">{totalItems}</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 shadow-xs text-center">
              <div className="text-red-600 text-xs font-bold uppercase mb-1">Tasks</div>
              <div className="text-3xl font-black text-red-700">{allTasks.length}</div>
            </div>
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 shadow-xs text-center">
              <div className="text-indigo-600 text-xs font-bold uppercase mb-1">Events</div>
              <div className="text-3xl font-black text-indigo-700">{allEvents.length}</div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-xs text-center">
              <div className="text-amber-600 text-xs font-bold uppercase mb-1">Important Dates</div>
              <div className="text-3xl font-black text-amber-700">{allDates.length}</div>
            </div>
          </div>

          {/* FILTER TABS */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {["All", "Tasks", "Events", "Important Dates"].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  filter === tab
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* ACTION CARDS */}
          {dbLoading ? (
            <div className="text-center py-12 text-gray-400 font-medium">Loading items...</div>
          ) : getFilteredItems().length === 0 ? (
            <div className="text-center py-12 text-gray-400 font-medium">No items found.</div>
          ) : (
            <div className="space-y-4">
              {getFilteredItems().map((item) => {
                if (item.type === "task") {
                  return (
                    <div key={item.id} className="bg-red-50/50 border border-red-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2 text-red-600 font-bold text-xs uppercase tracking-wider">
                          <span className="h-2.5 w-2.5 rounded-full bg-red-500"></span> TASK
                        </div>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">{item.task}</h3>
                      <div className="flex items-center gap-3 text-sm text-gray-700 mb-4 font-medium">
                        <span className="flex items-center gap-1">🗓️ Due: {item.dueDate || "No date"}</span>
                        {item.priority && <span className="flex items-center gap-1">⚡ Priority: {item.priority}</span>}
                      </div>
                      <div className="text-xs text-gray-500 mb-4 font-mono">Detected from: Screenshot</div>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => setSelectedScreenshot(item.source)} className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-colors">View Source</button>
                        <button onClick={handleReminder} className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-colors">🔔 Set Reminder</button>
                        <button onClick={handleCalendar} className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-colors">📅 Add to Calendar</button>
                        <button onClick={handleDismiss} className="px-3 py-1.5 bg-white border border-gray-300 text-gray-500 hover:text-rose-600 rounded-lg text-xs font-semibold hover:bg-rose-50 transition-colors ml-auto">Dismiss</button>
                      </div>
                    </div>
                  );
                }

                if (item.type === "event") {
                  return (
                    <div key={item.id} className="bg-indigo-50/50 border border-indigo-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
                          <span className="h-2.5 w-2.5 rounded-full bg-indigo-500"></span> EVENT
                        </div>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">{item.event}</h3>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-700 mb-4 font-medium">
                        {item.date && <span className="flex items-center gap-1">🗓️ {item.date}</span>}
                        {item.time && <span className="flex items-center gap-1">⏰ {item.time}</span>}
                        {item.location && <span className="flex items-center gap-1">📍 {item.location}</span>}
                      </div>
                      <div className="text-xs text-gray-500 mb-4 font-mono">Detected from: Screenshot</div>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => setSelectedScreenshot(item.source)} className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-colors">View Source</button>
                        <button onClick={handleCalendar} className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-colors">📅 Add to Calendar</button>
                        <button onClick={handleReminder} className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-colors">🔔 Set Reminder</button>
                        <button onClick={handleDismiss} className="px-3 py-1.5 bg-white border border-gray-300 text-gray-500 hover:text-rose-600 rounded-lg text-xs font-semibold hover:bg-rose-50 transition-colors ml-auto">Dismiss</button>
                      </div>
                    </div>
                  );
                }

                if (item.type === "date") {
                  return (
                    <div key={item.id} className="bg-amber-50/50 border border-amber-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2 text-amber-600 font-bold text-xs uppercase tracking-wider">
                          <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span> IMPORTANT DATE
                        </div>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">{item.context}</h3>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-700 mb-4 font-medium">
                        <span className="flex items-center gap-1">🗓️ {item.dateText}</span>
                      </div>
                      <div className="text-xs text-gray-500 mb-4 font-mono">Detected from: Screenshot</div>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => setSelectedScreenshot(item.source)} className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-colors">View Source</button>
                        <button onClick={handleReminder} className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-colors">🔔 Set Reminder</button>
                        <button onClick={handleCalendar} className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-colors">📅 Add to Calendar</button>
                        <button onClick={handleDismiss} className="px-3 py-1.5 bg-white border border-gray-300 text-gray-500 hover:text-rose-600 rounded-lg text-xs font-semibold hover:bg-rose-50 transition-colors ml-auto">Dismiss</button>
                      </div>
                    </div>
                  );
                }

                return null;
              })}
            </div>
          )}
        </main>
      </div>

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
