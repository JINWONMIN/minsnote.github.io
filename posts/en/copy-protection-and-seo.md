---
title: "Part 7: Copy Protection and SEO in One Shot"
date: 2026-04-05
description: How I blocked content copying while keeping code blocks copyable, and layered SEO structured data on top
tags:
  - SEO
  - Security
series: Blog Dev Story
seriesOrder: 7
---

## My Content Was Wide Open

As posts started piling up, something began to bother me. Drag-selecting the body text grabbed everything, and a single Ctrl+C copied the entire article. Code blocks obviously need to stay copyable — it's a tech blog — but leaving the prose completely unprotected felt careless.

SEO needed attention at the same time. In [Part 6: Adding i18n to a Static Blog](/en/posts/i18n-static-blog), I covered `hreflang` and sitemap cross-references, but per-post structured data (JSON-LD) and Open Graph metadata were still missing. I tackled copy protection and SEO together.

***

## Do Copy Protection and SEO Conflict?

The first question that came up: **would blocking text copying hurt search engine crawling?**

Short answer — no.

| Protection Method | How It Works | Crawler Impact |
| --- | --- | --- |
| CSS `user-select: none` | Blocks text selection at the browser rendering layer | None (crawlers don't render CSS) |
| JS `copy` event interception | Prevents clipboard events with `preventDefault()` | None (crawlers don't execute JS events) |
| `robots.txt` / `meta robots` | Controls crawler access directly | Direct impact |

CSS and JS copy protection only affects human browsers. Googlebot, Yeti (Naver's crawler) — they parse the HTML source. Whether CSS disables selection or JS blocks copying is irrelevant to them. This means layering copy protection with SEO metadata gives both content protection and search visibility. That's why tackling them together made sense.

***

## Copy Protection Implementation

I applied copy protection in **two layers**: CSS and JavaScript.

### CSS: Blocking Selection with user-select

```css
/* src/app/globals.css */
.prose {
  -webkit-user-select: none;
  user-select: none;
}

.prose pre,
.prose code {
  -webkit-user-select: text;
  user-select: text;
}
```

`user-select: none` on the entire `.prose` container, then explicitly re-enabling `text` on `pre` and `code` tags. The `-webkit-` prefix covers Safari. Body text becomes undraggable while code blocks remain freely selectable.

### JS: Intercepting the Copy Event

CSS alone is not enough. Anyone can flip `user-select` back on in DevTools. So I intercepted the `copy` event in JavaScript as well.

```typescript
// src/components/CopyProtection.tsx
function isInsideCodeBlock(node: Node | null): boolean {
  while (node) {
    if (node instanceof HTMLElement) {
      const tag = node.tagName.toLowerCase();
      if (tag === "pre" || tag === "code") return true;
    }
    node = node.parentNode;
  }
  return false;
}

function handleCopy(e: ClipboardEvent) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);
  if (
    isInsideCodeBlock(range.startContainer) &&
    isInsideCodeBlock(range.endContainer)
  ) {
    return; // Allow copy inside code blocks
  }

  e.preventDefault(); // Block everything else
}
```

The key is `isInsideCodeBlock`. If both the start and end of the selection fall inside a `<pre>` or `<code>` element, the copy goes through. Otherwise, `preventDefault()` kills it. The logic just walks up the DOM tree via `parentNode` — straightforward.

### Code Block Copy Button

Since code blocks allow copying, I added a **copy button** for convenience.

```typescript
// src/components/CodeCopyButton.tsx (excerpt)
const preBlocks = document.querySelectorAll(".prose pre");

preBlocks.forEach((pre) => {
  if (pre.querySelector(".code-copy-btn")) return; // Prevent duplicates

  const btn = document.createElement("button");
  btn.className = "code-copy-btn";

  btn.addEventListener("click", async () => {
    const code = pre.querySelector("code");
    const text = code?.textContent || pre.textContent || "";
    await navigator.clipboard.writeText(text);
    // Swap to check icon for 2 seconds as feedback
  });

  (pre as HTMLElement).appendChild(btn);
});
```

It iterates over every `.prose pre`, dynamically creating a copy button. `navigator.clipboard.writeText()` handles the clipboard write, and the icon swaps to a checkmark for two seconds as visual feedback.

The button stays hidden with `opacity: 0` and only appears on `pre:hover`:

```css
/* src/app/globals.css */
.code-copy-btn {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  opacity: 0;
  transition: opacity 0.15s, color 0.15s, background-color 0.15s;
}

pre:hover .code-copy-btn {
  opacity: 1;
}
```

***

## SEO Implementation

### Metadata Architecture

SEO metadata is structured in three layers.

| Layer | File | Role |
| --- | --- | --- |
| Root | `src/app/layout.tsx` | `metadataBase`, `title.template`, Naver verification |
| Locale | `src/app/[locale]/layout.tsx` | Open Graph `locale`, RSS alternate, language cross-references |
| Post | `src/app/[locale]/posts/[slug]/page.tsx` | canonical URL, OG article, JSON-LD |

The root layout sets defaults, the locale layout overrides with language-specific settings, and the post page applies final per-post metadata.

### Root: metadataBase and Title Template

```typescript
// src/app/layout.tsx
export const metadata: Metadata = {
  metadataBase: new URL("https://jinwonmin.github.io"),
  title: {
    default: "minsnote",
    template: "%s | minsnote",
  },
  verification: {
    other: {
      "naver-site-verification": "691c49a5a029a53d09a4859edfade82b82b741f8",
    },
  },
};
```

Setting `metadataBase` means child pages can specify Open Graph URLs as relative paths and they'll automatically resolve to absolute URLs. The `%s` in `title.template` gets replaced with each page's `title`.

### Locale: Open Graph and Alternates

```typescript
// src/app/[locale]/layout.tsx (generateMetadata excerpt)
return {
  description: dict.site.description,
  openGraph: {
    type: "website",
    siteName: "minsnote",
    locale: dict.site.locale, // ko_KR or en_US
  },
  alternates: {
    types: { "application/rss+xml": `/${locale}/rss.xml` },
    languages: { ko: "/ko", en: "/en" },
  },
};
```

`alternates.languages` sets up the ko/en cross-references — the same concept as the `hreflang` setup from Part 6.

### Post: Canonical URL and JSON-LD

```typescript
// src/app/[locale]/posts/[slug]/page.tsx (generateMetadata excerpt)
const url = `https://jinwonmin.github.io/${locale}/posts/${slug}`;
return {
  title: post.title,
  description: post.description,
  alternates: {
    canonical: url,
    languages: { ko: `/ko/posts/${slug}`, en: `/en/posts/${slug}` },
  },
  openGraph: {
    title: post.title,
    description: post.description,
    url,
    type: "article",
    publishedTime: new Date(post.date).toISOString(),
    tags: post.tags,
  },
};
```

Open Graph `type` is `"website"` at the locale layout level and `"article"` at the post level. `publishedTime` and `tags` are pulled directly from the post's frontmatter.

JSON-LD uses the `BlogPosting` schema:

```typescript
// src/app/[locale]/posts/[slug]/page.tsx
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: post.title,
  description: post.description,
  datePublished: new Date(post.date).toISOString(),
  author: { "@type": "Person", name: "minsnote" },
  url: `https://jinwonmin.github.io/${locale}/posts/${slug}`,
  keywords: post.tags.join(", "),
};
```

This gets injected into the page as a `<script type="application/ld+json">` tag. It provides the underlying data for rich snippets in Google search results.

### robots.txt

```plain
User-agent: *
Allow: /

User-agent: Yeti
Allow: /

Sitemap: https://jinwonmin.github.io/sitemap.xml
```

Full access for all crawlers, with Naver's Yeti explicitly listed. The Sitemap declaration lets crawlers discover the site structure.

***

## Pitfalls

### Pitfall 1: user-select: none Swallowed Code Blocks Too

The first attempt was just `user-select: none` on `.prose`. Code blocks sit inside `.prose`, so they got locked down too. A tech blog where code cannot be copied is pointless.

The fix was explicitly setting `user-select: text` on `.prose pre, .prose code`. CSS inheritance means `none` on the parent cascades to every child, so exceptions must be declared on the child selectors.

***

### Pitfall 2: Copy Button Invisible in Dark Mode

I hardcoded the `CodeCopyButton` icon color to `color: #6b7280` (gray-500). In light mode the contrast against the white-ish background was fine, but in dark mode the code block background (`#1e1e2e`) was close enough to the icon color that the button effectively disappeared.

I split the hover colors for light and dark:

```css
/* src/app/globals.css */
.code-copy-btn:hover {
  color: #111827;
  background-color: #e5e7eb;
}

.dark .code-copy-btn:hover {
  color: #f9fafb;
  background-color: #374151;
}
```

Since the button is `opacity: 0` by default and only appears on hover, splitting just the hover state was sufficient.

***

### Pitfall 3: JSON-LD datePublished Format

Converting `post.date` with `new Date(post.date).toISOString()` ran into the same gray-matter Date object issue from Part 6. gray-matter auto-converts the frontmatter `date` field into a Date object, and timezone differences can shift the date by a day.

This was already solved. The ISO string normalization logic I added to `posts.ts` in Part 6 meant `post.date` was already a string by the time JSON-LD touched it. Wrapping an already-normalized string in `new Date()` caused no issues. A case where Part 6's pitfall saved Part 7 the trouble.

***

## Summary

| Item | Approach |
| --- | --- |
| Body copy protection | CSS `user-select: none` + JS `copy` event interception |
| Code block exception | `user-select: text` on `pre`/`code` + DOM tree check |
| Code copy button | `navigator.clipboard.writeText()` + visual feedback |
| SEO metadata | Three layers (root, locale, post) |
| JSON-LD | `BlogPosting` schema |
| robots.txt | Full allow + explicit Yeti entry + sitemap declaration |

Copy protection and SEO look like conflicting requirements on the surface, but they operate at different layers. CSS/JS runs in the browser; crawlers only see the HTML source. Understanding that distinction makes applying both at once straightforward.
