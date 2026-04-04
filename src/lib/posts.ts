import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeHighlight from "rehype-highlight";
import rehypeStringify from "rehype-stringify";
import readingTime from "reading-time";
import { type Locale, defaultLocale } from "./i18n";

export interface Post {
  slug: string;
  title: string;
  date: string;
  description: string;
  tags: string[];
  readingTime: string;
  series?: string;
  seriesOrder?: number;
  content: string;
}

export interface PostMeta {
  slug: string;
  title: string;
  date: string;
  description: string;
  tags: string[];
  readingTime: string;
  series?: string;
  seriesOrder?: number;
}

function getPostsDirectory(locale: Locale): string {
  return path.join(process.cwd(), "posts", locale);
}

export function getAllPostMetas(locale: Locale = defaultLocale): PostMeta[] {
  const postsDirectory = getPostsDirectory(locale);
  if (!fs.existsSync(postsDirectory)) return [];
  const fileNames = fs.readdirSync(postsDirectory);

  const posts = fileNames
    .filter((name) => name.endsWith(".md"))
    .map((fileName) => {
      const slug = fileName.replace(/\.md$/, "");
      const fullPath = path.join(postsDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, "utf8");
      const { data, content } = matter(fileContents);
      const stats = readingTime(content);

      const date = data.date instanceof Date
        ? data.date.toISOString().split("T")[0]
        : String(data.date);

      return {
        slug,
        title: data.title,
        date,
        description: data.description || "",
        tags: data.tags || [],
        readingTime: stats.text,
        series: data.series || undefined,
        seriesOrder: data.seriesOrder || undefined,
      };
    });

  return posts.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return a.slug < b.slug ? -1 : 1;
  });
}

export async function getPostBySlug(slug: string, locale: Locale = defaultLocale): Promise<Post> {
  const postsDirectory = getPostsDirectory(locale);
  const fullPath = path.join(postsDirectory, `${slug}.md`);
  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);
  const stats = readingTime(content);

  const processedContent = await remark()
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeHighlight)
    .use(rehypeStringify)
    .process(content);
  const contentHtml = processedContent.toString();

  const date = data.date instanceof Date
    ? data.date.toISOString().split("T")[0]
    : String(data.date);

  return {
    slug,
    title: data.title,
    date,
    description: data.description || "",
    tags: data.tags || [],
    readingTime: stats.text,
    series: data.series || undefined,
    seriesOrder: data.seriesOrder || undefined,
    content: contentHtml,
  };
}

export function getAllPostSlugs(locale: Locale = defaultLocale): string[] {
  const postsDirectory = getPostsDirectory(locale);
  if (!fs.existsSync(postsDirectory)) return [];
  const fileNames = fs.readdirSync(postsDirectory);
  return fileNames
    .filter((name) => name.endsWith(".md"))
    .map((name) => name.replace(/\.md$/, ""));
}
