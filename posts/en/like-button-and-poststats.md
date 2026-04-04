---
title: "Part 5: Like Button and PostStats Integration"
date: 2026-04-04
description: Building a like API, integrating it with view counts, and optimizing API calls along the way
tags:
  - Cloudflare Workers
  - React
  - API
series: Blog Dev Story
seriesOrder: 5
---

## View Counts Alone Weren't Enough

In [Part 2: Building a Blog API with Cloudflare Workers](/posts/cloudflare-workers-api), I set up view count and comment APIs. View counts were in place, but something felt missing. There was no way for readers to say "hey, that was pretty good." Not everyone wants to write a comment, but having a lightweight way to react seemed necessary.

So I decided to add a like button.

***

## API Design: Is KV Enough?

I had to figure out where to store like data. In [Part 2: Building a Blog API with Cloudflare Workers](/posts/cloudflare-workers-api), I'd already set up a structure where views go to KV and comments go to D1.

| Storage | Good For | Good for Likes? |
| --- | --- | --- |
| D1 (SQLite) | Relational data, complex queries | Overkill |
| KV | Simple key-value, fast reads | Perfect fit |

For likes, all you really need to know is two things: "**how many likes does this post have**" and "**did this IP already like it**." No need to create a D1 table for that. Just like view counts, KV was the way to go.

### KV Key Design

```plain
likes:{slug}              → total like count (e.g., "5")
liked:{slug}:{ipHash}     → like status (exists = already liked)
```

Same pattern as `views:{slug}` for view counts. By using key prefixes to distinguish purposes, you can manage both views and likes in a single KV namespace.

***

## Implementing the Toggle

I wanted likes to be cancellable too. Press once to like, press again to unlike. A toggle.

```typescript
async function toggleLike(slug: string, ipHash: string, env: Env) {
  const likedKey = `liked:${slug}:${ipHash}`;
  const likesKey = `likes:${slug}`;

  const already = await env.VIEWS.get(likedKey);
  const current = parseInt((await env.VIEWS.get(likesKey)) || "0");

  if (already) {
    // Unlike
    await env.VIEWS.delete(likedKey);
    await env.VIEWS.put(likesKey, Math.max(0, current - 1).toString());
    return { likes: Math.max(0, current - 1), liked: false };
  } else {
    // Like
    await env.VIEWS.put(likedKey, "1");
    await env.VIEWS.put(likesKey, (current + 1).toString());
    return { likes: current + 1, liked: true };
  }
}
```

`Math.max(0, current - 1)` is a safety net to prevent negative values. Under normal circumstances it would never go negative, but with KV's eventual consistency, timing issues can arise from concurrent requests.

Unlike view counts, I didn't set a TTL here. Likes should be **permanent**, not "once a day."

***

## Frontend: LikeButton Component

Initially, I built a standalone `LikeButton` component:

```typescript
// src/components/LikeButton.tsx
"use client";
export default function LikeButton({ slug }: { slug: string }) {
  const [likes, setLikes] = useState(0);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    getLikes(slug).then((data) => {
      setLikes(data.likes);
      setLiked(data.liked);
    });
  }, [slug]);

  async function handleClick() {
    const data = await toggleLike(slug);
    setLikes(data.likes);
    setLiked(data.liked);
  }
  // ...
}
```

The icon color changes based on like status, and clicking triggers a `scale-125` animation for 0.3 seconds. A small detail, but people are more likely to click when there's a satisfying feel to it.

Everything worked fine up to this point. The problem came next.

***

## Problem: Too Many API Calls

Opening a post page was triggering these API calls:

1. `POST /api/views` — increment view count
2. `GET /api/likes` — fetch like count + like status

That's two calls. It's just two for now, but as features grow, it could become three, four, or more. That's the limitation of having each independent component call its own API.

***

## Solution: PostStats Unified Endpoint

I created a **unified endpoint** on the API side. It handles both view count increment and like status retrieval in a single call:

```typescript
// POST /api/post-stats
if (url.pathname === "/api/post-stats" && request.method === "POST") {
  const [views, likes, liked] = await Promise.all([
    incrementViews(body.slug, ipHash, env),
    getLikes(body.slug, env),
    checkLiked(body.slug, ipHash, env),
  ]);
  return jsonResponse({ views, likes, liked }, 200, origin, allowed);
}
```

`Promise.all` runs all three operations **in parallel**. Running them sequentially would stack the latency of 3 KV calls, but in parallel, you only pay for the slowest one.

On the frontend, I merged `ViewCounter` and `LikeButton` into a single `PostStats` component:

```typescript
// src/components/PostStats.tsx
"use client";
export default function PostStats({ slug }: { slug: string }) {
  const [stats, setStats] = useState<{
    views: number; likes: number; liked: boolean;
  } | null>(null);

  useEffect(() => {
    getPostStats(slug).then(setStats);
  }, [slug]);

  // Renders view count (eye icon) + likes (thumbs up icon) together
}
```

API calls went from 2 down to 1. Components went from 2 down to 1.

***

## Summary

| Aspect | Before | After |
| --- | --- | --- |
| API calls | `/api/views` + `/api/likes` (2 calls) | `/api/post-stats` (1 call) |
| Components | `ViewCounter` + `LikeButton` (2) | `PostStats` (1) |
| KV processing | Sequential | `Promise.all` parallel |

The like feature itself was simple. Just add two keys to KV and implement toggle logic. What actually took more time was figuring out "how to reduce API calls." As features grow, the value of a unified endpoint becomes more and more apparent.
