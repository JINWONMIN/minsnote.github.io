---
title: "7편: 복사 방지와 SEO 한방에 잡기"
date: 2026-04-05
description: 본문 복사는 막으면서 코드 블록은 허용하고, SEO 구조화 데이터까지 붙인 과정
tags:
  - SEO
  - 보안
series: 블로그 개발기
seriesOrder: 7
---

## 내 글이 그대로 복사된다

블로그에 포스트가 쌓이기 시작하니 신경 쓰이는 게 생겼다. 본문을 드래그하면 텍스트가 그대로 선택되고, Ctrl+C 한 번이면 전문이 복사된다. 기술 블로그라서 코드 블록은 당연히 복사할 수 있어야 하지만, 본문까지 무방비로 열어두는 건 내키지 않았다.

동시에 SEO도 손을 봐야 했다. [6편: 정적 블로그에 다국어(i18n) 붙이기](/ko/posts/i18n-static-blog)에서 `hreflang`과 sitemap 교차 참조를 다뤘지만, 포스트 단위의 구조화 데이터(JSON-LD)나 Open Graph 메타데이터는 아직 없었다. 복사 방지와 SEO, 두 작업을 함께 진행했다.

***

## 복사 방지와 SEO는 충돌하는가

처음에 든 의문이 있었다. **본문 복사를 막으면 검색 엔진 크롤링에도 영향이 있지 않을까?**

결론부터 말하면, 충돌하지 않는다.

| 보호 수단 | 작동 방식 | 크롤러 영향 |
| --- | --- | --- |
| CSS `user-select: none` | 브라우저 렌더링 단계에서 텍스트 선택 차단 | 없음 (크롤러는 CSS를 렌더링하지 않음) |
| JS `copy` 이벤트 차단 | 클립보드 이벤트를 `preventDefault()`로 막음 | 없음 (크롤러는 JS 이벤트를 실행하지 않음) |
| `robots.txt` / `meta robots` | 크롤러 접근 자체를 제어 | 직접 영향 |

CSS와 JS 레벨의 복사 방지는 사람의 브라우저에서만 작동한다. Googlebot이든 Yeti(네이버)든, HTML 소스를 파싱할 뿐 CSS로 선택이 안 되는지, JS로 복사가 막혀 있는지는 신경 쓰지 않는다. 따라서 복사 방지를 걸면서 SEO 메타데이터를 강화하면, 콘텐츠 보호와 검색 노출을 동시에 챙길 수 있다. "한방에 잡기"가 가능한 이유다.

***

## 복사 방지 구현

복사 방지는 **CSS 레벨**과 **JS 레벨**, 두 겹으로 걸었다.

### CSS: user-select로 선택 자체를 차단

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

`.prose`(본문 영역) 전체에 `user-select: none`을 걸고, `pre`와 `code` 태그만 `text`로 풀어줬다. `-webkit-` 접두사는 Safari 대응이다. 이렇게 하면 본문 텍스트는 드래그 자체가 안 되지만, 코드 블록은 자유롭게 선택할 수 있다.

### JS: copy 이벤트 가로채기

CSS만으로는 부족하다. 개발자 도구에서 `user-select`를 풀면 그만이니까. JS에서 `copy` 이벤트도 차단했다.

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
    return; // 코드 블록 안이면 복사 허용
  }

  e.preventDefault(); // 그 외 본문은 차단
}
```

핵심은 `isInsideCodeBlock` 함수다. 선택 영역의 시작점과 끝점이 모두 `<pre>` 또는 `<code>` 안에 있으면 복사를 허용하고, 그렇지 않으면 `preventDefault()`로 막는다. DOM 트리를 `parentNode`로 올라가며 확인하는 단순한 로직이다.

### 코드 블록 복사 버튼

코드 블록은 복사를 허용했으니, 편의를 위해 **복사 버튼**도 달았다.

```typescript
// src/components/CodeCopyButton.tsx (핵심 발췌)
const preBlocks = document.querySelectorAll(".prose pre");

preBlocks.forEach((pre) => {
  if (pre.querySelector(".code-copy-btn")) return; // 중복 방지

  const btn = document.createElement("button");
  btn.className = "code-copy-btn";

  btn.addEventListener("click", async () => {
    const code = pre.querySelector("code");
    const text = code?.textContent || pre.textContent || "";
    await navigator.clipboard.writeText(text);
    // 체크 아이콘으로 2초간 피드백
  });

  (pre as HTMLElement).appendChild(btn);
});
```

`.prose pre`를 전부 순회하면서 복사 버튼을 동적으로 생성한다. `navigator.clipboard.writeText()`로 클립보드에 넣고, 복사 성공 시 아이콘을 체크 마크로 바꿔 2초간 시각적 피드백을 준다.

버튼 스타일은 `opacity: 0`으로 숨겨두고, `pre:hover`일 때만 보이게 했다:

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

## SEO 구현

### 메타데이터 구조

SEO 메타데이터는 세 계층으로 나눠서 설정했다.

| 계층 | 파일 | 역할 |
| --- | --- | --- |
| 루트 | `src/app/layout.tsx` | `metadataBase`, `title.template`, 네이버 인증 |
| 로케일 | `src/app/[locale]/layout.tsx` | Open Graph `locale`, RSS alternate, 언어 교차 참조 |
| 포스트 | `src/app/[locale]/posts/[slug]/page.tsx` | canonical URL, OG article, JSON-LD |

루트 레이아웃에서 기본값을 깔고, 로케일 레이아웃에서 언어별 설정을 덮고, 포스트 페이지에서 개별 메타데이터를 최종 적용하는 구조다.

### 루트: metadataBase와 title 템플릿

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

`metadataBase`를 설정하면 하위 페이지에서 상대 경로로 Open Graph URL을 지정해도 자동으로 절대 URL이 된다. `title.template`의 `%s`에는 각 페이지의 `title`이 들어간다.

### 로케일: Open Graph와 alternate

```typescript
// src/app/[locale]/layout.tsx (generateMetadata 발췌)
return {
  description: dict.site.description,
  openGraph: {
    type: "website",
    siteName: "minsnote",
    locale: dict.site.locale, // ko_KR 또는 en_US
  },
  alternates: {
    types: { "application/rss+xml": `/${locale}/rss.xml` },
    languages: { ko: "/ko", en: "/en" },
  },
};
```

`alternates.languages`로 ko/en 교차 참조를 설정했다. [6편](/ko/posts/i18n-static-blog)에서 다뤘던 `hreflang`과 같은 맥락이다.

### 포스트: canonical과 JSON-LD

```typescript
// src/app/[locale]/posts/[slug]/page.tsx (generateMetadata 발췌)
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

Open Graph `type`을 로케일 레이아웃에서는 `"website"`, 포스트에서는 `"article"`로 구분했다. `publishedTime`과 `tags`도 포스트 메타데이터에서 가져온다.

JSON-LD는 `BlogPosting` 스키마로 구조화했다:

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

이걸 `<script type="application/ld+json">`으로 페이지에 삽입한다. 구글 검색 결과에서 리치 스니펫으로 노출되는 기반 데이터다.

### robots.txt

```plain
User-agent: *
Allow: /

User-agent: Yeti
Allow: /

Sitemap: https://jinwonmin.github.io/sitemap.xml
```

모든 크롤러에 전체 허용하고, 네이버 크롤러(Yeti)도 별도로 명시했다. Sitemap URL을 선언해서 크롤러가 사이트 구조를 파악할 수 있게 했다.

***

## 삽질 기록

### 삽질 1: user-select: none이 코드 블록까지 먹었다

처음에는 `.prose` 전체에 `user-select: none`만 걸었다. 코드 블록도 `.prose` 안에 있으니, 코드도 선택이 안 됐다. 기술 블로그에서 코드를 복사할 수 없으면 의미가 없다.

`.prose pre, .prose code`에 `user-select: text`를 명시적으로 풀어주는 것으로 해결했다. CSS 상속 특성상, 부모에서 `none`을 걸면 자식도 다 막히기 때문에, 예외 처리를 반드시 자식 선택자에서 해줘야 한다.

***

### 삽질 2: 복사 버튼이 다크모드에서 안 보였다

`CodeCopyButton`의 아이콘 색상을 `color: #6b7280`(gray-500)으로 고정해뒀다. 라이트 모드에서는 배경(흰색 계열)과 대비가 충분했지만, 다크모드에서는 코드 블록 배경(`#1e1e2e`)과 아이콘 색이 비슷해서 사실상 안 보였다.

hover 시 색상을 라이트/다크 분기로 나눠서 해결했다:

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

기본 상태에서는 `opacity: 0`이라 어차피 안 보이고, hover 시에만 나타나니까 hover 색상만 분기 처리하면 충분했다.

***

### 삽질 3: JSON-LD datePublished 포맷

`post.date`를 `new Date(post.date).toISOString()`으로 변환하는데, [6편](/ko/posts/i18n-static-blog)에서 다뤘던 gray-matter의 Date 객체 문제가 여기서도 재현됐다. gray-matter가 frontmatter의 `date` 필드를 자동으로 Date 객체로 변환하면서, 타임존에 따라 날짜가 하루 밀리는 경우가 있었다.

6편에서 `posts.ts`에 ISO 문자열 강제 변환 로직을 넣어뒀기 때문에, JSON-LD 쪽에서는 추가 처리 없이 해결됐다. 이미 문자열로 정규화된 `post.date`를 다시 `new Date()`로 감싸는 것이라 문제가 없었다. 6편의 삽질이 7편을 살린 케이스다.

***

## 정리

| 항목 | 구현 방식 |
| --- | --- |
| 본문 복사 차단 | CSS `user-select: none` + JS `copy` 이벤트 차단 |
| 코드 블록 허용 | `pre`, `code` 태그에 `user-select: text` + DOM 트리 확인 |
| 코드 복사 버튼 | `navigator.clipboard.writeText()` + 시각적 피드백 |
| SEO 메타데이터 | 3계층 (루트 → 로케일 → 포스트) |
| JSON-LD | `BlogPosting` 스키마 |
| robots.txt | 전체 허용 + Yeti 별도 명시 + sitemap 선언 |

복사 방지와 SEO는 겉보기에 상충하는 요구사항이지만, 실제로는 작동 레이어가 다르다. CSS/JS는 브라우저에서만 동작하고, 크롤러는 HTML 소스만 본다. 이 차이를 이해하면 두 가지를 동시에 적용하는 데 아무 문제가 없다.
