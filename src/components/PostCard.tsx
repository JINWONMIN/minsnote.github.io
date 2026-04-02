import Link from "next/link";
import { formatDate } from "@/lib/formatDate";
import type { PostMeta } from "@/lib/posts";

interface PostCardProps {
  post: PostMeta;
}

export default function PostCard({ post }: PostCardProps) {
  return (
    <article className="py-8">
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-8">
        <div className="sm:w-36 shrink-0">
          <time
            dateTime={post.date}
            className="text-sm text-gray-500 dark:text-gray-400"
          >
            {formatDate(post.date)}
          </time>
        </div>

        <div className="flex-1 space-y-3">
          <div>
            <Link href={`/posts/${post.slug}`}>
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 hover:text-primary-500 dark:hover:text-primary-400 transition-colors">
                {post.title}
              </h2>
            </Link>
          </div>

          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/tags/${encodeURIComponent(tag)}`}
                  className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors"
                >
                  {tag}
                </Link>
              ))}
            </div>
          )}

          <p className="text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-2">
            {post.description}
          </p>

          <div className="flex items-center gap-4">
            <Link
              href={`/posts/${post.slug}`}
              className="text-sm font-medium text-primary-500 hover:text-primary-600 dark:hover:text-primary-300 transition-colors"
            >
              Read more &rarr;
            </Link>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {post.readingTime}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
