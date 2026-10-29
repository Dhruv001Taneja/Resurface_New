"use client";



import { useState, useEffect, useCallback } from "react";

import Link from "next/link";

import { useRouter } from "next/navigation";

import { useAuth } from "../context/AuthContext";

import {

  fetchScreenshotsApi,

  deleteScreenshotApi,

  createCalendarEventApi,

  updateExtractedDateApi,

  dismissActionItemApi,

} from "../utils/api";

import ScreenshotDetailsModal from "../components/ScreenshotDetailsModal";

import Sidebar from "../components/Sidebar";





const FILTERS = ["All", "Tasks", "Events", "Important Dates"];



function Icon({ name, size = 18, className = "" }) {

  const paths = {

    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,

    image: <><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></>,

    zap: <path d="m13 2-3 8H5l6 12 3-8h5L13 2Z" />,

    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18M8 14h2M14 14h2M8 17h2" /></>,

    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,

    shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></>,

    chart: <><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-5 5" /></>,

    settings: <><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" /><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.8-.7a8 8 0 0 1-1.7 1l-.3 1.9h-2.8l-.3-1.9a8 8 0 0 1-1.7-1l-1.8.7-1.4-2.4 1.4-1.1a7 7 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.8.7a8 8 0 0 1 1.7-1l.3-1.9h2.8l.3 1.9a8 8 0 0 1 1.7 1l1.8-.7 1.4 2.4-1.4 1.1a7 7 0 0 1 0 2Z" /></>,

    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,

    check: <><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>,

    close: <path d="m18 6-12 12M6 6l12 12" />,

    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,

    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,

    plus: <path d="M12 5v14M5 12h14" />,

    edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L9 17l-4 1 1-4Z" /></>,

    trash: <><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 10v6M14 10v6" /></>,

    source: <><rect x="4" y="4" width="16" height="16" rx="2" /><path d="m8 15 3-3 2 2 3-4 2 5M8 8h.01" /></>,

    list: <><path d="M9 6h12M9 12h12M9 18h12" /><path d="M4 6h.01M4 12h.01M4 18h.01" /></>,

    upload: <><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v4h16v-4" /></>,

    menu: <path d="M4 6h16M4 12h16M4 18h16" />,

    alert: <><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></>,

    filter: <><path d="M4 7h16M7 12h10M10 17h4" /></>,

  };



  return (

    <svg

      width={size}

      height={size}

      viewBox="0 0 24 24"

      fill="none"

      stroke="currentColor"

      strokeWidth="1.7"

      strokeLinecap="round"

      strokeLinejoin="round"

      className={className}

      aria-hidden="true"

    >

      {paths[name] || <circle cx="12" cy="12" r="9" />}

    </svg>

  );

}



function ActionIcon({ type }) {

  const styles = {

    task: "bg-rose-400/10 text-rose-300 border-rose-300/15",

    event: "bg-violet-400/10 text-violet-300 border-violet-300/15",

    date: "bg-amber-300/10 text-amber-300 border-amber-300/15",

  };



  return (

    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${styles[type]}`}>

      <Icon name={type === "task" ? "check" : type === "event" ? "calendar" : "clock"} size={20} />

    </div>

  );

}



function getItemTitle(item) {

  return item.task || item.event || item.context || "Untitled item";

}



function getItemDate(item) {

  return item.dueDate || item.date || item.dateText || "";

}



function formatDate(value) {

  if (!value) return "No date set";



  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);



  return date.toLocaleDateString("en-IN", {

    day: "numeric",

    month: "short",

    year: "numeric",

  });

}



function isValidDate(value) {

  return Boolean(value && !Number.isNaN(new Date(value).getTime()));

}



function ActionCard({

  item,

  addedToCalendar,

  editingDateId,

  editDateValue,

  setEditDateValue,

  onEditDate,

  onSaveDate,

  onCancelEdit,

  onCalendar,

  onDismiss,

  onViewSource,

  busy,

}) {

  const typeLabel =

    item.type === "task"

      ? "TASK"

      : item.type === "event"

        ? "EVENT"

        : "IMPORTANT DATE";



  const title = getItemTitle(item);

  const date = getItemDate(item);

  const editing = editingDateId === item.id;



  return (

    <article className="group rounded-2xl border border-slate-800/90 bg-[#101722] p-4 transition duration-200 hover:border-teal-300/25 hover:bg-[#111a26] sm:p-5">

      <div className="flex items-start gap-3 sm:gap-4">

        <ActionIcon type={item.type} />



        <div className="min-w-0 flex-1">

          <div className="mb-2 flex flex-wrap items-center gap-2">

            <span className="text-[10px] font-semibold tracking-[0.16em] text-slate-500">

              {typeLabel}

            </span>

            {item.priority && (

              <span className="rounded-md border border-amber-300/15 bg-amber-300/[0.06] px-2 py-0.5 text-[10px] font-medium text-amber-300">

                {String(item.priority)}

              </span>

            )}

          </div>



          <h3 className="break-words text-sm font-semibold leading-6 text-slate-100 sm:text-base">

            {title}

          </h3>



          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400">

            <span className="inline-flex items-center gap-1.5">

              <Icon name="calendar" size={14} className="text-slate-500" />

              {editing ? "Choose a date" : formatDate(date)}

            </span>

            {item.time && (

              <span className="inline-flex items-center gap-1.5">

                <Icon name="clock" size={14} className="text-slate-500" />

                {item.time}

              </span>

            )}

            {item.location && (

              <span className="max-w-full truncate">

                {item.location}

              </span>

            )}

          </div>



          {editing && (

            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-700 bg-[#0b111b] p-3">

              <input

                type="date"

                value={editDateValue}

                onChange={(event) => setEditDateValue(event.target.value)}

                className="min-w-0 rounded-lg border border-slate-700 bg-[#101722] px-3 py-2 text-sm text-slate-100 outline-none focus:border-teal-300/50"

              />

              <button

                type="button"

                onClick={() => onSaveDate(item)}

                disabled={busy}

                className="rounded-lg bg-teal-300 px-3 py-2 text-xs font-semibold text-[#071116] hover:bg-teal-200 disabled:opacity-50"

              >

                {busy ? "Saving..." : "Save date"}

              </button>

              <button

                type="button"

                onClick={onCancelEdit}

                className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"

              >

                Cancel

              </button>

            </div>

          )}



          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-800/80 pt-3">

            <button

              type="button"

              onClick={() => onViewSource(item)}

              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-slate-600 hover:text-white"

            >

              <Icon name="source" size={14} /> View source

            </button>



            {!editing && (

              <button

                type="button"

                onClick={() => onEditDate(item)}

                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-teal-300/30 hover:text-teal-300"

              >

                <Icon name="edit" size={14} /> Edit date

              </button>

            )}



            {addedToCalendar ? (

              <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300/15 bg-emerald-300/[0.06] px-3 py-2 text-xs font-medium text-emerald-300">

                <Icon name="check" size={14} /> In calendar

              </span>

            ) : (

              <button

                type="button"

                onClick={() => onCalendar(item)}

                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-300/[0.09] px-3 py-2 text-xs font-semibold text-teal-300 transition hover:bg-teal-300/[0.16]"

              >

                <Icon name="plus" size={14} /> Add to calendar

              </button>

            )}



            <button

              type="button"

              onClick={() => onDismiss(item)}

              className="ml-auto rounded-lg px-3 py-2 text-xs font-medium text-slate-500 transition hover:bg-rose-400/[0.08] hover:text-rose-300"

            >

              Dismiss

            </button>

          </div>

        </div>

      </div>

    </article>

  );

}



export default function ActionCenter() {

  const { user, isAuthenticated, isLoading, logout } = useAuth();

  const router = useRouter();



  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [screenshots, setScreenshots] = useState([]);

  const [dbLoading, setDbLoading] = useState(true);

  const [filter, setFilter] = useState("All");

  const [searchQuery, setSearchQuery] = useState("");

  const [selectedScreenshot, setSelectedScreenshot] = useState(null);

  const [addedToCalendar, setAddedToCalendar] = useState({});

  const [notification, setNotification] = useState(null);

  const [editingDateId, setEditingDateId] = useState(null);

  const [editDateValue, setEditDateValue] = useState("");

  const [busyItemId, setBusyItemId] = useState(null);



  const userName =

    user?.name || user?.email?.split("@")[0] || "User";



  useEffect(() => {

    if (!isLoading && !isAuthenticated) {

      router.replace("/login");

    }

  }, [isAuthenticated, isLoading, router]);



  const loadData = useCallback(async () => {

    if (!isAuthenticated) return;



    setDbLoading(true);



    try {

      const response = await fetchScreenshotsApi();



      if (Array.isArray(response?.data)) {

        setScreenshots(response.data);

      } else {

        setScreenshots([]);

      }

    } catch (error) {

      console.error("Unable to load Action Center:", error);

      setNotification({

        type: "error",

        message: error.message || "Unable to load your action items.",

      });

    } finally {

      setDbLoading(false);

    }

  }, [isAuthenticated]);



  useEffect(() => {

    if (isAuthenticated) loadData();

  }, [isAuthenticated, loadData]);



  const showNotification = (type, message) => {

    setNotification({ type, message });

  };



  const allTasks = [];

  const allEvents = [];

  const allDates = [];



  screenshots.forEach((screenshot) => {

    if (screenshot.isVault) return;



    const pipeline = screenshot.processingPipeline;



    if (

      pipeline &&

      (pipeline.overall === "processing" ||

        pipeline.overall === "failed")

    ) {

      return;

    }



    const analysis = screenshot.aiAnalysis || {};



    if (Array.isArray(analysis.extractedTasks) && analysis.extractedTasks.length) {

      analysis.extractedTasks.forEach((task, index) => {

        if (task.isDismissed) return;



        allTasks.push({

          ...task,

          type: "task",

          id: `t-${screenshot._id}-${index}`,

          source: screenshot,

          itemCategory: "extractedTasks",

          itemIndex: index,

        });

      });

    } else if (Array.isArray(analysis.actionItems)) {

      analysis.actionItems.forEach((task, index) => {

        if (task.isDismissed) return;



        allTasks.push({

          task: task.description,

          dueDate: task.dueDate,

          priority: task.priority,

          type: "task",

          id: `a-${screenshot._id}-${index}`,

          source: screenshot,

          itemCategory: "actionItems",

          itemIndex: index,

        });

      });

    }



    if (Array.isArray(analysis.extractedEvents)) {

      analysis.extractedEvents.forEach((event, index) => {

        if (event.isDismissed) return;



        allEvents.push({

          ...event,

          type: "event",

          id: `e-${screenshot._id}-${index}`,

          source: screenshot,

          itemCategory: "extractedEvents",

          itemIndex: index,

        });

      });

    }



    if (Array.isArray(analysis.extractedDates)) {

      analysis.extractedDates.forEach((date, index) => {

        if (date.isDismissed) return;



        allDates.push({

          ...date,

          type: "date",

          id: `d-${screenshot._id}-${index}`,

          source: screenshot,

          itemCategory: "extractedDates",

          itemIndex: index,

        });

      });

    }

  });



  const totalItems = allTasks.length + allEvents.length + allDates.length;



  let filteredItems = [];



  if (filter === "Tasks") filteredItems = allTasks;

  else if (filter === "Events") filteredItems = allEvents;

  else if (filter === "Important Dates") filteredItems = allDates;

  else filteredItems = [...allTasks, ...allEvents, ...allDates];



  filteredItems = filteredItems.filter(

    (item) => !addedToCalendar[item.id]

  );



  if (searchQuery.trim()) {

    const query = searchQuery.trim().toLowerCase();



    filteredItems = filteredItems.filter((item) => {

      const searchable = [

        getItemTitle(item),

        getItemDate(item),

        item.time,

        item.location,

        item.priority,

        item.source?.originalName,

        item.source?.title,

      ]

        .filter(Boolean)

        .join(" ")

        .toLowerCase();



      return searchable.includes(query);

    });

  }



  const handleCalendar = async (item) => {

    const title = getItemTitle(item);

    const dateValue = getItemDate(item);



    if (!dateValue || !isValidDate(dateValue)) {

      showNotification(

        "error",

        "This item needs a valid date before it can be added to the calendar. Edit its date first."

      );

      return;

    }



    setBusyItemId(item.id);



    try {

      const date = new Date(dateValue);

      date.setHours(12, 0, 0, 0);



      await createCalendarEventApi({

        title,

        date: date.toISOString(),

        startTime: item.time || "",

        location: item.location || "",

        type:

          item.type === "task"

            ? "task"

            : item.type === "date"

              ? "deadline"

              : "event",

        priority: item.priority || "",

        sourceScreenshotId: item.source?._id,

      });



      setAddedToCalendar((previous) => ({

        ...previous,

        [item.id]: true,

      }));



      showNotification("success", `"${title}" was added to your calendar.`);

    } catch (error) {

      if (error.status === 409) {

        setAddedToCalendar((previous) => ({

          ...previous,

          [item.id]: true,

        }));

        showNotification("success", `"${title}" is already in your calendar.`);

      } else {

        showNotification(

          "error",

          error.message || "Unable to add this item to your calendar."

        );

      }

    } finally {

      setBusyItemId(null);

    }

  };



  const handleEditDate = (item) => {

    const current = getItemDate(item);

    const date = current ? new Date(current) : null;



    if (date && !Number.isNaN(date.getTime())) {

      date.setHours(12, 0, 0, 0);

      setEditDateValue(date.toISOString().split("T")[0]);

    } else {

      setEditDateValue("");

    }



    setEditingDateId(item.id);

  };



  const handleSaveDate = async (item) => {

    if (!editDateValue) {

      showNotification("error", "Please select a date.");

      return;

    }



    setBusyItemId(item.id);



    try {

      await updateExtractedDateApi(item.source._id, {

        category: item.itemCategory,

        itemIndex: item.itemIndex,

        newDate: editDateValue,

      });



      setScreenshots((previous) =>

        previous.map((screenshot) => {

          if (screenshot._id !== item.source._id) return screenshot;



          const copy = JSON.parse(JSON.stringify(screenshot));



          if (item.itemCategory === "extractedTasks") {

            copy.aiAnalysis.extractedTasks[item.itemIndex].dueDate =

              editDateValue;

          } else if (item.itemCategory === "actionItems") {

            copy.aiAnalysis.actionItems[item.itemIndex].dueDate =

              editDateValue;

          } else if (item.itemCategory === "extractedEvents") {

            copy.aiAnalysis.extractedEvents[item.itemIndex].date =

              editDateValue;

          } else if (item.itemCategory === "extractedDates") {

            copy.aiAnalysis.extractedDates[item.itemIndex].dateText =

              editDateValue;

          }



          return copy;

        })

      );



      setEditingDateId(null);

      showNotification("success", "Date updated successfully.");

    } catch (error) {

      showNotification(

        "error",

        error.message || "Failed to update this date."

      );

    } finally {

      setBusyItemId(null);

    }

  };



  const handleDismiss = async (item) => {

    setBusyItemId(item.id);



    try {

      await dismissActionItemApi(item.source._id, {

        category: item.itemCategory,

        itemIndex: item.itemIndex,

      });



      setScreenshots((previous) =>

        previous.map((screenshot) => {

          if (screenshot._id !== item.source._id) return screenshot;



          const copy = JSON.parse(JSON.stringify(screenshot));

          const target = copy.aiAnalysis?.[item.itemCategory];



          if (target?.[item.itemIndex]) {

            target[item.itemIndex].isDismissed = true;

          }



          return copy;

        })

      );



      showNotification(

        "success",

        `"${getItemTitle(item)}" was removed from your Action Center.`

      );

    } catch (error) {

      showNotification(

        "error",

        error.message || "Failed to dismiss this item."

      );

    } finally {

      setBusyItemId(null);

    }

  };



  const handleDeleteScreenshot = async (id) => {

    try {

      await deleteScreenshotApi(id);

      setScreenshots((previous) =>

        previous.filter((s) => s._id !== id && s.id !== id)

      );

      setSelectedScreenshot(null);

      showNotification("success", "Screenshot deleted successfully.");

    } catch (error) {

      showNotification(

        "error",

        error.message || "Failed to delete screenshot."

      );

    }

  };



  if (isLoading || !isAuthenticated) {

    return (

      <div className="flex min-h-screen items-center justify-center bg-[#080d14] text-slate-300">

        <div className="flex items-center gap-3 text-sm">

          <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-700 border-t-teal-300" />

          Loading your workspace...

        </div>

      </div>

    );

  }



  return (

    <div className="min-h-screen bg-[#080d14] font-sans text-slate-100">

      <header className="sticky top-0 z-40 flex h-[72px] items-center justify-between border-b border-slate-800/80 bg-[#0b111b]/95 px-4 backdrop-blur-xl sm:px-6 lg:px-8">

        <div className="flex items-center gap-3">

          <button

            type="button"

            onClick={() => setMobileMenuOpen((open) => !open)}

            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white md:hidden"

            aria-label="Toggle navigation"

          >

            <Icon name="menu" size={21} />

          </button>



          <Link href="/dashboard" className="flex items-center gap-3">

            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-300 text-[#071116]">

              <Icon name="zap" size={22} />

            </span>

            <span>

              <span className="block text-base font-bold tracking-tight text-white">

                ReSurface

              </span>

              <span className="hidden text-[10px] tracking-[0.17em] text-slate-500 sm:block">

                VISUAL WORKSPACE

              </span>

            </span>

          </Link>

        </div>



        <div className="mx-5 hidden max-w-md flex-1 lg:block">

          <label className="relative block">

            <Icon name="search" size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />

            <input

              type="search"

              value={searchQuery}

              onChange={(event) => setSearchQuery(event.target.value)}

              placeholder="Search tasks, events, and dates..."

              className="w-full rounded-xl border border-slate-800 bg-[#101722] py-2.5 pl-10 pr-4 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-teal-300/50 focus:ring-2 focus:ring-teal-300/10"

            />

          </label>

        </div>



        <div className="flex items-center gap-3">

          <button

            type="button"

            onClick={loadData}

            disabled={dbLoading}

            title="Refresh Action Center"

            className="rounded-xl border border-slate-800 bg-[#101722] p-2.5 text-slate-400 transition hover:border-teal-300/30 hover:text-teal-300 disabled:opacity-50"

          >

            <Icon name="clock" size={18} className={dbLoading ? "animate-pulse" : ""} />

          </button>

          <div className="hidden h-8 w-px bg-slate-800 sm:block" />

          <div className="flex items-center gap-2.5">

            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-teal-300/20 bg-teal-300/10 text-xs font-bold text-teal-300">

              {userName.slice(0, 2).toUpperCase()}

            </div>

            <div className="hidden sm:block">

              <p className="max-w-32 truncate text-sm font-medium text-slate-200">{userName}</p>

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

              <Icon name="shield" size={18} />

            </button>

          )}

        </div>

      </header>



      <div className="flex min-h-[calc(100vh-72px)]">

        <Sidebar

          mobileMenuOpen={mobileMenuOpen}

          setMobileMenuOpen={setMobileMenuOpen}

          user={user}

          userName={userName}

        />



        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-9">

          <div className="mx-auto max-w-[1150px]">

            <div className="mb-5 flex items-center gap-2 text-xs text-slate-500">

              <Link href="/dashboard" className="hover:text-slate-300">Workspace</Link>

              <span>/</span>

              <span className="text-teal-300">Action Center</span>

            </div>



            <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">

              <div>

                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-teal-300/15 bg-teal-300/[0.06] px-3 py-1.5 text-[11px] font-medium text-teal-300">

                  <Icon name="zap" size={14} /> SMART ACTIONS

                </div>

                <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-[38px]">

                  Action Center<span className="text-teal-300">.</span>

                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">

                  Tasks, events, and important dates automatically identified in your screenshots.

                </p>

              </div>



              <button

                type="button"

                onClick={loadData}

                disabled={dbLoading}

                className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-700 bg-[#101722] px-4 py-3 text-sm font-medium text-slate-300 transition hover:border-teal-300/30 hover:text-teal-300 disabled:opacity-50 md:self-auto"

              >

                <Icon name="clock" size={16} />

                {dbLoading ? "Refreshing..." : "Refresh items"}

              </button>

            </div>



            {notification && (

              <div className={`mb-6 flex items-start gap-3 rounded-xl border px-4 py-3.5 text-sm ${notification.type === "success"

                ? "border-emerald-300/20 bg-emerald-300/[0.06] text-emerald-300"

                : "border-rose-300/20 bg-rose-300/[0.06] text-rose-300"

                }`}>

                <Icon name={notification.type === "success" ? "check" : "alert"} size={18} />

                <p className="flex-1 leading-5">{notification.message}</p>

                <button type="button" onClick={() => setNotification(null)} aria-label="Dismiss notification">

                  <Icon name="close" size={16} />

                </button>

              </div>

            )}



            {/* Summary cards */}

            <section className="mb-8 grid grid-cols-2 gap-3 xl:grid-cols-4">

              {[

                { label: "Total items", value: totalItems, note: "Detected items", icon: "list", tone: "text-teal-300", panel: "bg-teal-300/[0.07]", border: "border-teal-300/15" },

                { label: "Tasks", value: allTasks.length, note: "Things to do", icon: "check", tone: "text-rose-300", panel: "bg-rose-300/[0.06]", border: "border-rose-300/15" },

                { label: "Events", value: allEvents.length, note: "Plans and events", icon: "calendar", tone: "text-violet-300", panel: "bg-violet-300/[0.06]", border: "border-violet-300/15" },

                { label: "Important dates", value: allDates.length, note: "Dates to remember", icon: "clock", tone: "text-amber-300", panel: "bg-amber-300/[0.06]", border: "border-amber-300/15" },

              ].map((stat) => (

                <div key={stat.label} className="rounded-2xl border border-slate-800/90 bg-[#101722] p-4 sm:p-5">

                  <div className="mb-5 flex items-center justify-between gap-2">

                    <span className="text-xs font-medium text-slate-400">{stat.label}</span>

                    <span className={`flex h-9 w-9 items-center justify-center rounded-xl border ${stat.panel} ${stat.border} ${stat.tone}`}>

                      <Icon name={stat.icon} size={17} />

                    </span>

                  </div>

                  <p className="text-3xl font-semibold tracking-tight text-white">{stat.value}</p>

                  <p className="mt-1 text-[11px] text-slate-500">{stat.note}</p>

                </div>

              ))}

            </section>



            {/* Filter and search */}

            <section className="mb-6 rounded-2xl border border-slate-800/90 bg-[#0d141e] p-3 sm:p-4">

              <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">

                <Icon name="filter" size={15} /> Filter action items

              </div>

              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

                <div className="flex gap-2 overflow-x-auto pb-1">

                  {FILTERS.map((tab) => {

                    const active = filter === tab;

                    const count =

                      tab === "Tasks" ? allTasks.length :

                        tab === "Events" ? allEvents.length :

                          tab === "Important Dates" ? allDates.length :

                            totalItems;



                    return (

                      <button

                        key={tab}

                        type="button"

                        onClick={() => setFilter(tab)}

                        className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-medium transition sm:text-sm ${active

                          ? "bg-teal-300 text-[#071116]"

                          : "border border-slate-800 bg-[#101722] text-slate-400 hover:border-slate-700 hover:text-slate-100"

                          }`}

                      >

                        {tab}

                        <span className={`rounded-md px-1.5 py-0.5 text-[10px] ${active ? "bg-black/10" : "bg-slate-800 text-slate-400"

                          }`}>{count}</span>

                      </button>

                    );

                  })}

                </div>



                <label className="relative block w-full md:max-w-[300px]">

                  <Icon name="search" size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />

                  <input

                    value={searchQuery}

                    onChange={(event) => setSearchQuery(event.target.value)}

                    placeholder="Find an action item..."

                    className="w-full rounded-xl border border-slate-800 bg-[#101722] py-2.5 pl-10 pr-4 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-teal-300/50"

                  />

                </label>

              </div>

            </section>



            {/* Item list */}

            <div className="mb-4 flex items-center justify-between gap-3">

              <div>

                <h2 className="text-sm font-semibold text-slate-200">

                  {filter === "All" ? "All action items" : filter}

                </h2>

                <p className="mt-1 text-xs text-slate-500">

                  {dbLoading ? "Loading your items..." : `${filteredItems.length} items to review`}

                </p>

              </div>

            </div>



            {dbLoading ? (

              <div className="space-y-3">

                {[1, 2, 3].map((item) => (

                  <div key={item} className="animate-pulse rounded-2xl border border-slate-800 bg-[#101722] p-5">

                    <div className="flex gap-4">

                      <div className="h-11 w-11 rounded-xl bg-slate-800" />

                      <div className="flex-1 space-y-3">

                        <div className="h-3 w-20 rounded bg-slate-800" />

                        <div className="h-4 w-2/3 rounded bg-slate-800" />

                        <div className="h-3 w-1/3 rounded bg-slate-800/70" />

                      </div>

                    </div>

                  </div>

                ))}

              </div>

            ) : filteredItems.length === 0 ? (

              <div className="rounded-2xl border border-dashed border-slate-700 bg-[#0d141e] px-5 py-16 text-center sm:py-20">

                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-700 bg-[#101722] text-teal-300">

                  <Icon name="check" size={28} />

                </div>

                <h3 className="text-lg font-semibold text-white">

                  {searchQuery.trim() ? "No matching items" : "You're all caught up"}

                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">

                  {searchQuery.trim()

                    ? "Try a different search term or change the selected filter."

                    : "When ReSurface detects tasks, events, or important dates in your screenshots, they will appear here."}

                </p>

                {searchQuery.trim() && (

                  <button

                    type="button"

                    onClick={() => setSearchQuery("")}

                    className="mt-5 rounded-xl border border-slate-700 px-4 py-2.5 text-sm text-slate-300 hover:text-teal-300"

                  >

                    Clear search

                  </button>

                )}

              </div>

            ) : (

              <div className="space-y-3">

                {filteredItems.map((item) => (

                  <ActionCard

                    key={item.id}

                    item={item}

                    addedToCalendar={Boolean(addedToCalendar[item.id])}

                    editingDateId={editingDateId}

                    editDateValue={editDateValue}

                    setEditDateValue={setEditDateValue}

                    onEditDate={handleEditDate}

                    onSaveDate={handleSaveDate}

                    onCancelEdit={() => setEditingDateId(null)}

                    onCalendar={handleCalendar}

                    onDismiss={handleDismiss}

                    onViewSource={(selected) => setSelectedScreenshot(selected.source)}

                    busy={busyItemId === item.id}

                  />

                ))}

              </div>

            )}



            <footer className="mt-12 border-t border-slate-800/70 py-5 text-center text-[11px] text-slate-600">

              ReSurface · Turn saved ideas into action

            </footer>

          </div>

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