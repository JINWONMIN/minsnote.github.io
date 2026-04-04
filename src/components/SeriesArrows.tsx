"use client";

import Link from "next/link";
import { useState } from "react";
import type { PostMeta } from "@/lib/posts";
import type { Locale } from "@/lib/i18n";

interface SeriesArrowsProps {
  series: string;
  currentSlug: string;
  posts: PostMeta[];
  locale: Locale;
}

export default function SeriesArrows({ series, currentSlug, posts, locale }: SeriesArrowsProps) {
  const [touched, setTouched] = useState<"prev" | "next" | null>(null);

  const seriesPosts = posts
    .filter((post) => post.series === series)
    .sort((a, b) => (a.seriesOrder ?? 0) - (b.seriesOrder ?? 0));

  if (seriesPosts.length <= 1) return null;

  const currentIndex = seriesPosts.findIndex((post) => post.slug === currentSlug);
  const prev = currentIndex > 0 ? seriesPosts[currentIndex - 1] : null;
  const next = currentIndex < seriesPosts.length - 1 ? seriesPosts[currentIndex + 1] : null;

  const handleTouch = (side: "prev" | "next") => {
    setTouched(side);
    setTimeout(() => setTouched(null), 2000);
  };

  return (
    <>
      {prev && (
        <Link
          href={`/${locale}/posts/${prev.slug}`}
          onTouchStart={() => handleTouch("prev")}
          className="fixed left-2 top-1/2 -translate-y-1/2 z-40 hidden lg:flex items-center gap-2 opacity-0 hover:opacity-100 transition-opacity duration-200"
        >
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white/90 px-3 py-2 shadow-lg backdrop-blur-sm dark:border-gray-700 dark:bg-gray-900/90">
            <svg className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-xs text-gray-600 dark:text-gray-300 max-w-32 line-clamp-2">{prev.title}</span>
          </div>
        </Link>
      )}
      {next && (
        <Link
          href={`/${locale}/posts/${next.slug}`}
          onTouchStart={() => handleTouch("next")}
          className="fixed right-2 top-1/2 -translate-y-1/2 z-40 hidden lg:flex items-center gap-2 opacity-0 hover:opacity-100 transition-opacity duration-200"
        >
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white/90 px-3 py-2 shadow-lg backdrop-blur-sm dark:border-gray-700 dark:bg-gray-900/90">
            <span className="text-xs text-gray-600 dark:text-gray-300 max-w-32 line-clamp-2">{next.title}</span>
            <svg className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>
      )}

      {/* Mobile: fixed bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-gray-200 bg-white/90 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-950/90 lg:hidden">
        {prev ? (
          <Link
            href={`/${locale}/posts/${prev.slug}`}
            className="flex-1 flex items-center gap-2 px-4 py-3 text-gray-600 dark:text-gray-300 active:bg-gray-100 dark:active:bg-gray-800 transition-colors"
          >
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-xs line-clamp-1">{prev.title}</span>
          </Link>
        ) : (
          <div className="flex-1" />
        )}
        {next ? (
          <Link
            href={`/${locale}/posts/${next.slug}`}
            className="flex-1 flex items-center justify-end gap-2 px-4 py-3 text-gray-600 dark:text-gray-300 active:bg-gray-100 dark:active:bg-gray-800 transition-colors border-l border-gray-200 dark:border-gray-800"
          >
            <span className="text-xs line-clamp-1">{next.title}</span>
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ) : (
          <div className="flex-1" />
        )}
      </div>
    </>
  );
}
