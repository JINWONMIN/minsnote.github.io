import Link from "next/link";
import { formatDate } from "@/lib/formatDate";
import type { PostMeta } from "@/lib/posts";

interface RecentPostsProps {
  posts: PostMeta[];
  currentSlug: string;
}

export default function RecentPosts({ posts, currentSlug }: RecentPostsProps) {
  const recentPosts = posts
    .filter((post) => post.slug !== currentSlug)
    .slice(0, 2);

  if (recentPosts.length === 0) return null;

  return (
    <div className="border-t border-gray-200 dark:border-gray-800 mt-16 pt-10">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">
        다른 글 읽기
      </h2>
      <div className="grid gap-6 sm:grid-cols-2">
        {recentPosts.map((post) => (
          <Link
            key={post.slug}
            href={`/posts/${post.slug}`}
            className="group rounded-2xl border border-gray-200 dark:border-gray-800 p-5 hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
          >
            <time
              dateTime={post.date}
              className="text-xs text-gray-500 dark:text-gray-400"
            >
              {formatDate(post.date)}
            </time>
            <h3 className="mt-2 font-bold text-gray-900 dark:text-gray-100 group-hover:text-primary-500 transition-colors line-clamp-2">
              {post.title}
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
              {post.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
