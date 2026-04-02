import { getAllPostMetas } from "@/lib/posts";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tags",
};

export default function TagsPage() {
  const posts = getAllPostMetas();

  const tagCounts: Record<string, number> = {};
  posts.forEach((post) => {
    post.tags.forEach((tag) => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });

  const sortedTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);

  return (
    <div>
      <div className="space-y-2 pb-8 pt-6">
        <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-gray-900 dark:text-gray-100 sm:text-4xl md:text-5xl">
          Tags
        </h1>
      </div>

      <div className="flex flex-wrap gap-3 pt-4">
        {sortedTags.map(([tag, count]) => (
          <Link
            key={tag}
            href={`/tags/${encodeURIComponent(tag)}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors"
          >
            {tag}
            <span className="text-xs text-primary-400 dark:text-primary-500">
              ({count})
            </span>
          </Link>
        ))}
      </div>

      {sortedTags.length === 0 && (
        <p className="py-12 text-center text-gray-500 dark:text-gray-400">
          아직 태그가 없습니다.
        </p>
      )}
    </div>
  );
}
