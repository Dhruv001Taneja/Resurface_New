"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { fetchCalendarEventsApi, deleteCalendarEventApi, createCalendarEventApi } from "../utils/api";
import Sidebar from "../components/Sidebar";
import ScreenshotDetailsModal from "../components/ScreenshotDetailsModal";

export default function CalendarPage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [events, setEvents] = useState([]);
  const [dbLoading, setDbLoading] = useState(true);
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState("Month"); // Month, Week, Day
  
  const [selectedScreenshot, setSelectedScreenshot] = useState(null);
  
  // Stats
  const [stats, setStats] = useState({
    total: 0,
    upcoming: 0,
    overdue: 0,
    thisMonth: 0
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const loadData = async () => {
    try {
      setDbLoading(true);
      const res = await fetchCalendarEventsApi();
      if (res?.data && Array.isArray(res.data)) {
        setEvents(res.data);
        calculateStats(res.data, new Date());
      }
    } catch (err) {
      console.warn(err);
    } finally {
      setDbLoading(false);
    }
  };

  const calculateStats = (allEvents, refDate) => {
    const now = new Date();
    now.setHours(0,0,0,0);
    
    let upcoming = 0;
    let overdue = 0;
    let thisMonth = 0;

    allEvents.forEach(e => {
      const eDate = new Date(e.date);
      eDate.setHours(0,0,0,0);
      
      if (eDate >= now) upcoming++;
      if (eDate < now && e.type !== 'event') overdue++; // simplistic overdue
      if (eDate.getMonth() === refDate.getMonth() && eDate.getFullYear() === refDate.getFullYear()) {
        thisMonth++;
      }
    });

    setStats({
      total: allEvents.length,
      upcoming,
      overdue,
      thisMonth
    });
  };

  const handleDeleteEvent = async (id) => {
    if (!confirm("Are you sure you want to delete this event?")) return;
    try {
      await deleteCalendarEventApi(id);
      const updated = events.filter(e => e._id !== id);
      setEvents(updated);
      calculateStats(updated, currentDate);
    } catch (err) {
      alert(`Failed to delete event: ${err.message}`);
    }
  };

  const handleManualAddEvent = async () => {
    const title = prompt("Event Title:");
    if (!title) return;
    try {
      const newEvent = await createCalendarEventApi({
        title,
        date: selectedDate.toISOString(),
        type: 'event'
      });
      const updated = [...events, newEvent.data];
      setEvents(updated);
      calculateStats(updated, currentDate);
    } catch (err) {
      alert(`Failed to add event: ${err.message}`);
    }
  };

  const handleEditEvent = async (eventToEdit) => {
    const newTitle = prompt("Update Event Title:", eventToEdit.title);
    if (!newTitle || newTitle === eventToEdit.title) return;
    
    try {
       const updatedEvent = await updateCalendarEventApi(eventToEdit._id, { title: newTitle });
       const updated = events.map(e => e._id === eventToEdit._id ? updatedEvent.data : e);
       setEvents(updated);
    } catch(err) {
       alert(`Failed to update event: ${err.message}`);
    }
  };

  const userName = user?.name || user?.email?.split("@")[0] || "User";

  // Calendar logic
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const prevMonth = () => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    setCurrentDate(newDate);
    calculateStats(events, newDate);
  };
  const nextMonth = () => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    setCurrentDate(newDate);
    calculateStats(events, newDate);
  };
  const goToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(now);
    calculateStats(events, now);
  };

  const renderCalendarGrid = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const days = [];
    const prevMonthDays = getDaysInMonth(year, month - 1);
    
    // Previous month padding
    for (let i = 0; i < firstDay; i++) {
      days.push({
        day: prevMonthDays - firstDay + i + 1,
        isCurrentMonth: false,
        date: new Date(year, month - 1, prevMonthDays - firstDay + i + 1)
      });
    }
    
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        isCurrentMonth: true,
        date: new Date(year, month, i)
      });
    }
    
    // Next month padding
    const totalCells = Math.ceil(days.length / 7) * 7;
    const paddingEnd = totalCells - days.length;
    for (let i = 1; i <= paddingEnd; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        date: new Date(year, month + 1, i)
      });
    }

    return (
      <div className="grid grid-cols-7 gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="text-center font-bold text-gray-500 text-xs py-2">{d}</div>
        ))}
        {days.map((d, i) => {
          const isSelected = selectedDate && d.date.toDateString() === selectedDate.toDateString();
          const isToday = new Date().toDateString() === d.date.toDateString();
          
          const dayEvents = events.filter(e => new Date(e.date).toDateString() === d.date.toDateString());
          
          return (
            <div 
              key={i} 
              onClick={() => setSelectedDate(d.date)}
              className={`min-h-[80px] p-1 sm:p-2 border border-gray-100 cursor-pointer transition-colors ${!d.isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white hover:bg-gray-50'} ${isSelected ? 'ring-2 ring-indigo-500 ring-inset bg-indigo-50/30' : ''}`}
            >
              <div className={`text-xs sm:text-sm font-semibold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-indigo-600 text-white' : 'text-gray-700'}`}>
                {d.day}
              </div>
              <div className="mt-1 space-y-1 overflow-hidden">
                {dayEvents.slice(0, 3).map((e, idx) => {
                  let colorClass = "bg-indigo-100 text-indigo-700";
                  let dotClass = "bg-indigo-500";
                  if (e.type === 'task') { colorClass = "bg-red-100 text-red-700"; dotClass = "bg-red-500"; }
                  else if (e.type === 'deadline' || e.type === 'date') { colorClass = "bg-amber-100 text-amber-700"; dotClass = "bg-amber-500"; }
                  else if (e.type === 'event' && e.priority === 'High') { colorClass = "bg-green-100 text-green-700"; dotClass = "bg-green-500"; }
                  
                  return (
                    <div key={idx} className={`text-[10px] px-1.5 py-0.5 rounded truncate font-medium flex items-center gap-1 ${colorClass}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${dotClass} flex-shrink-0`}></span>
                      <span className="truncate">{e.title}</span>
                    </div>
                  );
                })}
                {dayEvents.length > 3 && (
                  <div className="text-[10px] text-gray-500 font-medium pl-1">+{dayEvents.length - 3} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const selectedDayEvents = events.filter(e => new Date(e.date).toDateString() === selectedDate.toDateString());
  const upcomingEvents = events.filter(e => {
    const eDate = new Date(e.date);
    eDate.setHours(0,0,0,0);
    const today = new Date();
    today.setHours(0,0,0,0);
    return eDate >= today;
  }).sort((a,b) => new Date(a.date) - new Date(b.date)).slice(0, 5);

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
          activePage="Calendar"
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-8 max-w-7xl mx-auto w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-3xl text-indigo-500 bg-indigo-50 p-2 rounded-xl">📅</span>
                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                  Calendar
                </h1>
              </div>
              <p className="text-gray-500 text-sm sm:text-base font-normal">
                View and manage events and important dates from your screenshots.
              </p>
            </div>
            <button 
              onClick={handleManualAddEvent}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition-colors shadow-sm self-start sm:self-auto"
            >
              + Add Event
            </button>
          </div>

          {/* SUMMARY CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white border border-indigo-100 rounded-2xl p-5 shadow-sm flex flex-col justify-center">
              <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase mb-2">
                <span className="text-lg">📅</span> Total Events
              </div>
              <div className="text-3xl font-black text-indigo-700">{dbLoading ? '-' : stats.total}</div>
            </div>
            <div className="bg-white border border-green-100 rounded-2xl p-5 shadow-sm flex flex-col justify-center">
              <div className="flex items-center gap-2 text-green-600 text-xs font-bold uppercase mb-2">
                <span className="text-lg">✓</span> Upcoming
              </div>
              <div className="text-3xl font-black text-green-700">{dbLoading ? '-' : stats.upcoming}</div>
            </div>
            <div className="bg-white border border-red-100 rounded-2xl p-5 shadow-sm flex flex-col justify-center">
              <div className="flex items-center gap-2 text-red-500 text-xs font-bold uppercase mb-2">
                <span className="text-lg">⏱</span> Overdue
              </div>
              <div className="text-3xl font-black text-red-500">{dbLoading ? '-' : stats.overdue}</div>
            </div>
            <div className="bg-white border border-purple-100 rounded-2xl p-5 shadow-sm flex flex-col justify-center">
              <div className="flex items-center gap-2 text-purple-600 text-xs font-bold uppercase mb-2">
                <span className="text-lg">🗓️</span> This Month
              </div>
              <div className="text-3xl font-black text-purple-700">{dbLoading ? '-' : stats.thisMonth}</div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            {/* LEFT AREA: CALENDAR GRID */}
            <div className="flex-1 bg-white border border-gray-200 rounded-2xl shadow-sm p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
                    <button onClick={prevMonth} className="px-3 py-1.5 hover:bg-gray-100 text-gray-600 font-bold">{"<"}</button>
                    <button onClick={nextMonth} className="px-3 py-1.5 hover:bg-gray-100 text-gray-600 font-bold border-l border-gray-200">{">"}</button>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </h2>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="flex bg-gray-50 border border-gray-200 rounded-lg overflow-hidden text-sm font-semibold">
                    <button onClick={() => setView('Month')} className={`px-4 py-1.5 ${view === 'Month' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>Month</button>
                    <button onClick={() => setView('Week')} className={`px-4 py-1.5 border-l border-gray-200 ${view === 'Week' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>Week</button>
                    <button onClick={() => setView('Day')} className={`px-4 py-1.5 border-l border-gray-200 ${view === 'Day' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>Day</button>
                  </div>
                  <button onClick={goToday} className="px-4 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50">
                    Today
                  </button>
                </div>
              </div>
              
              {renderCalendarGrid()}
            </div>

            {/* RIGHT AREA: DETAILS & UPCOMING */}
            <div className="w-full lg:w-80 space-y-6">
              
              {/* Selected Day Panel */}
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
                <h3 className="font-bold text-gray-900 mb-4 text-base">
                  Events on {selectedDate.toLocaleString('default', { month: 'short', day: 'numeric', year: 'numeric' })}
                </h3>
                
                {selectedDayEvents.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-3 opacity-50">🗓️</div>
                    <div className="font-bold text-gray-700 mb-1">No events</div>
                    <div className="text-sm text-gray-500 mb-4">You don't have any events on this day.</div>
                    <button onClick={handleManualAddEvent} className="text-sm font-bold text-indigo-600 hover:text-indigo-800">
                      + Add Event
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedDayEvents.map(e => (
                      <div key={e._id} className="border border-gray-100 rounded-xl p-3 bg-gray-50 relative group">
                        <div className="font-bold text-gray-900 text-sm mb-1 pr-6">{e.title}</div>
                        <div className="text-xs text-gray-500 font-medium space-y-1">
                          {e.startTime && <div>⏰ {e.startTime} {e.endTime && `- ${e.endTime}`}</div>}
                          {e.location && <div>📍 {e.location}</div>}
                          <div className="capitalize">🏷️ {e.type} {e.priority && `• ${e.priority} Priority`}</div>
                        </div>
                        <div className="mt-2 flex gap-2">
                          {e.sourceScreenshotId && (
                            <button onClick={() => setSelectedScreenshot(e.sourceScreenshotId)} className="text-[10px] bg-white border border-gray-200 px-2 py-1 rounded text-gray-600 hover:bg-gray-100 font-bold">
                              View Source
                            </button>
                          )}
                          <button onClick={() => handleEditEvent(e)} className="text-[10px] bg-white border border-gray-200 px-2 py-1 rounded text-blue-500 hover:bg-blue-50 font-bold ml-auto">
                            Edit
                          </button>
                          <button onClick={() => handleDeleteEvent(e._id)} className="text-[10px] bg-white border border-gray-200 px-2 py-1 rounded text-red-500 hover:bg-red-50 font-bold">
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                    <button onClick={handleManualAddEvent} className="w-full mt-2 text-sm font-bold text-indigo-600 hover:text-indigo-800 text-center py-2 border border-dashed border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors">
                      + Add Event
                    </button>
                  </div>
                )}
              </div>

              {/* Upcoming Events */}
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900 text-base">Upcoming Events</h3>
                  <button className="text-xs font-bold text-indigo-600 hover:text-indigo-800">View All</button>
                </div>
                
                {upcomingEvents.length === 0 ? (
                  <div className="text-sm text-gray-500 text-center py-4">No upcoming events.</div>
                ) : (
                  <div className="space-y-4">
                    {upcomingEvents.map(e => {
                       let dotClass = "bg-indigo-500";
                       if (e.type === 'task') dotClass = "bg-red-500";
                       else if (e.type === 'deadline' || e.type === 'date') dotClass = "bg-amber-500";
                       else if (e.type === 'event' && e.priority === 'High') dotClass = "bg-green-500";

                       return (
                        <div key={e._id} className="flex gap-3">
                          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${dotClass}`}></div>
                          <div>
                            <div className="font-bold text-sm text-gray-900">{e.title}</div>
                            <div className="text-xs text-gray-500 font-medium">{new Date(e.date).toLocaleString('default', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</div>
                            {e.startTime && <div className="text-[10px] text-gray-400 font-medium mt-0.5">{e.startTime}</div>}
                          </div>
                        </div>
                       )
                    })}
                  </div>
                )}
              </div>

            </div>
          </div>
        </main>
      </div>

      {selectedScreenshot && (
        <ScreenshotDetailsModal
          screenshot={selectedScreenshot}
          onClose={() => setSelectedScreenshot(null)}
          onDelete={() => {}}
        />
      )}
    </div>
  );
}
