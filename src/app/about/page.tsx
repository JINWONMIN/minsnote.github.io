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
              
            </p>
            <p>
              
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
