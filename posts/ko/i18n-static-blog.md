---
title: "6편: 정적 블로그에 다국어(i18n) 붙이기"
date: 2026-04-04
description: Next.js 정적 블로그에 미들웨어 없이 한국어/영어 다국어를 지원한 과정과 삽질 기록
tags:
  - Next.js
  - i18n
  - SEO
series: 블로그 개발기
seriesOrder: 6
---

## 영어로도 쓰고 싶다

블로그를 만들고 몇 편 올리고 나니, 한국어로만 쓰는 게 아까웠다. 기술 블로그는 영어권 독자층이 훨씬 넓다. 같은 내용을 영어로도 노출할 수 있으면 좋겠다는 생각이 들었다.

문제는 이 블로그가 **정적 사이트**라는 점이다. `output: "export"`로 빌드하고 GitHub Pages에 올리는 구조라, 서버 사이드 미들웨어를 쓸 수 없다. `next-intl`이나 `next-i18next` 같은 라이브러리들은 대부분 미들웨어 기반 라우팅을 전제하고 있어서, 정적 사이트와는 궁합이 안 맞았다.

직접 만들기로 했다.

***

## 선택지 비교

| 방식 | 장점 | 단점 | 적합도 |
| --- | --- | --- | --- |
| next-intl / next-i18next | 생태계 풍부, 미들웨어 기반 라우팅 | `output: "export"` 미지원 | ✗ |
| `[locale]` 동적 세그먼트 + 자체 딕셔너리 | 미들웨어 불필요, 완전 제어 가능 | 직접 구현해야 함 | ✓ |
| 서브도메인 (ko.blog.com / en.blog.com) | URL이 깔끔 | DNS/인프라 설정 복잡 | ✗ |

`[locale]` 동적 세그먼트 방식을 선택했다. GitHub Pages 정적 배포와 완벽하게 호환되고, 라이브러리 의존성 없이 모든 걸 제어할 수 있다.

***

## 구현 과정

### 라우팅 구조 변경

기존 라우팅에 `[locale]` 세그먼트를 끼워넣었다:

```plain
Before:
src/app/posts/[slug]/page.tsx
src/app/tags/page.tsx

After:
src/app/[locale]/posts/[slug]/page.tsx
src/app/[locale]/tags/[tag]/page.tsx
src/app/[locale]/page.tsx
```

루트 `/`는 기본 언어인 `/ko`로 리다이렉트한다:

```typescript
// src/app/page.tsx
import { redirect } from "next/navigation";
import { defaultLocale } from "@/lib/i18n";

export default function RootPage() {
  redirect(`/${defaultLocale}`);
}
```

`generateStaticParams`에서 `locale × slug` 조합으로 정적 페이지를 생성한다. 한국어 8개, 영어 8개면 총 16개의 포스트 페이지가 빌드된다.

***

### 번역 시스템 설계

UI 문자열은 JSON 딕셔너리로 관리했다:

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

딕셔너리에는 네비게이션, 필터, 댓글, 검색 등 모든 UI 텍스트가 들어간다. `ko.json`과 `en.json`의 키 구조를 동일하게 유지하고, 컴포넌트에서는 `dict.comments.title` 같은 식으로 접근한다.

태그와 시리즈명은 별도의 **term-map**으로 관리했다. 이건 뒤에서 자세히 다룬다.

***

### 포스트 분리

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

같은 슬러그 = 같은 글이다. `posts.ts`의 모든 함수에 `locale` 파라미터를 추가해서, 어떤 언어의 포스트를 읽을지 지정하게 했다:

```typescript
export function getAllPostMetas(locale: Locale = defaultLocale): PostMeta[] {
  const postsDirectory = path.join(process.cwd(), "posts", locale);
  // ...
}
```

***

### 태그 매핑 자동화

한국어 태그 `모니터링`은 영어로 `Monitoring`이다. 이 매핑을 어떻게 관리할 것인가.

처음에는 하드코딩했다:

```typescript
// 처음 시도: 수동 매핑
const tagMap = {
  "모니터링": "Monitoring",
  "서버리스": "Serverless",
  "보안": "Security",
  // ... 태그가 늘어날 때마다 여기에 추가?
};
```

태그가 세 개일 때는 괜찮았다. 그런데 포스트가 늘어나면? 태그를 추가할 때마다 매핑 파일을 수동으로 업데이트해야 한다. 까먹으면 언어 전환 시 404가 뜬다. 확장성이 없었다.

빌드 시 자동으로 매핑을 생성하는 스크립트를 만들었다:

```javascript
// scripts/generate-term-map.mjs
for (const file of koFiles) {
  const koData = matter(fs.readFileSync(path.join(koDir, file), "utf8")).data;
  const enData = matter(fs.readFileSync(path.join(enDir, file), "utf8")).data;

  // 같은 위치의 태그끼리 매핑
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

같은 슬러그의 ko/en 포스트를 열어서, frontmatter의 태그를 **위치 기반으로** 매핑한다. 한국어 포스트의 첫 번째 태그와 영어 포스트의 첫 번째 태그가 대응된다는 규칙이다. 시리즈명도 같은 방식으로 처리했다.

빌드 파이프라인은 이렇게 됐다:

```plain
generate-term-map → next build → generate-sitemap → generate-rss
```

term-map이 먼저 생성되어야 빌드 시 번역 데이터를 참조할 수 있다.

***

### 언어 전환 버튼

Header에 EN/KO 토글 버튼을 달았다. 단순히 URL의 locale만 바꾸면 될 줄 알았는데, 생각보다 신경 쓸 게 많았다.

태그 상세 페이지에서 언어를 전환하면:
- `/ko/tags/모니터링` → `/en/tags/Monitoring`

태그명을 번역해서 URL에 넣어야 한다. 홈에서 태그 필터가 걸려 있을 때도 마찬가지다:
- `/ko?tag=옵저버빌리티` → `/en?tag=Observability`

URL 파라미터까지 번역해야 한다. `translateTerm` 함수가 이 역할을 한다:

```typescript
export function translateTerm(term: string, from: Locale, to: Locale): string {
  if (from === to) return term;
  if (from === "ko") return koToEn[term] ?? term;
  return enToKo[term] ?? term;
}
```

매핑에 없는 태그(예: `Next.js`, `API` 같은 양쪽 언어가 같은 태그)는 그대로 반환된다.

***

### SEO 대응

다국어 사이트라면 검색 엔진에 "이 페이지는 한국어 버전이고, 영어 버전은 여기 있다"고 알려줘야 한다.

세 가지를 처리했다:

| 항목 | 구현 |
| --- | --- |
| hreflang 메타태그 | `<link rel="alternate" hreflang="ko" href="...">` |
| sitemap | `<xhtml:link>` 교차 참조 |
| RSS | `/ko/rss.xml`, `/en/rss.xml` 개별 생성 |

sitemap에는 모든 URL에 대해 양쪽 언어 링크를 교차 참조한다:

```xml
<url>
  <loc>https://jinwonmin.github.io/ko/posts/tech-stack</loc>
  <xhtml:link rel="alternate" hreflang="ko"
    href="https://jinwonmin.github.io/ko/posts/tech-stack"/>
  <xhtml:link rel="alternate" hreflang="en"
    href="https://jinwonmin.github.io/en/posts/tech-stack"/>
</url>
```

검색 엔진이 두 버전을 독립된 페이지가 아니라 같은 콘텐츠의 다국어 버전으로 인식한다.

***

## 삽질 기록

### 삽질 1: useSearchParams() Suspense 에러

URL 파라미터로 필터 상태를 동기화하기 위해 `useSearchParams()`를 사용했더니, `output: "export"` 빌드 시 "should be wrapped in a suspense boundary" 에러가 터졌다.

정적 빌드에서는 URL 파라미터를 서버에서 알 수 없으니까, 해당 컴포넌트를 `<Suspense>`로 감싸야 했다:

```typescript
// src/app/[locale]/layout.tsx
<Suspense>
  <Header locale={locale as Locale} />
</Suspense>
```

***

### 삽질 2: 태그 전환 시 404

`/ko/tags/모니터링`에서 EN 버튼을 눌렀더니 `/en/tags/모니터링`으로 이동했다. 당연히 404다. 영어에는 "모니터링"이라는 태그가 없으니까.

`switchLocalePath` 함수에서 태그명을 `translateTerm`으로 번역한 후 URL을 생성하도록 수정했다.

***

### 삽질 3: 필터 상태 유실

홈에서 태그를 선택한 후 EN 전환 → `/en?tag=옵저버빌리티` → 결과 0개.

태그 파라미터도 번역해야 했다. 언어 전환 로직에서 URL의 `tag`, `series` 파라미터를 모두 `translateTerm`으로 변환하도록 처리했다.

***

### 삽질 4: gray-matter Date 객체

`date: 2026-04-04`라고 쓰면 gray-matter가 자동으로 Date 객체로 변환한다. 서버(Node.js)와 클라이언트(브라우저)의 타임존이 다르면 `dateTime` 속성이 불일치해서 hydration mismatch가 발생한다.

`posts.ts`에서 Date 객체를 ISO 문자열로 강제 변환했다:

```typescript
const date = data.date instanceof Date
  ? data.date.toISOString().split("T")[0]
  : String(data.date);
```

***

### 삽질 5: 모바일 스크롤 복원

언어 전환 시 스크롤 위치가 맨 위로 리셋됐다. 처음에는 Next.js의 `Link` 컴포넌트와 `scroll={false}` 옵션으로 해결하려 했지만, `[locale]` 전환은 실질적으로 다른 페이지로 이동하는 것이라 레이아웃이 재마운트되면서 스크롤이 리셋됐다.

결국 `button` + `window.location.href`로 full page navigation을 하되, 전환 직전 스크롤 위치를 `sessionStorage`에 저장하고 도착 페이지에서 복원하는 방식으로 해결했다:

```typescript
// Header — 전환 직전 저장
sessionStorage.setItem("__locale_scroll", String(window.scrollY));
window.location.href = target;

// ScrollRestore — 도착 후 복원
const saved = sessionStorage.getItem("__locale_scroll");
window.addEventListener("load", () => window.scrollTo(0, y), { once: true });
```

`load` 이벤트를 기다리는 이유는 이미지나 레이아웃이 완전히 로드된 후에야 정확한 위치로 스크롤할 수 있기 때문이다.

***

## 정리

| 항목 | 내용 |
| --- | --- |
| 라우팅 | `[locale]` 동적 세그먼트 (미들웨어 불필요) |
| 번역 | JSON 딕셔너리 + 자동 term-map 생성 |
| 포스트 | `posts/ko/`, `posts/en/` 동일 슬러그 |
| 언어 전환 | URL 파라미터 번역 + 스크롤 위치 복원 |
| SEO | hreflang 교차 참조, 개별 RSS |
| 빌드 | term-map → next build → sitemap → RSS |

정적 사이트에서 미들웨어 없이 i18n을 붙이는 건, 결국 "라우팅을 어떻게 나눌 것인가"와 "번역 데이터를 어디서 관리할 것인가"의 문제였다. 라이브러리 없이 직접 만들었더니 오히려 구조가 단순해졌다. 반면에 삽질은 대부분 "언어 전환 시 뭔가가 안 따라오는" 종류의 문제였다. URL, 태그명, 스크롤 위치, 날짜 타임존 — 바꿔야 할 것들이 의외로 곳곳에 숨어 있었다.
