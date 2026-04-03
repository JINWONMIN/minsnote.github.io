import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import "highlight.js/styles/github-dark.min.css";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://jinwonmin.github.io"),
  title: {
    default: "minsnote",
    template: "%s | minsnote",
  },
  description: "이모저모 주저리주저리 ~~",
  openGraph: {
    type: "website",
    siteName: "minsnote",
    locale: "ko_KR",
  },
  alternates: {
    types: {
      "application/rss+xml": "/rss.xml",
    },
  },
  verification: {
    other: {
      "naver-site-verification": "691c49a5a029a53d09a4859edfade82b82b741f8",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} h-full scroll-smooth`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('theme');document.documentElement.classList.toggle('dark',t?t==='dark':true)})()`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-[family-name:var(--font-space-grotesk)] antialiased">
        <Header />
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-12">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
