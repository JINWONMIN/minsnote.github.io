"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import PostCard from "./PostCard";
import TagNav from "./TagNav";
import Sidebar from "./Sidebar";
import SearchInput from "./SearchInput";
import MobileFilterBar from "./MobileFilterBar";
import { matchesQuery } from "@/lib/searchPosts";
import { getDictionary, type Locale } from "@/lib/i18n";
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
  locale: Locale;
}

export default function HomeContent({ posts, tags, series, locale }: HomeContentProps) {
  const dict = getDictionary(locale);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [activeTag, setActiveTag] = useState<string | null>(searchParams.get("tag"));
  const [activeSeries, setActiveSeries] = useState<string | null>(searchParams.get("series"));
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [visibleCount, setVisibleCount] = useState(POSTS_PER_PAGE);
  const loaderRef = useRef<HTMLDivElement>(null);

  // Sync filter state to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (activeTag) params.set("tag", activeTag);
    if (activeSeries) params.set("series", activeSeries);
    if (searchQuery.trim()) params.set("q", searchQuery.trim());
    const qs = params.toString();
    const newUrl = qs ? `${pathname}?${qs}` : pathname;
    router.replace(newUrl, { scroll: false });
  }, [activeTag, activeSeries, searchQuery, pathname, router]);

  // Sync from URL params when locale changes (e.g. language switch)
  useEffect(() => {
    setActiveTag(searchParams.get("tag"));
    setActiveSeries(searchParams.get("series"));
    setSearchQuery(searchParams.get("q") || "");
  }, [searchParams]);

  const filteredPosts = posts
    .filter((post) => {
      if (activeSeries) return post.series === activeSeries;
      if (activeTag) return post.tags.includes(activeTag);
      return true;
    })
    .filter((post) => !searchQuery.trim() || matchesQuery(post, searchQuery))
    .sort((a, b) => {
      if (activeSeries && a.seriesOrder && b.seriesOrder) {
        return a.seriesOrder - b.seriesOrder;
      }
      return 0;
    });

  const visiblePosts = filteredPosts.slice(0, visibleCount);
  const hasMore = visibleCount < filteredPosts.length;

  useEffect(() => {
    setVisibleCount(POSTS_PER_PAGE);
  }, [activeTag, activeSeries, searchQuery]);

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
      ? `${activeFilter} — '${searchQuery}' ${dict.home.searchResults}`
      : `'${searchQuery}' ${dict.home.searchResults}`
    : activeFilter
      ? activeFilter
      : dict.home.latest;

  const subtitle =
    activeFilter || searchQuery.trim()
      ? `${filteredPosts.length}${dict.home.postCount}`
      : "";

  const emptyMessage = searchQuery.trim()
    ? dict.home.noSearchResults
    : dict.home.noPosts;

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
          dict={dict}
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
          dict={dict}
        />

        <SearchInput value={searchQuery} onChange={setSearchQuery} />

        <div className="divide-y divide-gray-200 dark:divide-gray-800">
          {visiblePosts.length > 0 ? (
            visiblePosts.map((post) => (
              <PostCard
                key={post.slug}
                post={post}
                highlightQuery={searchQuery}
                locale={locale}
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
                {dict.home.loadMore}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
