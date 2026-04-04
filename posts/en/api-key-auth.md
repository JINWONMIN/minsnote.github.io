---
title: "Part 3: Adding Auth to a Public API"
date: 2026-04-03
description: Adding X-API-Key header authentication to a Cloudflare Workers API, and injecting secrets into GitHub Actions builds
tags:
  - Cloudflare Workers
  - API
  - Security
series: Blog Dev Story
seriesOrder: 3
---

## Realizing the Problem

I was proudly admiring the blog API I'd just built, when a thought hit me. Anyone who knows this API URL could just call it with curl, right?

```bash
curl -X POST https://minsnote-api.xxx.workers.dev/api/comments \
  -H "Content-Type: application/json" \
  -d '{"slug":"tech-stack","nickname":"spam","content":"this is an ad"}'
```

CORS blocks it from browsers, but tools like curl and Postman ignore CORS entirely. Meaning, if someone knows the API URL, they could flood it with comment spam or manipulate view counts however they want.

It's a personal blog so it's not an urgent problem, but an open door should be closed.

***

## Choosing an Auth Method

There are several API authentication methods:

| Method | Complexity | Best For |
| --- | --- | --- |
| API Key (header) | Low | Server-to-server, trusted clients |
| OAuth 2.0 | High | When per-user auth is needed |
| JWT | Medium | Login session management |
| HMAC Signature | Medium | Request tampering prevention |

For a simple blog frontend -> Workers API call, OAuth or JWT is overkill. **Sending an API Key via a custom header** is the simplest and sufficient approach.

***

## Workers Implementation

### 1. Add API_KEY to Env

```typescript
export interface Env {
  VIEWS: KVNamespace;
  DB: D1Database;
  ALLOWED_ORIGIN: string;
  API_KEY: string;  // added
}
```

### 2. Allow X-API-Key in CORS Headers

To send an API Key via a custom header, you need to allow that header in the CORS preflight. Otherwise, the browser blocks it at the preflight stage.

```typescript
function corsHeaders(origin: string, allowed: string) {
  return {
    "Access-Control-Allow-Origin": isAllowedOrigin(origin, allowed) ? origin : "",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-API-Key",  // added
  };
}
```

### 3. Validate Before the Router

Let OPTIONS (preflight) pass through, and check the API Key for all other requests.

```typescript
if (request.method === "OPTIONS") {
  return new Response(null, { status: 204, headers: corsHeaders(origin, allowed) });
}

const apiKey = request.headers.get("X-API-Key") || "";
if (!env.API_KEY || apiKey !== env.API_KEY) {
  return jsonResponse({ error: "Unauthorized" }, 401, origin, allowed);
}
```

That's it. Just three changes.

***

## Generating and Registering the API Key

An API Key just needs to be a sufficiently long random string.

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
# → e2877cbd3e06fadc9b3c6c071c4f7b8cfa996c95...
```

Register this key as a **secret** in Workers. Don't write it directly in `wrangler.toml` -- that would expose the key in code. Always use secrets.

```bash
echo "generated-key" | wrangler secret put API_KEY
```

Secrets are stored encrypted on Cloudflare's servers and accessible via `env.API_KEY` in the Workers runtime. The key never appears in `wrangler.toml` or source code.

Verification after deployment:

```bash
# Without API Key → 401
curl -s https://minsnote-api.xxx.workers.dev/api/visitors
# {"error":"Unauthorized"}

# With API Key → 200
curl -s -H "X-API-Key: generated-key" https://minsnote-api.xxx.workers.dev/api/visitors
# {"today":1,"total":1}
```

***

## Injecting the API Key into the Frontend

Here's a dilemma I had. This blog is a static site built with `output: "export"`. Since client components call the API, the API Key is ultimately exposed to the browser. Doesn't that defeat the purpose?

You can't completely hide it, but it still helps:

- Can't call the API just by knowing the URL (need the Key too)
- When the Key is rotated, previously leaked Keys become invalid
- CORS + API Key combo provides a minimum line of defense

A server-side proxy would hide it completely, but that's not possible with a static site, so this is a realistic compromise.

### Environment Variable Setup

In Next.js, environment variables accessible from the client need the `NEXT_PUBLIC_` prefix.

Local development `.env.local`:

```
NEXT_PUBLIC_API_KEY=generated-key
```

Used in the API client:

```typescript
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "";

function headers(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "X-API-Key": API_KEY,
  };
}
```

Every fetch call sends the API Key through the `headers()` function.

***

## Registering Secrets in GitHub Actions

`.env.local` is in `.gitignore` so it doesn't get pushed to GitHub. So how does the GitHub Actions build know the API Key?

Register `NEXT_PUBLIC_API_KEY` in the GitHub repo's **Settings -> Secrets and variables -> Actions**.

Then inject it as an environment variable during the build in the workflow:

```yaml
- name: Build
  run: npm run build
  env:
    NEXT_PUBLIC_API_KEY: ${{ secrets.NEXT_PUBLIC_API_KEY }}
```

This way:

- Local: reads from `.env.local`
- CI/CD: injected from GitHub Secrets
- Source code: the key is never hardcoded anywhere

***

## .env.example

I added `.env.example` so anyone cloning the project knows which environment variables are needed.

```
NEXT_PUBLIC_API_KEY=your_api_key_here
```

Since `.gitignore` has `.env*`, you need to explicitly exclude `.env.example`:

```gitignore
.env*
!.env.example
```

A small detail, but without this you won't know what needs to be configured when setting up in a different environment later.

***

## Summary

| Layer | Protection |
| --- | --- |
| Browser | CORS (only allowed Origins pass) |
| API Server | X-API-Key header validation |
| Comments | 4-digit password hash |
| Rate Limit | IP-based 60-second limit |
| Key Management | wrangler secret + GitHub Secrets |

It's not perfect security. You can see the API Key by opening browser dev tools. But going from "anyone can call the API just by knowing the URL" to "you need to know the Key to call the API" is a sufficient improvement for a personal blog.

Security is ultimately a cost-benefit problem. Chasing perfection is endless, and knowing when to stop is also a judgment call. I think this combination is good enough for a blog API.
