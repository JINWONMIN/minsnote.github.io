import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
};

export default function AboutPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">About</h1>
      <div className="prose prose-gray dark:prose-invert max-w-none">
        <p>
          안녕하세요, <strong>jinwonmin</strong>입니다.
        </p>
        <p>개발하며 배운 것들을 기록하는 블로그입니다.</p>
        <h2>Contact</h2>
        <ul>
          <li>
            GitHub:{" "}
            <a
              href="https://github.com/jinwonmin"
              target="_blank"
              rel="noopener noreferrer"
            >
              @jinwonmin
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}
