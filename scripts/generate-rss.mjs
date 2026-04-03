import fs from "fs";
import path from "path";
import matter from "gray-matter";

const BASE_URL = "https://jinwonmin.github.io";
const SITE_TITLE = "minsnote";
const SITE_DESCRIPTION = "이모저모 주저리주저리 ~~";
const postsDir = path.join(process.cwd(), "posts");
const outDir = path.join(process.cwd(), "out");

const files = fs.readdirSync(postsDir).filter((f) => f.endsWith(".md"));

const posts = files
  .map((file) => {
    const content = fs.readFileSync(path.join(postsDir, file), "utf8");
    const { data } = matter(content);
    return {
      slug: file.replace(/\.md$/, ""),
      title: data.title,
      date: new Date(data.date).toUTCString(),
      description: data.description || "",
    };
  })
  .sort((a, b) => new Date(b.date) - new Date(a.date));

const items = posts
  .map(
    (p) => `    <item>
      <title><![CDATA[${p.title}]]></title>
      <link>${BASE_URL}/posts/${p.slug}</link>
      <guid>${BASE_URL}/posts/${p.slug}</guid>
      <pubDate>${p.date}</pubDate>
      <description><![CDATA[${p.description}]]></description>
    </item>`
  )
  .join("\n");

const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${SITE_TITLE}</title>
    <link>${BASE_URL}</link>
    <description>${SITE_DESCRIPTION}</description>
    <language>ko</language>
    <lastBuildDate>${posts[0]?.date || new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${BASE_URL}/rss.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

fs.writeFileSync(path.join(outDir, "rss.xml"), rss);
console.log(`RSS generated: ${posts.length} items`);
