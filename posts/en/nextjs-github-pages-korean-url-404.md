---
title: "Why Korean URLs Return 404 on Next.js + GitHub Pages"
date: 2026-04-05
description: "When generateStaticParams encodes and GitHub Pages decodes, non-ASCII pages vanish"
tags:
  - Next.js
  - GitHub Pages
  - Troubleshooting
---

## Deployed to a Blank Page

The first time I deployed my blog to GitHub Pages, I opened the site and got a white screen. The HTML was there, but no CSS, no JS. Every asset request returned 404.

My repo was named `minsnote.github.io`. My GitHub username is `JINWONMIN`. GitHub Pages only serves a repo at the root domain if the repo name matches `{username}.github.io` exactly. Everything else goes under a subpath. So my site ended up at `https://jinwonmin.github.io/minsnote.github.io/`, and Next.js was looking for assets at `/` while the actual serving path was `/minsnote.github.io/`.

## The basePath Band-Aid

A quick search suggested adding `basePath` and `assetPrefix`:

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  output: "export",
  basePath: "/minsnote.github.io",
  assetPrefix: "/minsnote.github.io/",
};
```

Assets loaded. The page rendered. I thought it was fixed.

It wasn't. The moment you set `basePath`, every internal link gets that prefix. Sitemap URLs break. CMS paths break. Local development requires navigating to `localhost:3000/minsnote.github.io/`, which is just absurd. One line of config, five files to patch.

## Just Rename the Repo

The actual fix was renaming the repo from `minsnote.github.io` to `JINWONMIN.github.io`. GitHub Pages serves `{username}.github.io` repos directly at the root.

```typescript
// next.config.ts — after removing basePath
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
};
```

Remove `basePath`, remove `assetPrefix`, revert sitemap paths, revert CMS config, revert `metadataBase`. All five files I'd patched, undone. Should have done this from the start.

(This is covered in more detail in [Part 1: Tech Stack](/en/posts/tech-stack) and [Part 4: Domain and Korean URL Issues](/en/posts/domain-and-korean-url).)

## Then Came the Korean Tag 404s

After sorting out the domain, I clicked through the tag pages. `/tags/Next.js` worked. `/tags/GitHub Pages` worked. `/tags/블로그` returned 404.

Every English tag was fine. Only Korean tags were broken.

## Digging Into the Build Output

I opened the `out/` directory. English tags produced clean filenames like `out/tags/Next.js/index.html`. Korean tags looked like this: `out/tags/%EB%B8%94%EB%A1%9C%EA%B7%B8/index.html`. Percent-encoded filenames.

The culprit was in `generateStaticParams`:

```typescript
// Before
return Array.from(tags).map((tag) => ({
  tag: encodeURIComponent(tag),
}));
```

Encoding Korean tags for URLs seemed perfectly reasonable. It was also the entire problem.

## How GitHub Pages Resolves URLs

When the browser requests `/tags/%EB%B8%94%EB%A1%9C%EA%B7%B8`, GitHub Pages **decodes** the URL before looking up the file. It transforms `%EB%B8%94%EB%A1%9C%EA%B7%B8` back to `블로그` and looks for `블로그/index.html`.

But the actual filename on disk is `%EB%B8%94%EB%A1%9C%EA%B7%B8/index.html`. One side decodes, the other stays encoded. They never match.

Here's the full picture:

| Step | English tag (`Next.js`) | Korean tag (`블로그`) |
|------|------------------------|----------------------|
| `generateStaticParams` return value | `Next.js` | `%EB%B8%94%EB%A1%9C%EA%B7%B8` |
| Build filename | `Next.js/index.html` | `%EB%B8%94%EB%A1%9C%EA%B7%B8/index.html` |
| Browser request URL | `/tags/Next.js` | `/tags/%EB%B8%94%EB%A1%9C%EA%B7%B8` |
| GitHub Pages looks for | `Next.js/index.html` | `블로그/index.html` |
| Result | 200 | 404 |

English tags don't change when encoded, so the mismatch never surfaces. Korean tags expose the gap immediately.

## Remove the Encoding

The fix was removing `encodeURIComponent` from `generateStaticParams`:

```typescript
// After
return Array.from(tags).map((tag) => ({ tag }));
```

Now the build produces `블로그/index.html` with the Korean characters intact. When GitHub Pages decodes the URL to `블로그`, the filename matches.

The runtime side still needs `decodeURIComponent`, though. Browsers sometimes auto-encode Korean characters in the URL bar:

```typescript
export default async function TagPage({ params }: Props) {
  const { tag } = await params;
  const decodedTag = decodeURIComponent(tag);
  // filter posts by decodedTag
}
```

**Don't encode at build time. Only decode at runtime.** That asymmetry is the key insight.

## What I Took Away

The instinct to encode non-ASCII characters in URLs is usually correct, but in static site generation it backfires. The build output's filenames have to match how the hosting platform resolves URLs. That's not something you think about until you've stared at a 404 long enough.

The `basePath` detour was a similar lesson. Before reaching for a framework-level workaround, check whether the root cause can simply be removed. Renaming one repo would have saved an afternoon.

Both issues boil down to the same thing: if you don't know what the framework and the platform are doing under the hood, you'll spend hours on something that turns out to be obvious in hindsight. That's just how it goes.
