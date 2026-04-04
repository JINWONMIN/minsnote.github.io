import { Suspense } from "react";
import { getAllPostMetas } from "@/lib/posts";
import HomeContent from "@/components/HomeContent";
import { type Locale } from "@/lib/i18n";

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function Home({ params }: Props) {
  const { locale } = await params;
  const posts = getAllPostMetas(locale as Locale);

  const seriesCounts: Record<string, number> = {};
  posts.forEach((post) => {
    if (post.series) {
      seriesCounts[post.series] = (seriesCounts[post.series] || 0) + 1;
    }
  });
  const seriesList = Object.entries(seriesCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));

  const tagCounts: Record<string, number> = {};
  posts.forEach((post) => {
    post.tags.forEach((tag) => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });
  const sortedTags = Object.entries(tagCounts).sort(
    (a, b) => b[1] - a[1]
  ) as [string, number][];

  return (
    <Suspense>
      <HomeContent
        posts={posts}
        tags={sortedTags}
        series={seriesList}
        locale={locale as Locale}
      />
    </Suspense>
  );
}
