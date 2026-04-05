---
title: "Part 4: Custom Domain and Korean URL Issues"
date: 2026-04-04
description: Switching from GitHub Pages sub-path deployment to root domain, and fixing 404 errors on Korean tag pages
tags:
  - GitHub Pages
  - Next.js
  - SEO
series: Blog Dev Story
seriesOrder: 4
---

## The Rise and Fall of basePath

In [Part 1: Blog Tech Stack](/en/posts/tech-stack), I wrote about fixing the GitHub Pages sub-path deployment issue with `basePath` and `assetPrefix`. Since the repo name was `minsnote.github.io`, the site URL ended up as `https://jinwonmin.github.io/minsnote.github.io/`, which messed up asset paths.

But that wasn't a fundamental fix. Setting `basePath` means every internal link gets the sub-path appended, sitemap URLs get messed up, and CMS configuration gets complicated. One sub-path was causing headaches everywhere.

***

## Switching to Root Domain Deployment

The solution was surprisingly simple. Just rename the repo to `JINWONMIN.github.io` on GitHub. GitHub Pages serves repos named `{username}.github.io` directly from the root domain.

After renaming, there were quite a few things to clean up:

| File | Changes |
| --- | --- |
| `next.config.ts` | Removed `basePath`, `assetPrefix` |
| `public/admin/config.yml` | Updated CMS repo path to new name |
| `public/robots.txt` | Removed sub-path from sitemap URL |
| `scripts/generate-sitemap.mjs` | Removed sub-path from `BASE_URL` |
| `src/app/layout.tsx` | Removed sub-path from `metadataBase` URL |

`next.config.ts` became this clean:

```typescript
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
};
```

Adding one `basePath` line led to modifying five places. If I'd named the repo `{username}.github.io` from the start, this whole ordeal wouldn't have happened.

***

## Korean Tag 404 Problem

After cleaning up the domain, I discovered that Korean tag pages were returning **404**. English tags (`/tags/Next.js`) worked fine, but Korean tags (`/tags/블로그`) didn't.

### Cause

`generateStaticParams` was encoding tags with `encodeURIComponent`:

```typescript
// Before
return Array.from(tags).map((tag) => ({
  tag: encodeURIComponent(tag),
}));
```

This generates filenames like `%EB%B8%94%EB%A1%9C%EA%B7%B8.html` with percent-encoding at build time. The problem is that GitHub Pages **decodes the request URL** when looking up files. When the browser requests `/tags/%EB%B8%94%EB%A1%9C%EA%B7%B8`, GitHub Pages looks for the `블로그` directory, but the actual filename is `%EB%B8%94...`, so it naturally can't find it.

### Fix

I removed the encoding from `generateStaticParams`:

```typescript
// After
return Array.from(tags).map((tag) => ({ tag }));
```

This generates a `블로그/` directory with Korean characters as-is at build time, matching GitHub Pages' decoding behavior.

However, I kept `decodeURIComponent` on the runtime side where URL parameters are received. Browsers sometimes auto-encode Korean characters in the address bar:

```typescript
export default async function TagPage({ params }: Props) {
  const { tag } = await params;
  const decodedTag = decodeURIComponent(tag);
  // Filter posts with decodedTag
}
```

**Don't encode at build time, only decode at runtime.** This asymmetry is the key.

***

## Mobile Responsive Fixes

While fixing the domain and URL issues, I also fixed **horizontal scrolling** on mobile. There were two causes.

### 1. Long Words Pushing the Layout

Long strings like URLs or code were exceeding the container width. I added `word-break` and `overflow-wrap` to the CSS:

```css
.prose {
  word-break: break-word;
  overflow-wrap: break-word;
}
```

### 2. Code Block Padding Too Large on Mobile

Desktop-sized padding was being applied on mobile too. I split it into responsive styles:

```css
.prose pre {
  padding: 0.75rem;       /* mobile */
}

@media (min-width: 640px) {
  .prose pre {
    padding: 1.25rem;     /* desktop */
  }
}
```

I also changed the layout to progressively increase padding and font size in 3 stages (`base -> sm -> lg`).

***

## Summary

| Problem | Cause | Solution |
| --- | --- | --- |
| Sub-path deployment complexity | Repo named `minsnote.github.io` served from sub-path | Renamed repo to `JINWONMIN.github.io`, removed `basePath` |
| Korean tag 404 | `encodeURIComponent` used in `generateStaticParams` | Removed encoding, generate Korean directories as-is |
| Mobile horizontal scroll | Long words + excessive code block padding | Added `word-break`, split padding into responsive |

GitHub Pages is convenient, but it had unexpected behaviors with sub-path deployment and Korean URL handling. The Korean tag issue in particular is the kind of bug that's hard to diagnose if you don't know that "the build-time filename" and "the server's URL decoding behavior" need to match.
