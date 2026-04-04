import { getAllPostMetas } from "@/lib/posts";
import HomeContent from "@/components/HomeContent";

export default function Home() {
  const posts = getAllPostMetas();

  // Extract series
  const seriesCounts: Record<string, number> = {};
  posts.forEach((post) => {
    if (post.series) {
      seriesCounts[post.series] = (seriesCounts[post.series] || 0) + 1;
    }
  });
  const seriesList = Object.entries(seriesCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));

  // Extract tags, excluding "Blog Series" (handled by series section)
  const tagCounts: Record<string, number> = {};
  posts.forEach((post) => {
    post.tags.forEach((tag) => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });
  const sortedTags = Object.entries(tagCounts).sort(
    (a, b) => b[1] - a[1]
  ) as [string, number][];

  return <HomeContent posts={posts} tags={sortedTags} series={seriesList} />;
}
