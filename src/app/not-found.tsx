import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <h1 className="text-6xl font-extrabold tracking-tight mb-4">404</h1>
      <p className="text-lg text-gray-500 dark:text-gray-400 mb-8">
        페이지를 찾을 수 없습니다.
      </p>
      <Link
        href="/ko"
        className="px-4 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors"
      >
        홈으로 돌아가기
      </Link>
    </div>
  );
}
