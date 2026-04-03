"use client";

import { useEffect, useState } from "react";
import { getLikes, toggleLike } from "@/lib/api";

export default function LikeButton({ slug }: { slug: string }) {
  const [likes, setLikes] = useState<number | null>(null);
  const [liked, setLiked] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    getLikes(slug)
      .then((data) => {
        setLikes(data.likes);
        setLiked(data.liked);
      })
      .catch(() => {});
  }, [slug]);

  async function handleClick() {
    setAnimating(true);
    setTimeout(() => setAnimating(false), 300);

    const result = await toggleLike(slug).catch(() => null);
    if (result) {
      setLikes(result.likes);
      setLiked(result.liked);
    }
  }

  if (likes === null) return null;

  return (
    <button
      onClick={handleClick}
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
      {likes > 0 && <span>{likes.toLocaleString()}</span>}
    </button>
  );
}
