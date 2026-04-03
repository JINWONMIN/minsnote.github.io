"use client";

import { useEffect, useState } from "react";
import { getPostStats, toggleLike } from "@/lib/api";

export default function PostStats({ slug }: { slug: string }) {
  const [views, setViews] = useState<number | null>(null);
  const [likes, setLikes] = useState<number | null>(null);
  const [liked, setLiked] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    getPostStats(slug)
      .then((data) => {
        setViews(data.views);
        setLikes(data.likes);
        setLiked(data.liked);
      })
      .catch(() => {});
  }, [slug]);

  async function handleLike() {
    setAnimating(true);
    setTimeout(() => setAnimating(false), 300);

    const result = await toggleLike(slug).catch(() => null);
    if (result) {
      setLikes(result.likes);
      setLiked(result.liked);
    }
  }

  return (
    <>
      <span className="inline-flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.64 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.64 0-8.573-3.007-9.963-7.178z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        {views !== null && views.toLocaleString()}
      </span>
      <button
        onClick={handleLike}
        className={`inline-flex items-center gap-1 text-xs transition-colors ${
          liked
            ? "text-primary-500"
            : "text-gray-400 dark:text-gray-500 hover:text-primary-500"
        }`}
      >
        <svg
          className={`h-3.5 w-3.5 transition-transform ${animating ? "scale-125" : ""}`}
          fill={liked ? "currentColor" : "none"}
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"
          />
        </svg>
        {likes !== null && likes > 0 && <span>{likes.toLocaleString()}</span>}
      </button>
    </>
  );
}
