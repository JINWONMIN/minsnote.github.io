"use client";

import { useState } from "react";
import type { Dictionary } from "@/lib/i18n";

interface SeriesInfo {
  name: string;
  count: number;
}

interface MobileFilterBarProps {
  tags: [string, number][];
  series: SeriesInfo[];
  activeTag: string | null;
  activeSeries: string | null;
  onTagClick: (tag: string | null) => void;
  onSeriesClick: (series: string | null) => void;
  dict: Dictionary;
}

type Tab = "all" | "series" | "tags";

export default function MobileFilterBar({
  tags,
  series,
  activeTag,
  activeSeries,
  onTagClick,
  onSeriesClick,
  dict,
}: MobileFilterBarProps) {
  const [tab, setTab] = useState<Tab>("all");

  function handleTabClick(t: Tab) {
    if (t === "all") {
      onTagClick(null);
      onSeriesClick(null);
    }
    setTab(t);
  }

  function handleSeriesClick(name: string) {
    onTagClick(null);
    onSeriesClick(activeSeries === name ? null : name);
  }

  function handleTagClick(tag: string) {
    onSeriesClick(null);
    onTagClick(activeTag === tag ? null : tag);
  }

  const tabBase =
    "px-4 py-1.5 rounded-full text-xs font-medium transition-colors";
  const tabActive =
    "bg-primary-500 text-white";
  const tabInactive =
    "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400";

  const chipBase =
    "px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap";
  const chipActive =
    "bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400";
  const chipInactive =
    "bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700";

  return (
    <div className="lg:hidden mb-4 space-y-3">
      {/* Tab toggles */}
      <div className="flex gap-2">
        <button
          onClick={() => handleTabClick("all")}
          className={`${tabBase} ${tab === "all" ? tabActive : tabInactive}`}
        >
          {dict.filter.all}
        </button>
        <button
          onClick={() => handleTabClick("series")}
          className={`${tabBase} ${tab === "series" ? tabActive : tabInactive}`}
        >
          Series
        </button>
        <button
          onClick={() => handleTabClick("tags")}
          className={`${tabBase} ${tab === "tags" ? tabActive : tabInactive}`}
        >
          Tags
        </button>
      </div>

      {/* Sub items */}
      {tab === "series" && (
        <div className="flex flex-wrap gap-2">
          {series.map((s) => (
            <button
              key={s.name}
              onClick={() => handleSeriesClick(s.name)}
              className={`${chipBase} ${activeSeries === s.name ? chipActive : chipInactive}`}
            >
              {s.name} ({s.count})
            </button>
          ))}
        </div>
      )}

      {tab === "tags" && (
        <div className="flex flex-wrap gap-2">
          {tags.map(([tag, count]) => (
            <button
              key={tag}
              onClick={() => handleTagClick(tag)}
              className={`${chipBase} ${activeTag === tag ? chipActive : chipInactive}`}
            >
              {tag} ({count})
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
