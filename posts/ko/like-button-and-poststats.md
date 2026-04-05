---
title: "5편: 좋아요 기능과 PostStats 통합"
date: 2026-04-04
description: 좋아요 API를 만들고 조회수와 통합하면서 API 호출을 최적화한 과정
tags:
  - Cloudflare Workers
  - React
  - API
series: 블로그 개발기
seriesOrder: 5
---

## 조회수만으로는 부족하다

[2편: Cloudflare Workers로 블로그 API 만들기](/ko/posts/cloudflare-workers-api)에서 조회수와 댓글 API를 만들었다. 조회수는 달아놨는데, 막상 보니까 뭔가 심심하다. 글을 읽은 사람이 "괜찮았다"는 표현을 할 수 있는 방법이 없었다. 댓글을 쓸 정도는 아니지만, 가볍게 반응을 남길 수 있는 장치가 필요했다.

좋아요 버튼을 달기로 했다.

***

## API 설계: KV로 충분한가

좋아요 데이터를 어디에 저장할지 고민했다. [2편: Cloudflare Workers로 블로그 API 만들기](/ko/posts/cloudflare-workers-api)에서 조회수는 KV, 댓글은 D1에 저장한 구조를 이미 만들어 뒀다.

| 저장소 | 적합한 경우 | 좋아요에 적합? |
| --- | --- | --- |
| D1 (SQLite) | 관계형 데이터, 복잡한 쿼리 | 과함 |
| KV | 단순 키-값, 빠른 읽기 | 적합 |

좋아요는 결국 "**이 글의 좋아요 수**"와 "**이 IP가 좋아요 했는지**" 두 가지만 알면 된다. D1에 테이블을 만들 정도는 아니다. 조회수와 마찬가지로 KV를 쓰기로 했다.

### KV 키 설계

```plain
likes:{slug}              → 총 좋아요 수 (예: "5")
liked:{slug}:{ipHash}     → 좋아요 여부 (존재하면 좋아요 한 상태)
```

조회수의 `views:{slug}`와 같은 패턴이다. 키 prefix로 용도를 구분하니까, 하나의 KV namespace에서 조회수와 좋아요를 함께 관리할 수 있다.

***

## 토글 방식 구현

좋아요 취소도 가능하게 만들고 싶었다. 한 번 누르면 좋아요, 다시 누르면 취소. 토글 방식이다.

```typescript
async function toggleLike(slug: string, ipHash: string, env: Env) {
  const likedKey = `liked:${slug}:${ipHash}`;
  const likesKey = `likes:${slug}`;

  const already = await env.VIEWS.get(likedKey);
  const current = parseInt((await env.VIEWS.get(likesKey)) || "0");

  if (already) {
    // 좋아요 취소
    await env.VIEWS.delete(likedKey);
    await env.VIEWS.put(likesKey, Math.max(0, current - 1).toString());
    return { likes: Math.max(0, current - 1), liked: false };
  } else {
    // 좋아요 추가
    await env.VIEWS.put(likedKey, "1");
    await env.VIEWS.put(likesKey, (current + 1).toString());
    return { likes: current + 1, liked: true };
  }
}
```

`Math.max(0, current - 1)`은 혹시 음수가 되는 걸 방지하는 안전장치다. 정상적인 흐름에서는 음수가 될 일이 없지만, KV의 eventual consistency 특성상 동시 요청이 들어오면 타이밍 이슈가 생길 수 있다.

조회수와 달리 TTL을 설정하지 않았다. 좋아요는 "하루 한 번"이 아니라 **영구적으로 유지**되어야 하니까.

***

## 프론트엔드: LikeButton 컴포넌트

처음에는 독립적인 `LikeButton` 컴포넌트를 만들었다:

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

좋아요 상태에 따라 아이콘 색상을 바꾸고, 클릭 시 `scale-125` 애니메이션을 0.3초간 재생했다. 사소한 디테일이지만, 누르는 맛이 있어야 사람들이 누른다.

여기까지는 잘 동작했다. 문제는 그 다음이었다.

***

## 문제: API 호출이 너무 많다

포스트 페이지를 열면 이런 API 호출이 발생하고 있었다:

1. `POST /api/views` — 조회수 증가
2. `GET /api/likes` — 좋아요 수 + 좋아요 여부 조회

두 번이다. 지금은 두 개지만, 앞으로 기능이 추가되면 세 번, 네 번이 될 수 있다. 각각 독립적인 컴포넌트가 자기 API를 따로 호출하는 구조의 한계다.

***

## 해결: PostStats 통합 엔드포인트

API 쪽에 **통합 엔드포인트**를 하나 만들었다. 조회수 증가와 좋아요 조회를 한 번에 처리한다:

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

`Promise.all`로 세 가지 연산을 **병렬 실행**한다. 순차적으로 하면 KV 호출 3번의 지연이 누적되지만, 병렬이면 가장 느린 하나의 지연만 발생한다.

프론트엔드도 `ViewCounter`와 `LikeButton` 두 컴포넌트를 하나의 `PostStats`로 합쳤다:

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

  // 조회수(눈 아이콘) + 좋아요(엄지 아이콘) 함께 렌더링
}
```

API 호출이 2번에서 1번으로 줄었다. 컴포넌트도 2개에서 1개로.

***

## 정리

| 구분 | Before | After |
| --- | --- | --- |
| API 호출 | `/api/views` + `/api/likes` (2번) | `/api/post-stats` (1번) |
| 컴포넌트 | `ViewCounter` + `LikeButton` (2개) | `PostStats` (1개) |
| KV 처리 | 순차 | `Promise.all` 병렬 |

좋아요 기능 자체는 간단했다. KV에 키 두 개 추가하고 토글 로직만 넣으면 끝이다. 오히려 시간을 더 쓴 건 "API 호출을 어떻게 줄일 것인가"였다. 기능이 늘어날수록 통합 엔드포인트의 가치가 커진다는 걸 느꼈다.
