"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import PostCard from "./PostCard";
import TagNav from "./TagNav";
import Sidebar from "./Sidebar";
import SearchInput from "./SearchInput";
import { matchesQuery } from "@/lib/searchPosts";
import type { PostMeta } from "@/lib/posts";

const POSTS_PER_PAGE = 5;

interface HomeContentProps {
  posts: PostMeta[];
  tags: [string, number][];
}

export default function HomeContent({ posts, tags }: HomeContentProps) {
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(POSTS_PER_PAGE);
  const loaderRef = useRef<HTMLDivElement>(null);

  const filteredPosts = posts
    .filter((post) => !activeTag || post.tags.includes(activeTag))
    .filter((post) => !searchQuery.trim() || matchesQuery(post, searchQuery));

  const visiblePosts = filteredPosts.slice(0, visibleCount);
  const hasMore = visibleCount < filteredPosts.length;

  // Reset visible count when filter changes
  useEffect(() => {
    setVisibleCount(POSTS_PER_PAGE);
  }, [activeTag, searchQuery]);

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

  const heading = searchQuery.trim()
    ? activeTag
      ? `${activeTag} — '${searchQuery}' 검색 결과`
      : `'${searchQuery}' 검색 결과`
    : activeTag
      ? activeTag
      : "Latest";

  const subtitle =
    activeTag || searchQuery.trim()
      ? `${filteredPosts.length}개의 포스트`
      : "";

  const emptyMessage = searchQuery.trim()
    ? "검색 결과가 없습니다."
    : "해당 태그의 포스트가 없습니다.";

  return (
    <div className="flex gap-0 lg:-mx-4">
      {/* Left Sidebar */}
      <Sidebar>
        <TagNav tags={tags} activeTag={activeTag} onTagClick={setActiveTag} />
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
