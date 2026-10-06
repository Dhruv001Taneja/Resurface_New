"use client";

import React from "react";

// Pipeline stage badge component
function PipelineStep({ label, status }) {
  const getBadgeStyle = () => {
    switch (status) {
      case "completed":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "processing":
        return "bg-amber-100 text-amber-800 border-amber-300 animate-pulse";
      case "failed":
        return "bg-red-100 text-red-800 border-red-300";
      default:
        return "bg-gray-100 text-gray-500 border-gray-300";
    }
  };

  const getIcon = () => {
    switch (status) {
      case "completed":
        return "✓";
      case "processing":
        return "⏳";
      case "failed":
        return "✕";
      default:
        return "○";
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${getBadgeStyle()}`}
    >
      <span>{getIcon()}</span>
      <span>{label}</span>
    </span>
  );
}

export default function ScreenshotDetailsModal({ screenshot, onClose }) {
  if (!screenshot) return null;

  // Safe field extractors
  const getField = (field, fallback = "") => {
    if (field === "title") {
      return (
        screenshot.aiAnalysis?.title ||
        screenshot.title ||
        screenshot.originalName ||
        "Untitled Screenshot"
      );
    }
    if (field === "summary") {
      return screenshot.aiAnalysis?.summary || screenshot.summary || "";
    }
    if (field === "category") {
      return screenshot.aiAnalysis?.category || screenshot.category || "Other";
    }
    if (field === "ocrText") {
      return screenshot.ocr?.extractedText || screenshot.extractedText || "";
    }
    return fallback;
  };

  const getTags = () => {
    if (Array.isArray(screenshot.aiAnalysis?.tags) && screenshot.aiAnalysis.tags.length > 0) {
      return screenshot.aiAnalysis.tags;
    }
    if (Array.isArray(screenshot.tags) && screenshot.tags.length > 0) {
      return screenshot.tags;
    }
    return [];
  };

  const getExtractedDates = () => {
    if (Array.isArray(screenshot.aiAnalysis?.extractedDates) && screenshot.aiAnalysis.extractedDates.length > 0) {
      return screenshot.aiAnalysis.extractedDates;
    }
    if (Array.isArray(screenshot.aiAnalysis?.entities?.dates) && screenshot.aiAnalysis.entities.dates.length > 0) {
      return screenshot.aiAnalysis.entities.dates.map((d) => ({ dateText: d, context: "" }));
    }
    return [];
  };

  const getExtractedTasks = () => {
    if (Array.isArray(screenshot.aiAnalysis?.extractedTasks) && screenshot.aiAnalysis.extractedTasks.length > 0) {
      return screenshot.aiAnalysis.extractedTasks;
    }
    if (Array.isArray(screenshot.tasks) && screenshot.tasks.length > 0) {
      return screenshot.tasks.map((t) => ({
        task: t.description || t.task,
        dueDate: t.dueDate,
        priority: t.priority || "medium",
      }));
    }
    return [];
  };

  const getExtractedEvents = () => {
    if (Array.isArray(screenshot.aiAnalysis?.extractedEvents) && screenshot.aiAnalysis.extractedEvents.length > 0) {
      return screenshot.aiAnalysis.extractedEvents;
    }
    return [];
  };

  const getEntities = () => {
    const ent = screenshot.aiAnalysis?.entities;
    if (!ent) return null;
    const hasAny = Object.values(ent).some((arr) => Array.isArray(arr) && arr.length > 0);
    return hasAny ? ent : null;
  };

  const isProcessing =
    screenshot.processingPipeline?.overall !== "completed" &&
    screenshot.processingPipeline?.overall !== "failed" &&
    (screenshot.ocr?.status === "processing" ||
      screenshot.aiAnalysis?.status === "processing" ||
      screenshot.aiAnalysis?.status === "pending" ||
      screenshot.processingPipeline?.ocr === "processing" ||
      screenshot.processingPipeline?.visionAI === "processing");

  const pipeline = screenshot.processingPipeline || {};

  return (
    <div
      className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white border border-gray-200 rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="text-xl shrink-0">📸</span>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 truncate">
                {getField("title")}
              </h2>
              {getField("category") && (
                <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 mt-1">
                  {getField("category")}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 p-1.5 rounded-lg text-lg font-bold transition-colors shrink-0 ml-3"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Processing Pipeline Progress Bar */}
        {isProcessing && (
          <div className="px-6 py-3 bg-amber-50/80 border-b border-amber-200">
            <div className="flex items-center gap-2 mb-2">
              <svg className="animate-spin h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-xs font-bold text-amber-800">Processing Screenshot Pipeline...</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <PipelineStep label="Upload" status={pipeline.upload || "completed"} />
              <span className="text-gray-400 self-center">→</span>
              <PipelineStep label="OCR" status={pipeline.ocr || screenshot.ocr?.status || "pending"} />
              <span className="text-gray-400 self-center">→</span>
              <PipelineStep
                label="Vision AI"
                status={pipeline.visionAI || (screenshot.aiAnalysis?.status === "processing" ? "processing" : "pending")}
              />
              <span className="text-gray-400 self-center">→</span>
              <PipelineStep label="Extraction" status={pipeline.extraction || "pending"} />
            </div>
          </div>
        )}

        {/* Completed success banner */}
        {!isProcessing && pipeline.overall === "completed" && (
          <div className="px-6 py-2 bg-emerald-50 border-b border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
            <span>✅</span>
            <span>Analysis complete — stored in Cloudinary & MongoDB</span>
          </div>
        )}

        {/* Failed banner */}
        {pipeline.overall === "failed" && (
          <div className="px-6 py-2 bg-red-50 border-b border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
            <span>❌</span>
            <span>Processing failed: {screenshot.aiAnalysis?.error || "Unknown error"}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TOP SPLIT: SCREENSHOT PREVIEW (LEFT) + AI SUMMARY & DETECTED INFO (RIGHT) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* 1. SCREENSHOT PREVIEW */}
            <div className="bg-gray-100 border border-gray-200 rounded-xl p-3 flex flex-col items-center justify-center min-h-[260px]">
              <img
                src={
                  screenshot.storage?.imageUrl ||
                  screenshot.imageUrl ||
                  screenshot.storage?.thumbnailUrl ||
                  "https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80"
                }
                alt={getField("title")}
                className="max-h-[350px] w-auto max-w-full object-contain rounded-lg shadow-sm"
              />
              <div className="mt-2 text-[11px] font-mono text-gray-500 text-center truncate max-w-full">
                {screenshot.storage?.provider === "cloudinary"
                  ? "☁️ Cloudinary Hosted Image"
                  : "🖼️ Image Preview"}
              </div>
            </div>

            {/* 2. AI SUMMARY & DETECTED INFORMATION */}
            <div className="space-y-4">
              {/* AI SUMMARY BLOCK */}
              <div>
                <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-1.5">
                  AI Summary
                </h3>
                <p className="text-gray-800 text-sm leading-relaxed font-normal bg-gray-50 p-3 rounded-lg border border-gray-200">
                  {getField("summary") ||
                    (isProcessing ? "Generating summary..." : "No summary available for this screenshot.")}
                </p>
              </div>

              {/* CATEGORY & TAGS */}
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <span className="text-xs font-semibold text-gray-500 mr-2">Category:</span>
                  <span className="inline-block text-xs font-extrabold px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {getField("category")}
                  </span>
                </div>

                {getTags().length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-semibold text-gray-500">Tags:</span>
                    {getTags().map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200 font-mono"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* EXTRACTED INFORMATION SECTION */}
              <div className="pt-2 border-t border-gray-200 space-y-3">
                <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">
                  Extracted Information
                </h3>

                {/* Extracted Dates */}
                {getExtractedDates().length > 0 && (
                  <div className="flex items-start gap-2 text-xs text-gray-800">
                    <span className="text-base">📅</span>
                    <div>
                      <span className="font-bold text-gray-900">Dates: </span>
                      <div className="mt-1 space-y-1">
                        {getExtractedDates().map((d, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                              {d.dateText || d}
                            </span>
                            {d.context && <span className="text-gray-500 italic">— {d.context}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Extracted Tasks */}
                {getExtractedTasks().length > 0 && (
                  <div className="flex items-start gap-2 text-xs text-gray-800">
                    <span className="text-base">📋</span>
                    <div>
                      <span className="font-bold text-gray-900">Tasks: </span>
                      <ul className="list-none mt-1 space-y-1.5">
                        {getExtractedTasks().map((task, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span
                              className={`shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                task.priority === "high"
                                  ? "bg-red-100 text-red-700"
                                  : task.priority === "low"
                                  ? "bg-gray-100 text-gray-600"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {task.priority || "medium"}
                            </span>
                            <span className="font-medium text-gray-700">
                              {task.task || task.description || "Task"}
                            </span>
                            {task.dueDate && <span className="text-gray-400 italic">due: {task.dueDate}</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Extracted Events */}
                {getExtractedEvents().length > 0 && (
                  <div className="flex items-start gap-2 text-xs text-gray-800">
                    <span className="text-base">📅</span>
                    <div>
                      <span className="font-bold text-gray-900">Events: </span>
                      <ul className="list-none mt-1 space-y-1.5">
                        {getExtractedEvents().map((evt, idx) => (
                          <li key={idx} className="bg-purple-50 border border-purple-200 rounded-lg px-2.5 py-1.5">
                            <div className="font-semibold text-purple-800">{evt.event}</div>
                            <div className="flex flex-wrap gap-2 mt-0.5 text-purple-600">
                              {evt.date && <span>📅 {evt.date}</span>}
                              {evt.time && <span>🕐 {evt.time}</span>}
                              {evt.location && <span>📍 {evt.location}</span>}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Detected Entities */}
                {getEntities() && (
                  <div className="flex items-start gap-2 text-xs text-gray-800">
                    <span className="text-base">🔗</span>
                    <div>
                      <span className="font-bold text-gray-900">Entities: </span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {getEntities().amounts?.map((a, i) => (
                          <span
                            key={`amt-${i}`}
                            className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono"
                          >
                            💰 {a}
                          </span>
                        ))}
                        {getEntities().urls?.map((u, i) => (
                          <span
                            key={`url-${i}`}
                            className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-mono truncate max-w-[200px]"
                          >
                            🔗 {u}
                          </span>
                        ))}
                        {getEntities().emails?.map((e, i) => (
                          <span
                            key={`email-${i}`}
                            className="px-2 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200 font-mono"
                          >
                            ✉️ {e}
                          </span>
                        ))}
                        {getEntities().phoneNumbers?.map((p, i) => (
                          <span
                            key={`phone-${i}`}
                            className="px-2 py-0.5 rounded bg-cyan-50 text-cyan-800 border border-cyan-200 font-mono"
                          >
                            📞 {p}
                          </span>
                        ))}
                        {getEntities().names?.map((n, i) => (
                          <span
                            key={`name-${i}`}
                            className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-mono"
                          >
                            👤 {n}
                          </span>
                        ))}
                        {getEntities().addresses?.map((a, i) => (
                          <span
                            key={`addr-${i}`}
                            className="px-2 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200 font-mono"
                          >
                            📍 {a}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* No info fallback */}
                {!isProcessing &&
                  getExtractedDates().length === 0 &&
                  getExtractedTasks().length === 0 &&
                  getExtractedEvents().length === 0 &&
                  !getEntities() && (
                    <div className="text-xs text-gray-400 italic py-2">
                      No structured information was extracted from this screenshot.
                    </div>
                  )}
              </div>
            </div>
          </div>

          {/* BOTTOM FULL-WIDTH: OCR EXTRACTED TEXT SECTION */}
          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-2">
              OCR Extracted Text
            </h3>
            {getField("ocrText") ? (
              <pre className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-mono text-gray-800 whitespace-pre-wrap leading-relaxed max-h-52 overflow-y-auto selection:bg-indigo-200">
                {getField("ocrText")}
              </pre>
            ) : (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono text-gray-400 italic text-center">
                {isProcessing
                  ? "OCR text extraction in progress..."
                  : "No OCR text recognized from this image."}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50/50 flex items-center justify-between">
          <span className="text-xs text-gray-500 font-mono">
            {screenshot.createdAt
              ? `Uploaded ${new Date(screenshot.createdAt).toLocaleString()}`
              : ""}
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg text-sm font-semibold transition-colors shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
