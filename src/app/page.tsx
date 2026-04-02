import { getAllPostMetas } from "@/lib/posts";
import HomeContent from "@/components/HomeContent";

export default function Home() {
  const posts = getAllPostMetas();

  const tagCounts: Record<string, number> = {};
  posts.forEach((post) => {
    post.tags.forEach((tag) => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });
  const sortedTags = Object.entries(tagCounts).sort(
    (a, b) => b[1] - a[1]
  ) as [string, number][];

  return <HomeContent posts={posts} tags={sortedTags} />;
}
