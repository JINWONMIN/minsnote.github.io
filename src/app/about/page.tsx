import type { Metadata } from "next";
import AboutProfile from "@/components/AboutProfile";

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
          <AboutProfile />

          {/* Bio */}
          <div className="prose prose-gray dark:prose-invert max-w-none flex-1">
            <p>
              안녕하세요, <strong>minsnote</strong>입니다.
            </p>
            <p>
              개인적인 생각을 이모저모 적어 놓는 중입니다.
              주로 웹 개발, TypeScript, 그리고 다양한 주제에 대해 글을 작성하려고 하는데 음.. 언제까지 하게 될지는,,, ㅎㅎㅎ
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
