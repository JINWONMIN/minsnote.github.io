import { getPostBySlug, getAllPostSlugs, getAllPostMetas } from "@/lib/posts";
import { formatDate } from "@/lib/formatDate";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import TableOfContents from "@/components/TableOfContents";
import RecentPosts from "@/components/RecentPosts";
import ViewCounter from "@/components/ViewCounter";
import Comments from "@/components/Comments";
import CopyProtection from "@/components/CopyProtection";
import CodeCopyButton from "@/components/CodeCopyButton";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = getAllPostSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  const url = `https://jinwonmin.github.io/posts/${slug}`;
  return {
    title: post.title,
    description: post.description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: post.title,
      description: post.description,
      url,
      type: "article",
      publishedTime: new Date(post.date).toISOString(),
      tags: post.tags,
    },
  };
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  const allPosts = getAllPostMetas();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: new Date(post.date).toISOString(),
    author: { "@type": "Person", name: "minsnote" },
    url: `https://jinwonmin.github.io/posts/${slug}`,
    keywords: post.tags.join(", "),
  };

  return (
    <div className="flex gap-0 lg:-mx-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Left Sidebar - TOC */}
      <Sidebar>
        <nav>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
            On this page
          </h3>
          <TableOfContents />
        </nav>
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-800">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to blog
          </Link>
        </div>
      </Sidebar>

      {/* Main Content */}
      <div className="flex-1 min-w-0 px-0 sm:px-4 lg:px-8">
        <article>
          <header className="space-y-4 border-b border-gray-200 dark:border-gray-800 pb-10 pt-2">
            <div>
              <time
                dateTime={post.date}
                className="text-sm text-gray-500 dark:text-gray-400"
              >
                {formatDate(post.date)}
              </time>
            </div>
            <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-gray-900 dark:text-gray-100 sm:text-3xl lg:text-4xl">
              {post.title}
            </h1>
            <div className="flex items-center gap-4">
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
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {post.readingTime}
              </span>
              <ViewCounter slug={slug} />
            </div>
          </header>

          <CopyProtection />
          <CodeCopyButton />
          <div
            className="prose prose-gray dark:prose-invert max-w-none pt-10 prose-a:text-primary-500 prose-a:no-underline hover:prose-a:underline"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </article>

        <Comments slug={slug} />

        {/* Recent Posts */}
        <RecentPosts posts={allPosts} currentSlug={slug} />
      </div>
    </div>
  );
}
