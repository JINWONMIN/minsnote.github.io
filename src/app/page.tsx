import { getAllPostMetas } from "@/lib/posts";
import PostCard from "@/components/PostCard";

export default function Home() {
  const posts = getAllPostMetas();

  return (
    <div>
      <section className="mb-10">
        <h1 className="text-3xl font-bold mb-2">Blog</h1>
        <p className="text-gray-600 dark:text-gray-400">
          개발하며 배운 것들을 기록합니다.
        </p>
      </section>

      <div className="divide-y divide-gray-200 dark:divide-gray-800">
        {posts.length > 0 ? (
          posts.map((post) => <PostCard key={post.slug} post={post} />)
        ) : (
          <p className="text-gray-500 py-10">아직 작성된 포스트가 없습니다.</p>
        )}
      </div>
    </div>
  );
}
