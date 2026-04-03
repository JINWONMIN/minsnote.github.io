import Link from "next/link";
import type { PostMeta } from "@/lib/posts";

interface SeriesNavProps {
  series: string;
  currentSlug: string;
  posts: PostMeta[];
}

export default function SeriesNav({ series, currentSlug, posts }: SeriesNavProps) {
  const seriesPosts = posts
    .filter((post) => post.series === series)
    .sort((a, b) => (a.seriesOrder ?? 0) - (b.seriesOrder ?? 0));

  if (seriesPosts.length <= 1) return null;

  const currentIndex = seriesPosts.findIndex((post) => post.slug === currentSlug);
  const prev = currentIndex > 0 ? seriesPosts[currentIndex - 1] : null;
  const next = currentIndex < seriesPosts.length - 1 ? seriesPosts[currentIndex + 1] : null;

  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-5 mt-10">
      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">
        {series}
        <span className="ml-2 text-xs font-normal">
          ({currentIndex + 1} / {seriesPosts.length})
        </span>
      </h3>

      <details className="mb-4">
        <summary className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer hover:text-primary-500 transition-colors">
          전체 목록 보기
        </summary>
        <ol className="mt-2 space-y-1 pl-5 list-decimal">
          {seriesPosts.map((post) => (
            <li key={post.slug}>
              {post.slug === currentSlug ? (
                <span className="text-sm font-medium text-primary-500">
                  {post.title}
                </span>
              ) : (
                <Link
                  href={`/posts/${post.slug}`}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
                >
                  {post.title}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </details>

      <div className="flex justify-between gap-4">
        {prev ? (
          <Link
            href={`/posts/${prev.slug}`}
            className="flex-1 group"
          >
            <span className="text-xs text-gray-500 dark:text-gray-400">← Prev</span>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-primary-500 transition-colors line-clamp-1">
              {prev.title}
            </p>
          </Link>
        ) : (
          <div className="flex-1" />
        )}
        {next ? (
          <Link
            href={`/posts/${next.slug}`}
            className="flex-1 text-right group"
          >
            <span className="text-xs text-gray-500 dark:text-gray-400">Next →</span>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-primary-500 transition-colors line-clamp-1">
              {next.title}
            </p>
          </Link>
        ) : (
          <div className="flex-1" />
        )}
      </div>
    </div>
  );
}
