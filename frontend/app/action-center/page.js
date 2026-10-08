"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { fetchScreenshotsApi, deleteScreenshotApi, createCalendarEventApi, updateExtractedDateApi, dismissActionItemApi } from "../utils/api";
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
  const [addedToCalendar, setAddedToCalendar] = useState({});
  const [notification, setNotification] = useState(null);
  const [editingDateId, setEditingDateId] = useState(null);
  const [editDateValue, setEditDateValue] = useState("");

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
      showNotification('error', `Failed to delete screenshot: ${err.message}`);
    }
  };

  const handleReminder = () => {
    showNotification('error', "Reminder integration not yet implemented.");
  };

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleCalendar = async (item) => {
    try {
      let title = item.task || item.event || item.context || 'New Event';
      let dateStr = item.dueDate || item.date || item.dateText;
      
      if (!dateStr) {
        throw new Error("No date found for this item. Cannot add to calendar.");
      }

      let date = new Date(dateStr);
      if (isNaN(date.getTime())) {
         throw new Error(`Invalid date format detected: "${dateStr}". Please correct the date before adding.`);
      }

      // Set to local noon to avoid timezone shift off-by-one errors
      date.setHours(12, 0, 0, 0);

      await createCalendarEventApi({
        title,
        date: date.toISOString(),
        startTime: item.time || '',
        location: item.location || '',
        type: item.type === 'task' ? 'task' : item.type === 'date' ? 'deadline' : 'event',
        priority: item.priority || '',
        sourceScreenshotId: item.source?._id
      });
      setAddedToCalendar(prev => ({ ...prev, [item.id]: true }));
      showNotification('success', `"${title}" was added to your calendar.`);
    } catch (err) {
      if (err.status === 409) {
        setAddedToCalendar(prev => ({ ...prev, [item.id]: true }));
        showNotification('success', `"${item.task || item.event || item.context || 'Item'}" is already in your calendar.`);
      } else {
        showNotification('error', err.message);
      }
    }
  };
  
  const handleEditDate = (item) => {
    let current = item.dueDate || item.date || item.dateText || "";
    let d = new Date(current);
    if (!isNaN(d.getTime())) {
      d.setHours(12, 0, 0, 0); // avoid tz shift
      setEditDateValue(d.toISOString().split('T')[0]);
    } else {
      setEditDateValue("");
    }
    setEditingDateId(item.id);
  };

  const handleSaveDate = async (item) => {
    if (!editDateValue) {
      showNotification('error', 'Please select a date.');
      return;
    }
    try {
      await updateExtractedDateApi(item.source._id, {
        category: item.itemCategory,
        itemIndex: item.itemIndex,
        newDate: editDateValue,
      });

      // Update the local state so it persists across re-renders
      setScreenshots(prev => prev.map(s => {
        if (s._id === item.source._id) {
          let sCopy = JSON.parse(JSON.stringify(s)); // deep copy safely
          if (item.itemCategory === 'extractedTasks') {
            sCopy.aiAnalysis.extractedTasks[item.itemIndex].dueDate = editDateValue;
          } else if (item.itemCategory === 'actionItems') {
            sCopy.aiAnalysis.actionItems[item.itemIndex].dueDate = editDateValue;
          } else if (item.itemCategory === 'extractedEvents') {
            sCopy.aiAnalysis.extractedEvents[item.itemIndex].date = editDateValue;
          } else if (item.itemCategory === 'extractedDates') {
            sCopy.aiAnalysis.extractedDates[item.itemIndex].dateText = editDateValue;
          }
          return sCopy;
        }
        return s;
      }));
      
      setEditingDateId(null);
      showNotification('success', 'Date updated successfully.');
    } catch (err) {
      showNotification('error', `Failed to update date: ${err.message}`);
    }
  };

  const handleDismiss = async (item) => {
    try {
      await dismissActionItemApi(item.source._id, {
        category: item.itemCategory,
        itemIndex: item.itemIndex,
      });

      // Update local state to mark as dismissed
      setScreenshots(prev => prev.map(s => {
        if (s._id === item.source._id) {
          let sCopy = JSON.parse(JSON.stringify(s));
          if (item.itemCategory === 'extractedTasks') {
            sCopy.aiAnalysis.extractedTasks[item.itemIndex].isDismissed = true;
          } else if (item.itemCategory === 'actionItems') {
            sCopy.aiAnalysis.actionItems[item.itemIndex].isDismissed = true;
          } else if (item.itemCategory === 'extractedEvents') {
            sCopy.aiAnalysis.extractedEvents[item.itemIndex].isDismissed = true;
          } else if (item.itemCategory === 'extractedDates') {
            sCopy.aiAnalysis.extractedDates[item.itemIndex].isDismissed = true;
          }
          return sCopy;
        }
        return s;
      }));
      
      let title = item.task || item.event || item.context || 'Item';
      showNotification('success', `"${title}" was removed from your Action Center.`);
    } catch (err) {
      showNotification('error', `Failed to dismiss item: ${err.message}`);
    }
  };

  // Derive items
  const allTasks = [];
  const allEvents = [];
  const allDates = [];

  screenshots.forEach((s) => {
    const pipeline = s.processingPipeline;
    if (pipeline && (pipeline.overall === "processing" || pipeline.overall === "failed")) return;
    
    if (s.aiAnalysis?.extractedTasks && s.aiAnalysis.extractedTasks.length > 0) {
       s.aiAnalysis.extractedTasks.forEach((t, i) => { if(!t.isDismissed) allTasks.push({ ...t, type: 'task', id: `t-${s._id}-${i}`, source: s, itemCategory: 'extractedTasks', itemIndex: i }) });
    } else if (s.aiAnalysis?.actionItems && s.aiAnalysis.actionItems.length > 0) { 
       s.aiAnalysis.actionItems.forEach((t, i) => { if(!t.isDismissed) allTasks.push({ task: t.description, dueDate: t.dueDate, type: 'task', id: `t-${s._id}-${i}`, source: s, itemCategory: 'actionItems', itemIndex: i }) });
    }

    if (s.aiAnalysis?.extractedEvents) {
       s.aiAnalysis.extractedEvents.forEach((e, i) => { if(!e.isDismissed) allEvents.push({ ...e, type: 'event', id: `e-${s._id}-${i}`, source: s, itemCategory: 'extractedEvents', itemIndex: i }) });
    }

    if (s.aiAnalysis?.extractedDates) {
       s.aiAnalysis.extractedDates.forEach((d, i) => { if(!d.isDismissed) allDates.push({ ...d, type: 'date', id: `d-${s._id}-${i}`, source: s, itemCategory: 'extractedDates', itemIndex: i }) });
    }
  });

  const totalItems = allTasks.length + allEvents.length + allDates.length;

  const getFilteredItems = () => {
    let items = [];
    if (filter === "Tasks") items = allTasks;
    else if (filter === "Events") items = allEvents;
    else if (filter === "Important Dates") items = allDates;
    else items = [...allTasks, ...allEvents, ...allDates];
    
    return items.filter(item => !addedToCalendar[item.id]);
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

          {notification && (
            <div className={`mb-6 p-4 rounded-xl shadow-sm border flex items-start gap-3 transition-all ${
              notification.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <span className="text-lg mt-0.5">{notification.type === 'success' ? '✓' : '⚠️'}</span>
              <div>
                <h4 className="font-bold text-sm mb-0.5">{notification.type === 'success' ? 'Success' : 'Error'}</h4>
                <p className="text-sm font-medium">{notification.message}</p>
              </div>
            </div>
          )}

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
                        {editingDateId === item.id ? (
                          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-2 shadow-sm w-full max-w-sm">
                            <input type="date" value={editDateValue} onChange={e => setEditDateValue(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm outline-none focus:border-indigo-500" />
                            <button onClick={() => handleSaveDate(item)} className="px-3 py-1 bg-indigo-600 text-white rounded text-xs font-semibold hover:bg-indigo-700">Save Date</button>
                            <button onClick={() => setEditingDateId(null)} className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-xs font-semibold hover:bg-gray-200">Cancel</button>
                          </div>
                        ) : (
                          <>
                            <span className="flex items-center gap-1">🗓️ Due: {item.dueDate || "No date"}</span>
                            {item.priority && <span className="flex items-center gap-1">⚡ Priority: {item.priority}</span>}
                          </>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mb-4 font-mono">Detected from: Screenshot</div>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => setSelectedScreenshot(item.source)} className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-colors">View Source</button>
                        <button onClick={() => handleEditDate(item)} className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-colors">Edit Date</button>
                        <button onClick={handleReminder} className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-colors">🔔 Set Reminder</button>
                        {addedToCalendar[item.id] ? (
                          <span className="px-3 py-1.5 bg-green-50 border border-green-200 text-green-700 rounded-lg text-xs font-semibold">✅ Added to Calendar</span>
                        ) : (
                          <button onClick={() => handleCalendar(item)} className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-colors">📅 Add to Calendar</button>
                        )}
                        <button onClick={() => handleDismiss(item)} className="px-3 py-1.5 bg-white border border-gray-300 text-gray-500 hover:text-rose-600 rounded-lg text-xs font-semibold hover:bg-rose-50 transition-colors ml-auto">Dismiss</button>
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
                        {editingDateId === item.id ? (
                          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-2 shadow-sm w-full max-w-sm">
                            <input type="date" value={editDateValue} onChange={e => setEditDateValue(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm outline-none focus:border-indigo-500" />
                            <button onClick={() => handleSaveDate(item)} className="px-3 py-1 bg-indigo-600 text-white rounded text-xs font-semibold hover:bg-indigo-700">Save Date</button>
                            <button onClick={() => setEditingDateId(null)} className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-xs font-semibold hover:bg-gray-200">Cancel</button>
                          </div>
                        ) : (
                          <>
                            {item.date && <span className="flex items-center gap-1">🗓️ {item.date}</span>}
                            {item.time && <span className="flex items-center gap-1">⏰ {item.time}</span>}
                            {item.location && <span className="flex items-center gap-1">📍 {item.location}</span>}
                          </>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mb-4 font-mono">Detected from: Screenshot</div>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => setSelectedScreenshot(item.source)} className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-colors">View Source</button>
                        <button onClick={() => handleEditDate(item)} className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-colors">Edit Date</button>
                        {addedToCalendar[item.id] ? (
                          <span className="px-3 py-1.5 bg-green-50 border border-green-200 text-green-700 rounded-lg text-xs font-semibold">✅ Added to Calendar</span>
                        ) : (
                          <button onClick={() => handleCalendar(item)} className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-colors">📅 Add to Calendar</button>
                        )}
                        <button onClick={handleReminder} className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-colors">🔔 Set Reminder</button>
                        <button onClick={() => handleDismiss(item)} className="px-3 py-1.5 bg-white border border-gray-300 text-gray-500 hover:text-rose-600 rounded-lg text-xs font-semibold hover:bg-rose-50 transition-colors ml-auto">Dismiss</button>
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
                        {editingDateId === item.id ? (
                          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-2 shadow-sm w-full max-w-sm">
                            <input type="date" value={editDateValue} onChange={e => setEditDateValue(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm outline-none focus:border-indigo-500" />
                            <button onClick={() => handleSaveDate(item)} className="px-3 py-1 bg-indigo-600 text-white rounded text-xs font-semibold hover:bg-indigo-700">Save Date</button>
                            <button onClick={() => setEditingDateId(null)} className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-xs font-semibold hover:bg-gray-200">Cancel</button>
                          </div>
                        ) : (
                          <span className="flex items-center gap-1">🗓️ {item.dateText}</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mb-4 font-mono">Detected from: Screenshot</div>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => setSelectedScreenshot(item.source)} className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-colors">View Source</button>
                        <button onClick={() => handleEditDate(item)} className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-colors">Edit Date</button>
                        <button onClick={handleReminder} className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-colors">🔔 Set Reminder</button>
                        {addedToCalendar[item.id] ? (
                          <span className="px-3 py-1.5 bg-green-50 border border-green-200 text-green-700 rounded-lg text-xs font-semibold">✅ Added to Calendar</span>
                        ) : (
                          <button onClick={() => handleCalendar(item)} className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-colors">📅 Add to Calendar</button>
                        )}
                        <button onClick={() => handleDismiss(item)} className="px-3 py-1.5 bg-white border border-gray-300 text-gray-500 hover:text-rose-600 rounded-lg text-xs font-semibold hover:bg-rose-50 transition-colors ml-auto">Dismiss</button>
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
