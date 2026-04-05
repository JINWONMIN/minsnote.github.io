# minsnote

Personal tech blog built with Next.js and deployed on GitHub Pages.

https://jinwonmin.github.io

## Features

**Core**
- Markdown-based blog with tag filtering and series navigation
- i18n support (ko / en) with locale-prefixed routes
- Post views, likes, visitor counter (Cloudflare Workers API)
- Comments with password-based edit/delete and threaded replies
- Reserved nickname blocking with admin token authentication
- Browser-based writing via Sveltia CMS

**UX**
- Dark / Light mode toggle
- Post search with Cmd+K shortcut and keyword highlight
- Reading progress bar
- Scroll to top button and infinite scroll
- Image lightbox with lazy loading
- Related posts recommendation (tag similarity)
- Series navigation with floating arrows
- Mermaid diagram rendering
- Custom 404 page

**SEO & Security**
- Sitemap with hreflang, RSS feed, robots.txt
- Canonical URL, JSON-LD structured data (BlogPosting schema)
- OpenGraph + Twitter card meta tags
- Text copy protection (code blocks excluded)
- API key authentication

## Tech Stack

| Category | Technology |
| --- | --- |
| Framework | Next.js (App Router, Static Export) |
| Language | TypeScript |
| Styling | Tailwind CSS + @tailwindcss/typography |
| Markdown | remark + remark-gfm + rehype-highlight |
| Diagrams | Mermaid |
| CMS | Sveltia CMS |
| API | Cloudflare Workers + KV + D1 ([minsnote-api](https://github.com/JINWONMIN/minsnote-api)) |
| Hosting | GitHub Pages |
| CI/CD | GitHub Actions |

## Getting Started

```bash
npm install
npm run dev
```

http://localhost:3000

### Environment Variables

See `.env.example`:

```
NEXT_PUBLIC_API_KEY=your_api_key_here
```

### Build

```bash
npm run build
```

Generates static HTML, sitemap.xml, and rss.xml.

## Project Structure

```
├── src/
│   ├── app/              # Next.js App Router
│   │   └── [locale]/     # Locale-based routing (ko, en)
│   ├── components/       # UI components
│   ├── lib/              # Markdown parsing, API client, i18n
│   └── locales/          # Translation files (ko.json, en.json)
├── posts/
│   ├── ko/               # Korean posts
│   └── en/               # English posts
├── public/               # Static files (CMS, search engine verification)
├── scripts/              # Sitemap, RSS generation
└── .github/workflows/    # GitHub Actions deploy
```
