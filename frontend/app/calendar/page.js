"use client";



import { useState, useEffect } from "react";

import Link from "next/link";

import { useRouter } from "next/navigation";

import { useAuth } from "../context/AuthContext";

import { fetchCalendarEventsApi, deleteCalendarEventApi, createCalendarEventApi, updateCalendarEventApi } from "../utils/api";

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

    now.setHours(0, 0, 0, 0);



    let upcoming = 0;

    let overdue = 0;

    let thisMonth = 0;



    allEvents.forEach(e => {

      const eDate = new Date(e.date);

      eDate.setHours(0, 0, 0, 0);



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

    } catch (err) {

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

          <div key={d} className="text-center font-bold text-slate-400 text-xs py-2">{d}</div>

        ))}

        {days.map((d, i) => {

          const isSelected = selectedDate && d.date.toDateString() === selectedDate.toDateString();

          const isToday = new Date().toDateString() === d.date.toDateString();



          const dayEvents = events.filter(e => new Date(e.date).toDateString() === d.date.toDateString());



          return (

            <div

              key={i}

              onClick={() => setSelectedDate(d.date)}

              className={`min-h-[80px] p-1 sm:p-2 border border-[#1e293b] cursor-pointer transition-colors ${!d.isCurrentMonth ? 'bg-[#080d15] text-slate-500' : 'bg-[#0f1723] hover:bg-[#080d15]'} ${isSelected ? 'ring-2 ring-[#45e5d0] ring-inset bg-[#10262c]/30' : ''}`}

            >

              <div className={`text-xs sm:text-sm font-semibold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-[#45e5d0] text-white' : 'text-slate-300'}`}>

                {d.day}

              </div>

              <div className="mt-1 space-y-1 overflow-hidden">

                {dayEvents.slice(0, 3).map((e, idx) => {

                  let colorClass = "bg-[#143238] text-[#45e5d0]";

                  let dotClass = "bg-[#10262c]0";

                  if (e.type === 'task') { colorClass = "bg-[#3a202a] text-rose-300"; dotClass = "bg-rose-400"; }

                  else if (e.type === 'deadline' || e.type === 'date') { colorClass = "bg-[#3b2d19] text-amber-300"; dotClass = "bg-amber-500"; }

                  else if (e.type === 'event' && e.priority === 'High') { colorClass = "bg-[#12342d] text-emerald-300"; dotClass = "bg-emerald-400"; }



                  return (

                    <div key={idx} className={`text-[10px] px-1.5 py-0.5 rounded truncate font-medium flex items-center gap-1 ${colorClass}`}>

                      <span className={`w-1.5 h-1.5 rounded-full ${dotClass} flex-shrink-0`}></span>

                      <span className="truncate">{e.title}</span>

                    </div>

                  );

                })}

                {dayEvents.length > 3 && (

                  <div className="text-[10px] text-slate-400 font-medium pl-1">+{dayEvents.length - 3} more</div>

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

    eDate.setHours(0, 0, 0, 0);

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    return eDate >= today;

  }).sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 5);



  if (isLoading || !isAuthenticated) {

    return (

      <div className="min-h-screen bg-[#0f1723] flex items-center justify-center text-slate-400 font-sans">

        Authenticating...

      </div>

    );

  }



  return (

    <div className="min-h-screen bg-[#080d15] flex flex-col font-sans antialiased text-slate-100">

      <header className="h-16 bg-[#0f1723] border-b border-[#223047] px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs">

        <div className="flex items-center gap-4">

          <button

            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}

            className="md:hidden text-slate-400 hover:text-slate-100 p-1.5 rounded-lg hover:bg-[#182333] transition-colors"

          >

            <span className="text-xl">☰</span>

          </button>

          <Link href="/dashboard" className="font-extrabold text-xl tracking-tight text-slate-100 flex items-center gap-2 hover:text-[#45e5d0] transition-colors">

            ReSurface

          </Link>

        </div>



        <div className="flex items-center gap-3 sm:gap-5">

          <div className="flex items-center gap-2 border-l border-[#223047] pl-3 sm:pl-4">

            <div className="h-8 w-8 rounded-full bg-[#143238] border border-[#1e3b43] flex items-center justify-center font-bold text-[#45e5d0] text-xs">

              {userName.substring(0, 2).toUpperCase()}

            </div>

            <span className="font-bold text-sm text-slate-200 hidden sm:inline-block">

              {userName}

            </span>

            <button

              onClick={logout}

              className="ml-1 text-xs font-semibold text-slate-400 hover:text-rose-600 hover:bg-rose-50 px-2 py-1 rounded transition-colors"

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

                <span className="text-2xl text-[#45e5d0] bg-[#10262c] border border-[#1e3b43] p-3 rounded-xl" aria-hidden="true">▦</span>

                <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">

                  Calendar

                </h1>

              </div>

              <p className="text-slate-400 text-sm sm:text-base font-normal">

                View and manage events and important dates from your screenshots.

              </p>

            </div>

            <button

              onClick={handleManualAddEvent}

              className="px-4 py-2 bg-[#45e5d0] text-white rounded-lg font-bold text-sm hover:bg-[#2bd4bf] transition-colors shadow-sm self-start sm:self-auto"

            >

              + Add Event

            </button>

          </div>



          {/* SUMMARY CARDS */}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">

            <div className="bg-[#0f1723] border border-[#1e3b43] rounded-2xl p-5 shadow-sm flex flex-col justify-center">

              <div className="flex items-center gap-2 text-[#45e5d0] text-xs font-bold uppercase mb-2">

                <span className="text-lg">Calendar</span> Total Events

              </div>

              <div className="text-3xl font-black text-[#45e5d0]">{dbLoading ? '-' : stats.total}</div>

            </div>

            <div className="bg-[#0f1723] border border-[#1d4039] rounded-2xl p-5 shadow-sm flex flex-col justify-center">

              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase mb-2">

                <span className="text-lg">✓</span> Upcoming

              </div>

              <div className="text-3xl font-black text-emerald-300">{dbLoading ? '-' : stats.upcoming}</div>

            </div>

            <div className="bg-[#0f1723] border border-[#4a2731] rounded-2xl p-5 shadow-sm flex flex-col justify-center">

              <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase mb-2">

                <span className="text-lg">Overdue</span> Overdue

              </div>

              <div className="text-3xl font-black text-rose-400">{dbLoading ? '-' : stats.overdue}</div>

            </div>

            <div className="bg-[#0f1723] border border-[#392c50] rounded-2xl p-5 shadow-sm flex flex-col justify-center">

              <div className="flex items-center gap-2 text-violet-300 text-xs font-bold uppercase mb-2">

                <span className="text-lg">Date</span> This Month

              </div>

              <div className="text-3xl font-black text-violet-300">{dbLoading ? '-' : stats.thisMonth}</div>

            </div>

          </div>



          <div className="flex flex-col lg:flex-row gap-6">

            {/* LEFT AREA: CALENDAR GRID */}

            <div className="flex-1 bg-[#0f1723] border border-[#223047] rounded-2xl shadow-sm p-4 sm:p-6">

              <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">

                <div className="flex items-center gap-4">

                  <div className="flex bg-[#080d15] border border-[#223047] rounded-lg overflow-hidden">

                    <button onClick={prevMonth} className="px-3 py-1.5 hover:bg-[#182333] text-slate-400 font-bold">{"<"}</button>

                    <button onClick={nextMonth} className="px-3 py-1.5 hover:bg-[#182333] text-slate-400 font-bold border-l border-[#223047]">{">"}</button>

                  </div>

                  <h2 className="text-xl font-bold text-slate-100">

                    {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}

                  </h2>

                </div>



                <div className="flex items-center gap-2">

                  <div className="flex bg-[#080d15] border border-[#223047] rounded-lg overflow-hidden text-sm font-semibold">

                    <button onClick={() => setView('Month')} className={`px-4 py-1.5 ${view === 'Month' ? 'bg-[#45e5d0] text-white' : 'text-slate-400 hover:bg-[#182333]'}`}>Month</button>

                    <button onClick={() => setView('Week')} className={`px-4 py-1.5 border-l border-[#223047] ${view === 'Week' ? 'bg-[#45e5d0] text-white' : 'text-slate-400 hover:bg-[#182333]'}`}>Week</button>

                    <button onClick={() => setView('Day')} className={`px-4 py-1.5 border-l border-[#223047] ${view === 'Day' ? 'bg-[#45e5d0] text-white' : 'text-slate-400 hover:bg-[#182333]'}`}>Day</button>

                  </div>

                  <button onClick={goToday} className="px-4 py-1.5 bg-[#0f1723] border border-[#223047] text-slate-300 rounded-lg text-sm font-semibold hover:bg-[#080d15]">

                    Today

                  </button>

                </div>

              </div>



              {renderCalendarGrid()}

            </div>



            {/* RIGHT AREA: DETAILS & UPCOMING */}

            <div className="w-full lg:w-80 space-y-6">



              {/* Selected Day Panel */}

              <div className="bg-[#0f1723] border border-[#223047] rounded-2xl shadow-sm p-5">

                <h3 className="font-bold text-slate-100 mb-4 text-base">

                  Events on {selectedDate.toLocaleString('default', { month: 'short', day: 'numeric', year: 'numeric' })}

                </h3>



                {selectedDayEvents.length === 0 ? (

                  <div className="text-center py-8">

                    <div className="text-4xl mb-3 opacity-50">Date</div>

                    <div className="font-bold text-slate-300 mb-1">No events</div>

                    <div className="text-sm text-slate-400 mb-4">You don't have any events on this day.</div>

                    <button onClick={handleManualAddEvent} className="text-sm font-bold text-[#45e5d0] hover:text-indigo-800">

                      + Add Event

                    </button>

                  </div>

                ) : (

                  <div className="space-y-3">

                    {selectedDayEvents.map(e => (

                      <div key={e._id} className="border border-[#1e293b] rounded-xl p-3 bg-[#080d15] relative group">

                        <div className="font-bold text-slate-100 text-sm mb-1 pr-6">{e.title}</div>

                        <div className="text-xs text-slate-400 font-medium space-y-1">

                          {e.startTime && <div>Time: {e.startTime} {e.endTime && `- ${e.endTime}`}</div>}

                          {e.location && <div>Location: {e.location}</div>}

                          <div className="capitalize">Type: {e.type} {e.priority && `• ${e.priority} Priority`}</div>

                        </div>

                        <div className="mt-2 flex gap-2">

                          {e.sourceScreenshotId && (

                            <button onClick={() => setSelectedScreenshot(e.sourceScreenshotId)} className="text-[10px] bg-[#0f1723] border border-[#223047] px-2 py-1 rounded text-slate-400 hover:bg-[#182333] font-bold">

                              View Source

                            </button>

                          )}

                          <button onClick={() => handleEditEvent(e)} className="text-[10px] bg-[#0f1723] border border-[#223047] px-2 py-1 rounded text-blue-500 hover:bg-blue-50 font-bold ml-auto">

                            Edit

                          </button>

                          <button onClick={() => handleDeleteEvent(e._id)} className="text-[10px] bg-[#0f1723] border border-[#223047] px-2 py-1 rounded text-rose-400 hover:bg-red-50 font-bold">

                            Delete

                          </button>

                        </div>

                      </div>

                    ))}

                    <button onClick={handleManualAddEvent} className="w-full mt-2 text-sm font-bold text-[#45e5d0] hover:text-indigo-800 text-center py-2 border border-dashed border-[#1e3b43] rounded-lg hover:bg-[#10262c] transition-colors">

                      + Add Event

                    </button>

                  </div>

                )}

              </div>



              {/* Upcoming Events */}

              <div className="bg-[#0f1723] border border-[#223047] rounded-2xl shadow-sm p-5">

                <div className="flex justify-between items-center mb-4">

                  <h3 className="font-bold text-slate-100 text-base">Upcoming Events</h3>

                  <button className="text-xs font-bold text-[#45e5d0] hover:text-indigo-800">View All</button>

                </div>



                {upcomingEvents.length === 0 ? (

                  <div className="text-sm text-slate-400 text-center py-4">No upcoming events.</div>

                ) : (

                  <div className="space-y-4">

                    {upcomingEvents.map(e => {

                      let dotClass = "bg-[#10262c]0";

                      if (e.type === 'task') dotClass = "bg-rose-400";

                      else if (e.type === 'deadline' || e.type === 'date') dotClass = "bg-amber-500";

                      else if (e.type === 'event' && e.priority === 'High') dotClass = "bg-emerald-400";



                      return (

                        <div key={e._id} className="flex gap-3">

                          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${dotClass}`}></div>

                          <div>

                            <div className="font-bold text-sm text-slate-100">{e.title}</div>

                            <div className="text-xs text-slate-400 font-medium">{new Date(e.date).toLocaleString('default', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</div>

                            {e.startTime && <div className="text-[10px] text-slate-500 font-medium mt-0.5">{e.startTime}</div>}

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

          onDelete={() => { }}

        />

      )}

    </div>

  );

}