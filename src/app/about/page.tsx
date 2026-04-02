import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
};

export default function AboutPage() {
  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-800">
      <div className="space-y-2 pb-8 pt-6">
        <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-gray-900 dark:text-gray-100 sm:text-4xl md:text-5xl">
          About
        </h1>
      </div>

      <div className="pt-10">
        <div className="flex flex-col sm:flex-row gap-10">
          {/* Profile */}
          <div className="flex flex-col items-center sm:items-start gap-4 sm:w-48 shrink-0">
            <div className="h-32 w-32 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-4xl font-bold">
              M
            </div>
            <div className="text-center sm:text-left">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                minsnote
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Developer
              </p>
            </div>
            <div className="flex gap-3">
              <a
                href="https://github.com/JINWONMIN"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-primary-500 transition-colors"
                aria-label="GitHub"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Bio */}
          <div className="prose prose-gray dark:prose-invert max-w-none flex-1">
            <p>
              안녕하세요, <strong>minsnote</strong>입니다.
            </p>
            <p>
              개발하며 배운 것들을 기록하는 블로그입니다. 주로 웹 개발, TypeScript,
              그리고 다양한 기술 주제에 대해 글을 씁니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
