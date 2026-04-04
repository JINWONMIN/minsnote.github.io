"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface SeriesInfo {
  name: string;
  count: number;
}

interface TagNavProps {
  tags: [string, number][];
  series: SeriesInfo[];
  activeTag: string | null;
  activeSeries: string | null;
  onTagClick: (tag: string | null) => void;
  onSeriesClick: (series: string | null) => void;
}

export default function TagNav({
  tags,
  series,
  activeTag,
  activeSeries,
  onTagClick,
  onSeriesClick,
}: TagNavProps) {
  const [seriesOpen, setSeriesOpen] = useState(true);
  const [tagsOpen, setTagsOpen] = useState(true);
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    function handleMouseEnter(e: MouseEvent) {
      const el = e.target as HTMLElement;
      if (!el.classList.contains("truncate")) return;
      if (el.scrollWidth <= el.clientWidth) return;
      if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
      tooltipTimer.current = setTimeout(() => {
        const rect = el.getBoundingClientRect();
        setTooltip({
          text: el.textContent || "",
          x: rect.left + rect.width / 2,
          y: rect.top - 6,
        });
      }, 300);
    }

    function handleMouseLeave(e: MouseEvent) {
      const el = e.target as HTMLElement;
      if (el.classList.contains("truncate")) {
        if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
        setTooltip(null);
      }
    }

    nav.addEventListener("mouseenter", handleMouseEnter, true);
    nav.addEventListener("mouseleave", handleMouseLeave, true);
    return () => {
      nav.removeEventListener("mouseenter", handleMouseEnter, true);
      nav.removeEventListener("mouseleave", handleMouseLeave, true);
      if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    };
  }, []);

  function handleAllClick() {
    onTagClick(null);
    onSeriesClick(null);
  }

  function handleSeriesClick(name: string) {
    onTagClick(null);
    onSeriesClick(name);
  }

  function handleTagClick(tag: string) {
    onSeriesClick(null);
    onTagClick(tag);
  }

  const isAll = activeTag === null && activeSeries === null;

  return (
    <>
    <nav ref={navRef} className="space-y-4">
      {/* All */}
      <button
        onClick={handleAllClick}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
          isAll
            ? "bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 font-medium"
            : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
        }`}
      >
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <span>전체</span>
      </button>

      {/* Series */}
      {series.length > 0 && (
        <div>
          <button
            onClick={() => setSeriesOpen(!seriesOpen)}
            className="w-full flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <span>Series</span>
            <svg
              className={`h-3.5 w-3.5 transition-transform ${seriesOpen ? "rotate-0" : "-rotate-90"}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {seriesOpen && (
            <ul className="space-y-0.5">
              {series.map((s) => (
                <li key={s.name}>
                  <button
                    onClick={() => handleSeriesClick(s.name)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                      activeSeries === s.name
                        ? "bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 font-medium"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      <span className="truncate">{s.name}</span>
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                      {s.count}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Tags */}
      <div>
        <button
          onClick={() => setTagsOpen(!tagsOpen)}
          className="w-full flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <span>Tags</span>
          <svg
            className={`h-3.5 w-3.5 transition-transform ${tagsOpen ? "rotate-0" : "-rotate-90"}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {tagsOpen && (
          <ul className="space-y-0.5">
            {tags.map(([tag, count]) => (
              <li key={tag}>
                <button
                  onClick={() => handleTagClick(tag)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    activeTag === tag
                      ? "bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 font-medium"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    <span className="truncate">{tag}</span>
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                    {count}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </nav>
    {tooltip && createPortal(
      <div
        className="fixed z-[9999] px-2 py-1 rounded-md text-xs whitespace-nowrap pointer-events-none bg-gray-800 dark:bg-gray-700 text-gray-100 border border-gray-700 dark:border-gray-600"
        style={{
          left: tooltip.x,
          top: tooltip.y,
          transform: "translate(-50%, -100%)",
        }}
      >
        {tooltip.text}
      </div>,
      document.body
    )}
    </>
  );
}
