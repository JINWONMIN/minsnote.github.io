---
title: "Part 6: Adding i18n to a Static Blog"
date: 2026-04-04
description: How I added Korean/English multilingual support to a Next.js static blog without middleware, and the pitfalls along the way
tags:
  - Next.js
  - i18n
  - SEO
series: Blog Dev Story
seriesOrder: 6
---

## I Wanted to Write in English Too

After publishing a few posts, writing only in Korean started to feel like a missed opportunity. The English-speaking audience for tech blogs is significantly larger. If I could expose the same content in English, that would be a clear win.

The problem was that this blog is a **static site**. It builds with `output: "export"` and deploys to GitHub Pages, which means no server-side middleware. Libraries like `next-intl` and `next-i18next` mostly assume middleware-based routing, making them incompatible with static sites.

So I built it myself.

***

## Comparing Options

| Approach | Pros | Cons | Fit |
| --- | --- | --- | --- |
| next-intl / next-i18next | Rich ecosystem, middleware routing | No `output: "export"` support | ✗ |
| `[locale]` dynamic segment + custom dictionary | No middleware needed, full control | Manual implementation | ✓ |
| Subdomains (ko.blog.com / en.blog.com) | Clean URLs | Complex DNS/infra setup | ✗ |

I went with the `[locale]` dynamic segment approach. It's fully compatible with GitHub Pages static deployment, and I get complete control without any library dependencies.

***

## Implementation

### Routing Structure

I inserted a `[locale]` segment into the existing routing:

```plain
Before:
src/app/posts/[slug]/page.tsx
src/app/tags/page.tsx

After:
src/app/[locale]/posts/[slug]/page.tsx
src/app/[locale]/tags/[tag]/page.tsx
src/app/[locale]/page.tsx
```

The root `/` redirects to the default language `/ko`:

```typescript
// src/app/page.tsx
import { redirect } from "next/navigation";
import { defaultLocale } from "@/lib/i18n";

export default function RootPage() {
  redirect(`/${defaultLocale}`);
}
```

`generateStaticParams` produces pages for every `locale × slug` combination. With 8 Korean and 8 English posts, that's 16 post pages at build time.

***

### Translation System

UI strings live in JSON dictionaries:

```typescript
// src/lib/i18n.ts
import ko from "@/locales/ko.json";
import en from "@/locales/en.json";
import termMap from "@/locales/term-map.json";

const dictionaries = { ko, en } as const;

export type Locale = "ko" | "en";
export const locales: Locale[] = ["ko", "en"];
export const defaultLocale: Locale = "ko";

export function getDictionary(locale: Locale) {
  return dictionaries[locale] ?? dictionaries[defaultLocale];
}
```

The dictionaries cover everything — navigation, filters, comments, search. `ko.json` and `en.json` share the same key structure, and components access them like `dict.comments.title`.

Tags and series names use a separate **term-map**. More on that later.

***

### Post Separation

```plain
posts/
├── ko/
│   ├── tech-stack.md
│   ├── cloudflare-workers-api.md
│   └── ...
└── en/
    ├── tech-stack.md
    ├── cloudflare-workers-api.md
    └── ...
```

Same slug = same post. Every function in `posts.ts` takes a `locale` parameter to specify which language to read:

```typescript
export function getAllPostMetas(locale: Locale = defaultLocale): PostMeta[] {
  const postsDirectory = path.join(process.cwd(), "posts", locale);
  // ...
}
```

***

### Automated Tag Mapping

The Korean tag `모니터링` maps to `Monitoring` in English. The question was how to manage these mappings.

My first attempt was hardcoding:

```typescript
// First try: manual mapping
const tagMap = {
  "모니터링": "Monitoring",
  "서버리스": "Serverless",
  "보안": "Security",
  // ... add here every time a new tag appears?
};
```

This was fine with three tags. But as posts grow? Every new tag requires a manual update to the mapping file. Forget once and language switching breaks with a 404. Zero scalability.

I wrote a build-time script to auto-generate the mapping:

```javascript
// scripts/generate-term-map.mjs
for (const file of koFiles) {
  const koData = matter(fs.readFileSync(path.join(koDir, file), "utf8")).data;
  const enData = matter(fs.readFileSync(path.join(enDir, file), "utf8")).data;

  // Map tags by position
  const koTags = koData.tags || [];
  const enTags = enData.tags || [];
  for (let i = 0; i < Math.min(koTags.length, enTags.length); i++) {
    if (koTags[i] !== enTags[i]) {
      koToEn[koTags[i]] = enTags[i];
      enToKo[enTags[i]] = koTags[i];
    }
  }
}
```

It opens the ko/en posts with matching slugs and maps tags **by position** in the frontmatter. The first Korean tag corresponds to the first English tag. Series names follow the same logic.

The build pipeline became:

```plain
generate-term-map → next build → generate-sitemap → generate-rss
```

The term-map has to be generated first so the build can reference translation data.

***

### Language Switch Button

I added an EN/KO toggle button to the Header. I thought it would just be a URL locale swap, but there was more to it than expected.

Switching language on a tag detail page:
- `/ko/tags/모니터링` → `/en/tags/Monitoring`

The tag name has to be translated in the URL. Same for home page tag filters:
- `/ko?tag=옵저버빌리티` → `/en?tag=Observability`

URL parameters need translation too. The `translateTerm` function handles this:

```typescript
export function translateTerm(term: string, from: Locale, to: Locale): string {
  if (from === to) return term;
  if (from === "ko") return koToEn[term] ?? term;
  return enToKo[term] ?? term;
}
```

Tags that are identical in both languages (like `Next.js` or `API`) pass through unchanged.

***

### SEO

For a multilingual site, you need to tell search engines "this page has a Korean version, and the English version is over here."

Three things to handle:

| Item | Implementation |
| --- | --- |
| hreflang meta tags | `<link rel="alternate" hreflang="ko" href="...">` |
| sitemap | `<xhtml:link>` cross-references |
| RSS | `/ko/rss.xml`, `/en/rss.xml` generated separately |

In the sitemap, every URL includes cross-references to both language versions:

```xml
<url>
  <loc>https://jinwonmin.github.io/ko/posts/tech-stack</loc>
  <xhtml:link rel="alternate" hreflang="ko"
    href="https://jinwonmin.github.io/ko/posts/tech-stack"/>
  <xhtml:link rel="alternate" hreflang="en"
    href="https://jinwonmin.github.io/en/posts/tech-stack"/>
</url>
```

This tells search engines to treat the two versions as the same content in different languages, not as separate pages.

***

## Pitfalls

### Pitfall 1: useSearchParams() Suspense Error

I used `useSearchParams()` to sync filter state with URL parameters, and the `output: "export"` build immediately threw a "should be wrapped in a suspense boundary" error.

In a static build, URL parameters are unknowable at server time, so the component needed a `<Suspense>` wrapper:

```typescript
// src/app/[locale]/layout.tsx
<Suspense>
  <Header locale={locale as Locale} />
</Suspense>
```

***

### Pitfall 2: Tag Page 404 on Language Switch

Clicking EN on `/ko/tags/모니터링` navigated to `/en/tags/모니터링`. Naturally, 404 — there's no tag called "모니터링" in English.

I updated `switchLocalePath` to translate tag names via `translateTerm` before building the URL.

***

### Pitfall 3: Filter State Lost on Switch

Selecting a tag on the home page and switching to EN → `/en?tag=옵저버빌리티` → 0 results.

Tag parameters needed translation too. I added `translateTerm` conversion for both `tag` and `series` URL parameters during language switching.

***

### Pitfall 4: gray-matter Date Object

Writing `date: 2026-04-04` in frontmatter causes gray-matter to auto-convert it to a Date object. With timezone differences between server (Node.js) and client (browser), the `dateTime` attribute didn't match, causing hydration mismatches.

I forced conversion to ISO strings in `posts.ts`:

```typescript
const date = data.date instanceof Date
  ? data.date.toISOString().split("T")[0]
  : String(data.date);
```

***

### Pitfall 5: Mobile Scroll Restoration

Scroll position reset to the top on language switch. I first tried using Next.js `Link` with `scroll={false}`, but switching `[locale]` segments is effectively navigating to a different page — the layout remounts and scroll resets.

The solution was `button` + `window.location.href` for full page navigation, saving scroll position to `sessionStorage` just before the switch and restoring it on the target page:

```typescript
// Header — save before switch
sessionStorage.setItem("__locale_scroll", String(window.scrollY));
window.location.href = target;

// ScrollRestore — restore after load
const saved = sessionStorage.getItem("__locale_scroll");
window.addEventListener("load", () => window.scrollTo(0, y), { once: true });
```

Waiting for the `load` event is necessary because scroll position can only be accurately restored after images and layout are fully loaded.

***

## Summary

| Aspect | Details |
| --- | --- |
| Routing | `[locale]` dynamic segment (no middleware) |
| Translation | JSON dictionaries + auto-generated term-map |
| Posts | `posts/ko/`, `posts/en/` with matching slugs |
| Language switch | URL parameter translation + scroll position restore |
| SEO | hreflang cross-references, separate RSS feeds |
| Build pipeline | term-map → next build → sitemap → RSS |

Adding i18n to a static site without middleware came down to two questions: "how to split the routing" and "where to manage translation data." Building it from scratch without a library actually made the structure simpler. The pitfalls, on the other hand, were mostly the "something doesn't carry over during language switch" variety. URLs, tag names, scroll positions, date timezones — things that needed translating were hiding in more places than expected.
