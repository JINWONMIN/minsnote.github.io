"use client";

import { useState } from "react";
import PostCard from "./PostCard";
import TagNav from "./TagNav";
import Sidebar from "./Sidebar";
import SearchInput from "./SearchInput";
import { matchesQuery } from "@/lib/searchPosts";
import type { PostMeta } from "@/lib/posts";

interface HomeContentProps {
  posts: PostMeta[];
  tags: [string, number][];
}

export default function HomeContent({ posts, tags }: HomeContentProps) {
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPosts = posts
    .filter((post) => !activeTag || post.tags.includes(activeTag))
    .filter((post) => !searchQuery.trim() || matchesQuery(post, searchQuery));

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
        <div className="space-y-2 pb-6 pt-2">
          <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-gray-900 dark:text-gray-100 sm:text-3xl lg:text-4xl">
            {heading}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {subtitle}
          </p>
        </div>

        <SearchInput value={searchQuery} onChange={setSearchQuery} />

        <div className="divide-y divide-gray-200 dark:divide-gray-800">
          {filteredPosts.length > 0 ? (
            filteredPosts.map((post) => (
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
      </div>
    </div>
  );
}
