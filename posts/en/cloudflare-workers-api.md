---
title: "Part 2: Building a Blog API with Cloudflare Workers"
date: 2026-04-01
description: Why I chose Cloudflare Workers to add view counts, visitor counters, and comments to a static blog, and how I built it
tags:
  - Cloudflare Workers
  - API
  - Serverless
series: Blog Dev Story
seriesOrder: 2
---

> Source code: [GitHub](https://github.com/JINWONMIN/minsnote-api)

## The Limits of a Static Site

After building the blog to a decent state, something felt missing. I could publish posts, but there were no view counts, no idea how many visitors I had, and no way to leave comments. It's expected for a static site, but looking at the blog it just felt... empty.

So I decided to add these three things:

- Per-post view counts
- Today / total visitor counter
- Comments (including threaded replies)

The problem is, you need **a server to store data** for any of this.

***

## Why Cloudflare Workers

Just because I needed a server didn't mean I wanted to spin up an EC2 instance or rent a VPS. Managing a server just for a blog API felt like the tail wagging the dog.

I compared a few options:

| Approach | Pros | Cons |
| --- | --- | --- |
| AWS Lambda + DynamoDB | Familiar AWS ecosystem | Tedious setup, cold starts |
| Vercel Serverless | Great fit with Next.js | Can't use with static export |
| Supabase | PostgreSQL-based, free tier | One more external dependency |
| **Cloudflare Workers + KV + D1** | Already using Workers, free | Need to build it yourself |

The deciding factor was that **I was already using Cloudflare Workers** for CMS authentication. I already had an account, was familiar with the `wrangler` CLI, and deployment was a single command. Add KV (key-value store) and D1 (SQLite database) and I could build an API without any separate infrastructure.

The free tier is generous:

- Workers: 100K requests/day
- KV: 100K reads/day, 1,000 writes
- D1: 5GB storage, 5M row reads/day

For a personal blog, there's no way I'd hit the paid tier.

***

## Project Structure

I created the Workers project separately from the blog repo. The blog is a static site and Workers are serverless functions, so their lifecycles are different.

```plain
minsnote-api/
├── src/
│   └── index.ts        # All API logic
├── schema/
│   └── 001_init.sql    # D1 table creation SQL
├── wrangler.toml       # Workers config
└── tsconfig.json
```

KV and D1 bindings are configured in `wrangler.toml`:

```toml
name = "minsnote-api"
main = "src/index.ts"

[[kv_namespaces]]
binding = "VIEWS"
id = "..."

[[d1_databases]]
binding = "DB"
database_name = "minsnote-db"
database_id = "..."
```

Deployment is just `wrangler deploy`. No need to keep a local machine running -- it runs 24/7 on Cloudflare's edge servers.

***

## Data Storage Design

I split KV and D1 based on purpose.

**KV (Key-Value Store)** -- View counts, visitor counter, Rate Limit

KV lets you read and write simple key-value pairs quickly. It also supports TTL (expiration time), which is perfect for deduplication checks like "has this IP already visited today."

```typescript
// Increment view count (same IP only counted once per day)
const dedupeKey = `viewed:${slug}:${ipHash}:${today}`;
const already = await env.VIEWS.get(dedupeKey);
if (!already) {
  await env.VIEWS.put(`views:${slug}`, (current + 1).toString());
  await env.VIEWS.put(dedupeKey, "1", { expirationTtl: 86400 });
}
```

`expirationTtl: 86400` means auto-delete after 24 hours. Duplicate visits reset daily without any cleanup job.

**D1 (SQLite)** -- Comments

Comments are relational data, so I used D1. Nickname, content, timestamp, password hash, and `parent_id` for threads.

```sql
CREATE TABLE comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_slug TEXT NOT NULL,
  nickname TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  ip_hash TEXT NOT NULL,
  password_hash TEXT NOT NULL DEFAULT '',
  parent_id INTEGER DEFAULT NULL
);
```

***

## API Endpoints

All APIs are routed by URL pattern from a single Workers file (`index.ts`).

| Method | Path | Function |
| --- | --- | --- |
| POST | `/api/views` | Increment view count |
| GET | `/api/views?slug=xxx` | Get view count |
| POST | `/api/visitors` | Record visitor + return count |
| GET | `/api/visitors` | Get today/total count |
| GET | `/api/comments?slug=xxx` | Get comment list |
| POST | `/api/comments` | Create comment |
| PUT | `/api/comments` | Edit comment |
| DELETE | `/api/comments` | Delete comment |

I routed without any framework, just `if (url.pathname === "/api/views" && request.method === "POST")` style. With only 8 APIs, using a framework would be overkill.

***

## CORS Setup

Calling the Workers API from a static site obviously causes CORS issues. We're requesting from `https://jinwonmin.github.io` to `https://minsnote-api.xxx.workers.dev`.

```typescript
function corsHeaders(origin: string, allowed: string) {
  return {
    "Access-Control-Allow-Origin": isAllowedOrigin(origin, allowed) ? origin : "",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
  };
}
```

I put the production domain in the `ALLOWED_ORIGIN` environment variable and also allowed `localhost:3000` for local development. When I first tested locally, I kept getting CORS errors because Workers' `ALLOWED_ORIGIN` only allowed the production URL.

***

## Frontend Integration

On the blog side, you just need one API client.

```typescript
// src/lib/api.ts
const API_BASE = "https://minsnote-api.xxx.workers.dev";

export async function trackView(slug: string): Promise<number> {
  const res = await fetch(`${API_BASE}/api/views`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ slug }),
  });
  const data = await res.json();
  return data.views;
}
```

Since it's a static site, you can't call external APIs from server components. I made it a `"use client"` client component and call the API in `useEffect` on page load.

```typescript
// ViewCounter.tsx
"use client";
export default function ViewCounter({ slug }: { slug: string }) {
  const [views, setViews] = useState<number | null>(null);
  useEffect(() => {
    trackView(slug).then(setViews).catch(() => {});
  }, [slug]);

  if (views === null) return null;
  return <span>{views.toLocaleString()}</span>;
}
```

***

## Lessons Learned the Hard Way

### KV expirationTtl Minimum Value

I set the comment Rate Limit to 30 seconds and got a 500 error. There was no error message, just `error code: 1101`. I was stumped for a while until I added try-catch to Workers and finally found the cause.

```
Invalid expiration_ttl of 30. Expiration TTL must be at least 60.
```

KV's minimum TTL is **60 seconds**. It's probably documented somewhere, but since the error message doesn't surface outside of Workers, it was hard to diagnose. So I wrapped the entire Workers router in try-catch and changed it to respond with error messages in JSON.

### Running wrangler deploy from the Wrong Directory

I once ran `wrangler deploy` from the blog directory by mistake. Wrangler detected the Next.js project and tried to do an OpenNext build, adding all sorts of dependencies to `package.json`. I reverted with `git checkout`, but lesson learned: always run wrangler from the **Workers project directory**.

***

## Today Counter and Timezone

After deploying the visitor counter, I noticed the today count was resetting at a weird time. It wasn't resetting at midnight KST but at **9 AM**.

The cause was the `todayKey()` function:

```typescript
// Before — UTC-based
function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}
```

`toISOString()` returns **UTC time**. UTC midnight is 9 AM in Korea. So the today counter was resetting at 9 AM.

I changed it to KST (UTC+9):

```typescript
// After — KST-based
function todayKey(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
```

Add 9 hours (in milliseconds) to the UTC timestamp and extract the date. Cloudflare Workers don't have timezone settings, so you could use `Intl.DateTimeFormat`, but simple addition was the lightest and clearest approach.

***

## Summary

| Component | Role |
| --- | --- |
| Cloudflare Workers | API server (serverless) |
| KV | View counts, visitor counter, Rate Limit |
| D1 | Comment storage (SQLite) |
| `wrangler` CLI | Resource creation, deployment, DB migration |

Adding dynamic features to a static site is ultimately a question of "where do you store data?" The Cloudflare Workers + KV + D1 combo lets you build an API for free, without a separate server, in just a few hours -- more than enough for a personal blog.
