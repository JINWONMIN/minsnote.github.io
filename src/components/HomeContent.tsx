"use client";

import { useState } from "react";
import PostCard from "./PostCard";
import TagNav from "./TagNav";
import Sidebar from "./Sidebar";
import type { PostMeta } from "@/lib/posts";

interface HomeContentProps {
  posts: PostMeta[];
  tags: [string, number][];
}

export default function HomeContent({ posts, tags }: HomeContentProps) {
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const filteredPosts = activeTag
    ? posts.filter((post) => post.tags.includes(activeTag))
    : posts;

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
            {activeTag ? activeTag : "Latest"}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {activeTag
              ? `${filteredPosts.length}개의 포스트`
              : "이모저모 주저리주저리,,,"}
          </p>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-gray-800">
          {filteredPosts.length > 0 ? (
            filteredPosts.map((post) => (
              <PostCard key={post.slug} post={post} />
            ))
          ) : (
            <p className="py-12 text-center text-gray-500 dark:text-gray-400">
              해당 태그의 포스트가 없습니다.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
