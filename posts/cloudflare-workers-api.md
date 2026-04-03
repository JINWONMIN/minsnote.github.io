---
title: Cloudflare Workers로 블로그 API 만들기
date: 2026-04-03
description: 정적 블로그에 조회수, 방문자 카운터, 댓글 기능을 붙이기 위해 Cloudflare Workers를 선택한 이유와 구현 과정
tags:
  - Cloudflare Workers
  - API
  - 블로그
---

## 정적 사이트의 한계

블로그를 어느 정도 만들어 놓고 나니, 뭔가 허전했다. 글은 올릴 수 있는데 조회수도 없고, 방문자가 몇 명인지도 모르겠고, 댓글도 못 단다. 정적 사이트라서 당연한 건데, 막상 블로그를 보고 있으면 좀 썰렁하다.

결국 이 세 가지를 붙이기로 했다:

- 포스트별 조회수
- 투데이 / 토탈 방문자 카운터
- 댓글 (스레드 답글 포함)

문제는, 이걸 하려면 **데이터를 저장할 서버**가 필요하다는 거다.

***

## 왜 Cloudflare Workers인가

서버가 필요하다고 해서 EC2 하나 띄우거나 VPS를 빌리고 싶지는 않았다. 블로그 API 하나 때문에 서버를 관리하는 건 배보다 배꼽이 더 큰 느낌이었다.

선택지를 몇 가지 따져 봤다:

| 방식 | 장점 | 단점 |
| --- | --- | --- |
| AWS Lambda + DynamoDB | 익숙한 AWS 생태계 | 설정이 번거롭고 콜드 스타트 있음 |
| Vercel Serverless | Next.js와 궁합 좋음 | 정적 export라 쓸 수 없음 |
| Supabase | PostgreSQL 기반, 무료 티어 | 외부 의존성이 하나 더 생김 |
| **Cloudflare Workers + KV + D1** | 이미 Workers 사용 중, 무료 | 직접 구현 필요 |

결정적이었던 건, CMS 인증용으로 **이미 Cloudflare Workers를 쓰고 있었다**는 점이다. 계정도 있고, `wrangler` CLI도 익숙하고, 배포도 한 줄이면 된다. 여기에 KV(키-값 저장소)와 D1(SQLite 데이터베이스)을 붙이면 별도 인프라 없이 API를 만들 수 있다.

무료 티어도 넉넉하다:

- Workers: 일 10만 요청
- KV: 일 10만 읽기, 1,000 쓰기
- D1: 5GB 저장, 일 500만 행 읽기

개인 블로그 수준에서는 과금될 일이 없다.

***

## 프로젝트 구조

Workers 프로젝트는 블로그 레포와 분리해서 별도로 만들었다. 블로그는 정적 사이트고 Workers는 서버리스 함수니까 라이프사이클이 다르다.

```plain
minsnote-api/
├── src/
│   └── index.ts        # 모든 API 로직
├── schema/
│   └── 001_init.sql    # D1 테이블 생성 SQL
├── wrangler.toml       # Workers 설정
└── tsconfig.json
```

`wrangler.toml`에 KV와 D1 바인딩을 설정한다:

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

배포는 `wrangler deploy` 한 줄이면 끝이다. 로컬 PC를 켜둘 필요도 없고, Cloudflare 엣지 서버에서 24시간 돌아간다.

***

## 데이터 저장소 설계

용도에 따라 KV와 D1을 나눠 썼다.

**KV (키-값 저장소)** — 조회수, 방문자 카운터, Rate Limit

KV는 단순한 키-값 쌍을 빠르게 읽고 쓸 수 있다. TTL(만료 시간)도 지원해서, "오늘 이 IP가 이미 방문했는지" 같은 중복 체크에 딱이다.

```typescript
// 조회수 증가 (하루에 같은 IP는 1회만)
const dedupeKey = `viewed:${slug}:${ipHash}:${today}`;
const already = await env.VIEWS.get(dedupeKey);
if (!already) {
  await env.VIEWS.put(`views:${slug}`, (current + 1).toString());
  await env.VIEWS.put(dedupeKey, "1", { expirationTtl: 86400 });
}
```

`expirationTtl: 86400`은 24시간 후 자동 삭제다. 별도 정리 작업 없이 중복 방문이 하루 단위로 리셋된다.

**D1 (SQLite)** — 댓글

댓글은 관계형 데이터라 D1을 썼다. 닉네임, 내용, 작성 시간, 비밀번호 해시, 그리고 스레드를 위한 `parent_id`까지.

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

## API 엔드포인트

모든 API는 하나의 Workers 파일(`index.ts`)에서 URL 패턴으로 라우팅한다.

| Method | Path | 기능 |
| --- | --- | --- |
| POST | `/api/views` | 조회수 +1 |
| GET | `/api/views?slug=xxx` | 조회수 조회 |
| POST | `/api/visitors` | 방문자 기록 + 카운트 반환 |
| GET | `/api/visitors` | 투데이/토탈 조회 |
| GET | `/api/comments?slug=xxx` | 댓글 목록 |
| POST | `/api/comments` | 댓글 작성 |
| PUT | `/api/comments` | 댓글 수정 |
| DELETE | `/api/comments` | 댓글 삭제 |

별도 프레임워크 없이 `if (url.pathname === "/api/views" && request.method === "POST")` 이런 식으로 라우팅했다. API가 8개밖에 안 되니까 프레임워크를 쓰는 게 오히려 과하다.

***

## CORS 설정

정적 사이트에서 Workers API를 호출하면 당연히 CORS 문제가 생긴다. `https://jinwonmin.github.io`에서 `https://minsnote-api.xxx.workers.dev`로 요청하니까.

```typescript
function corsHeaders(origin: string, allowed: string) {
  return {
    "Access-Control-Allow-Origin": isAllowedOrigin(origin, allowed) ? origin : "",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
  };
}
```

`ALLOWED_ORIGIN` 환경변수에 프로덕션 도메인을 넣고, 로컬 개발용 `localhost:3000`도 허용했다. 처음에 로컬에서 테스트했을 때 CORS 에러가 나서 한참 헤맸는데, Workers의 `ALLOWED_ORIGIN`이 프로덕션 URL만 허용하고 있었기 때문이었다.

***

## 프론트엔드 연동

블로그 쪽에서는 API 클라이언트 하나만 만들면 된다.

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

정적 사이트라 서버 컴포넌트에서는 외부 API를 호출할 수 없다. `"use client"` 클라이언트 컴포넌트로 만들어서, 페이지 로드 시 `useEffect`에서 API를 호출하는 방식으로 처리했다.

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

## 삽질 기록

### KV expirationTtl 최소값

댓글 Rate Limit을 30초로 설정했더니 500 에러가 났다. 에러 메시지도 없이 그냥 `error code: 1101`만 떠서 한참 헤맸는데, Workers에 try-catch를 추가하고 나서야 원인을 알았다.

```
Invalid expiration_ttl of 30. Expiration TTL must be at least 60.
```

KV의 TTL 최소값이 **60초**였다. 공식 문서 어딘가에 적혀 있었겠지만, 에러 메시지가 Workers 바깥으로 안 나오니까 원인 파악이 어려웠다. 그래서 Workers 라우터 전체를 try-catch로 감싸고, 에러 메시지를 JSON으로 응답하도록 바꿨다.

### 잘못된 디렉토리에서 wrangler deploy

`wrangler deploy`를 블로그 디렉토리에서 실행해버린 적이 있다. Wrangler가 알아서 Next.js 프로젝트를 감지하고 OpenNext 빌드를 시도하면서 `package.json`에 온갖 의존성을 추가해버렸다. `git checkout`으로 되돌리긴 했지만, wrangler는 항상 **Workers 프로젝트 디렉토리에서** 실행해야 한다.

***

## 정리

| 구성 요소 | 역할 |
| --- | --- |
| Cloudflare Workers | API 서버 (서버리스) |
| KV | 조회수, 방문자 카운터, Rate Limit |
| D1 | 댓글 저장 (SQLite) |
| `wrangler` CLI | 리소스 생성, 배포, DB 마이그레이션 |

정적 사이트에 동적 기능을 붙이는 건, 결국 "어디에 데이터를 저장할 것인가"의 문제다. Cloudflare Workers + KV + D1 조합은 별도 서버 없이, 무료로, 몇 시간 안에 API를 만들 수 있어서 개인 블로그에는 충분했다.

다음 글에서는 이 API에 인증키를 적용해서 외부 무단 호출을 막는 과정을 다룬다.
