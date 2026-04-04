"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import PostCard from "./PostCard";
import TagNav from "./TagNav";
import Sidebar from "./Sidebar";
import SearchInput from "./SearchInput";
import MobileFilterBar from "./MobileFilterBar";
import { matchesQuery } from "@/lib/searchPosts";
import type { PostMeta } from "@/lib/posts";

const POSTS_PER_PAGE = 5;

interface SeriesInfo {
  name: string;
  count: number;
}

interface HomeContentProps {
  posts: PostMeta[];
  tags: [string, number][];
  series: SeriesInfo[];
}

export default function HomeContent({ posts, tags, series }: HomeContentProps) {
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [activeSeries, setActiveSeries] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(POSTS_PER_PAGE);
  const loaderRef = useRef<HTMLDivElement>(null);

  const filteredPosts = posts
    .filter((post) => {
      if (activeSeries) return post.series === activeSeries;
      if (activeTag) return post.tags.includes(activeTag);
      return true;
    })
    .filter((post) => !searchQuery.trim() || matchesQuery(post, searchQuery))
    .sort((a, b) => {
      // Sort by seriesOrder when a series is selected
      if (activeSeries && a.seriesOrder && b.seriesOrder) {
        return a.seriesOrder - b.seriesOrder;
      }
      return 0; // Keep original date-based order
    });

  const visiblePosts = filteredPosts.slice(0, visibleCount);
  const hasMore = visibleCount < filteredPosts.length;

  // Reset visible count when filter changes
  useEffect(() => {
    setVisibleCount(POSTS_PER_PAGE);
  }, [activeTag, activeSeries, searchQuery]);

  // Infinite scroll with IntersectionObserver
  const loadMore = useCallback(() => {
    setVisibleCount((prev) => prev + POSTS_PER_PAGE);
  }, []);

  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  const activeFilter = activeSeries || activeTag;

  const heading = searchQuery.trim()
    ? activeFilter
      ? `${activeFilter} — '${searchQuery}' 검색 결과`
      : `'${searchQuery}' 검색 결과`
    : activeFilter
      ? activeFilter
      : "Latest";

  const subtitle =
    activeFilter || searchQuery.trim()
      ? `${filteredPosts.length}개의 포스트`
      : "";

  const emptyMessage = searchQuery.trim()
    ? "검색 결과가 없습니다."
    : "해당 포스트가 없습니다.";

  return (
    <div className="flex gap-0 lg:-mx-4">
      {/* Left Sidebar */}
      <Sidebar>
        <TagNav
          tags={tags}
          series={series}
          activeTag={activeTag}
          activeSeries={activeSeries}
          onTagClick={setActiveTag}
          onSeriesClick={setActiveSeries}
        />
      </Sidebar>

      {/* Main Content */}
      <div className="flex-1 min-w-0 px-0 sm:px-4 lg:px-8">
        <div className="space-y-2 pb-3 pt-2">
          <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-gray-900 dark:text-gray-100 sm:text-3xl lg:text-4xl">
            {heading}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {subtitle}
          </p>
        </div>

        {/* Mobile filter bar */}
        <MobileFilterBar
          tags={tags}
          series={series}
          activeTag={activeTag}
          activeSeries={activeSeries}
          onTagClick={setActiveTag}
          onSeriesClick={setActiveSeries}
        />

        <SearchInput value={searchQuery} onChange={setSearchQuery} />

        <div className="divide-y divide-gray-200 dark:divide-gray-800">
          {visiblePosts.length > 0 ? (
            visiblePosts.map((post) => (
              <PostCard
                key={post.slug}
                post={post}
                highlightQuery={searchQuery}
              />
            ))
          ) : (
            <p className="py-12 text-center text-gray-500 dark:text-gray-400">
              {emptyMessage}
            </p>
          )}
        </div>

        {hasMore && (
          <>
            <div ref={loaderRef} />
            <div className="py-8 text-center">
              <button
                onClick={loadMore}
                className="rounded-lg border border-gray-300 dark:border-gray-700 px-6 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Load more
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
