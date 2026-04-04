import Link from "next/link";
import { formatDate } from "@/lib/formatDate";
import type { PostMeta } from "@/lib/posts";
import type { Locale, Dictionary } from "@/lib/i18n";

interface RecentPostsProps {
  posts: PostMeta[];
  currentSlug: string;
  currentTags?: string[];
  locale: Locale;
  dict: Dictionary;
}

export default function RecentPosts({ posts, currentSlug, currentTags = [], locale, dict }: RecentPostsProps) {
  const otherPosts = posts.filter((post) => post.slug !== currentSlug);

  const relatedPosts = otherPosts
    .map((post) => ({
      ...post,
      score: post.tags.filter((tag) => currentTags.includes(tag)).length,
    }))
    .sort((a, b) => b.score - a.score || new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 2);

  if (relatedPosts.length === 0) return null;

  const hasRelated = relatedPosts[0].score > 0;

  return (
    <div className="border-t border-gray-200 dark:border-gray-800 mt-16 pt-10">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">
        {hasRelated ? dict.post.relatedPosts : dict.post.otherPosts}
      </h2>
      <div className="grid gap-6 sm:grid-cols-2">
        {relatedPosts.map((post) => (
          <Link
            key={post.slug}
            href={`/${locale}/posts/${post.slug}`}
            className="group rounded-2xl border border-gray-200 dark:border-gray-800 p-5 hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
          >
            <time
              dateTime={post.date}
              className="text-xs text-gray-500 dark:text-gray-400"
            >
              {formatDate(post.date, locale)}
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
