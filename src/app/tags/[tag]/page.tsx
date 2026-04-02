import { getAllPostMetas } from "@/lib/posts";
import PostCard from "@/components/PostCard";
import Link from "next/link";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ tag: string }>;
}

export async function generateStaticParams() {
  const posts = getAllPostMetas();
  const tags = new Set<string>();
  posts.forEach((post) => post.tags.forEach((tag) => tags.add(tag)));
  return Array.from(tags).map((tag) => ({ tag }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tag } = await params;
  return { title: `Tag: ${tag}` };
}

export default async function TagPage({ params }: Props) {
  const { tag } = await params;
  const decodedTag = decodeURIComponent(tag);
  const allPosts = getAllPostMetas();
  const posts = allPosts.filter((post) => post.tags.includes(decodedTag));

  return (
    <div>
      <div className="space-y-2 pb-8 pt-6">
        <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-gray-900 dark:text-gray-100 sm:text-4xl">
          Tag:{" "}
          <span className="text-primary-500">{decodedTag}</span>
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          {posts.length}개의 포스트
        </p>
      </div>

      <div className="divide-y divide-gray-200 dark:divide-gray-800">
        {posts.map((post) => (
          <PostCard key={post.slug} post={post} />
        ))}
      </div>

      <div className="pt-8">
        <Link
          href="/tags"
          className="text-sm font-medium text-primary-500 hover:text-primary-600 dark:hover:text-primary-300 transition-colors"
        >
          &larr; All tags
        </Link>
      </div>
    </div>
  );
}
