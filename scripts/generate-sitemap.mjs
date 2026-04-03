import fs from "fs";
import path from "path";
import matter from "gray-matter";

const BASE_URL = "https://jinwonmin.github.io";
const postsDir = path.join(process.cwd(), "posts");
const outDir = path.join(process.cwd(), "out");

const files = fs.readdirSync(postsDir).filter((f) => f.endsWith(".md"));

const posts = files.map((file) => {
  const content = fs.readFileSync(path.join(postsDir, file), "utf8");
  const { data } = matter(content);
  return {
    slug: file.replace(/\.md$/, ""),
    date: new Date(data.date).toISOString().split("T")[0],
    tags: data.tags || [],
  };
});

const tags = new Set();
posts.forEach((p) => p.tags.forEach((t) => tags.add(t)));

const today = new Date().toISOString().split("T")[0];

const urls = [
  `<url><loc>${BASE_URL}</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>`,
  `<url><loc>${BASE_URL}/about</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>`,
  `<url><loc>${BASE_URL}/tags</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>`,
  ...posts.map(
    (p) =>
      `<url><loc>${BASE_URL}/posts/${p.slug}</loc><lastmod>${p.date}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>`
  ),
  ...Array.from(tags).map(
    (tag) =>
      `<url><loc>${BASE_URL}/tags/${encodeURIComponent(tag)}</loc><changefreq>weekly</changefreq><priority>0.6</priority></url>`
  ),
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

fs.writeFileSync(path.join(outDir, "sitemap.xml"), sitemap);
console.log(`Sitemap generated: ${urls.length} URLs`);
