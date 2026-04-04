---
title: "4편: 도메인 연결과 한글 URL 이슈"
date: 2026-04-04
description: GitHub Pages 서브 경로 배포에서 루트 도메인으로 전환하고, 한글 태그 페이지 404를 해결한 과정
tags:
  - GitHub Pages
  - Next.js
  - Blog Series
series: 블로그 개발기
seriesOrder: 4
---

## basePath의 등장과 퇴장

[1편: 블로그 기술 스택](/posts/tech-stack)에서 `basePath`와 `assetPrefix`로 GitHub Pages 서브 경로 배포 문제를 해결했다고 썼다. 레포 이름이 `minsnote.github.io`이다 보니 사이트 URL이 `https://jinwonmin.github.io/minsnote.github.io/`로 잡혀서 자산 경로가 꼬이는 문제였다.

그런데 이게 근본적인 해결이 아니었다. `basePath`를 설정하면 모든 내부 링크에 서브 경로가 붙고, sitemap URL도 꼬이고, CMS 설정도 복잡해진다. 서브 경로 하나 때문에 온갖 곳에서 경로를 신경 써야 했다.

***

## 루트 도메인 배포로 전환

해결 방법은 의외로 단순했다. GitHub에서 레포 이름을 `JINWONMIN.github.io`로 변경하면 된다. GitHub Pages는 `{username}.github.io` 이름의 레포를 루트 도메인에서 직접 서빙한다.

레포명을 바꾼 뒤 정리해야 할 것들이 꽤 있었다:

| 파일 | 변경 내용 |
| --- | --- |
| `next.config.ts` | `basePath`, `assetPrefix` 제거 |
| `public/admin/config.yml` | CMS 레포 경로를 새 이름으로 변경 |
| `public/robots.txt` | sitemap URL에서 서브 경로 제거 |
| `scripts/generate-sitemap.mjs` | `BASE_URL`에서 서브 경로 제거 |
| `src/app/layout.tsx` | `metadataBase` URL에서 서브 경로 제거 |

`next.config.ts`는 이렇게 깔끔해졌다:

```typescript
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
};
```

`basePath` 한 줄 추가했다가 다섯 군데를 수정하게 된 셈이다. 처음부터 레포 이름을 `{username}.github.io`로 만들었으면 이 삽질은 없었을 것이다.

***

## 한글 태그 404 문제

도메인 정리가 끝나고 나서, 한글 태그 페이지에서 **404**가 뜨는 걸 발견했다. 영문 태그(`/tags/Next.js`)는 정상인데 한글 태그(`/tags/블로그`)만 안 됐다.

### 원인

`generateStaticParams`에서 태그를 `encodeURIComponent`로 인코딩하고 있었다:

```typescript
// Before
return Array.from(tags).map((tag) => ({
  tag: encodeURIComponent(tag),
}));
```

이러면 빌드 시 파일명이 `%EB%B8%94%EB%A1%9C%EA%B7%B8.html`처럼 퍼센트 인코딩된 이름으로 생성된다. 문제는 GitHub Pages가 요청 URL을 **디코딩해서** 파일을 찾는다는 것이다. 브라우저가 `/tags/%EB%B8%94%EB%A1%9C%EA%B7%B8`를 요청하면 GitHub Pages는 `블로그` 디렉토리를 찾는데, 실제 파일명은 `%EB%B8%94...`이니 당연히 못 찾는다.

### 해결

`generateStaticParams`에서 인코딩을 제거했다:

```typescript
// After
return Array.from(tags).map((tag) => ({ tag }));
```

이러면 빌드 시 `블로그/` 디렉토리가 한글 그대로 생성되고, GitHub Pages의 디코딩 동작과 일치한다.

단, 런타임에서 URL 파라미터를 받는 쪽은 `decodeURIComponent`를 유지했다. 브라우저가 주소창에서 한글을 자동 인코딩해서 보내는 경우가 있기 때문이다:

```typescript
export default async function TagPage({ params }: Props) {
  const { tag } = await params;
  const decodedTag = decodeURIComponent(tag);
  // decodedTag로 포스트 필터링
}
```

**빌드 시에는 인코딩하지 않고, 런타임에서만 디코딩한다.** 이 비대칭이 핵심이다.

***

## 모바일 반응형 수정

도메인과 URL 문제를 잡으면서, 모바일에서 **가로 스크롤**이 생기는 것도 같이 수정했다. 원인은 두 가지였다.

### 1. 긴 단어가 레이아웃을 밀어냄

URL이나 코드 같은 긴 문자열이 컨테이너 너비를 초과하고 있었다. CSS에 `word-break`와 `overflow-wrap`을 추가했다:

```css
.prose {
  word-break: break-word;
  overflow-wrap: break-word;
}
```

### 2. 코드 블록 패딩이 모바일에서 과함

데스크톱 기준 패딩이 모바일에서도 그대로 적용되고 있었다. 반응형으로 분리했다:

```css
.prose pre {
  padding: 0.75rem;       /* 모바일 */
}

@media (min-width: 640px) {
  .prose pre {
    padding: 1.25rem;     /* 데스크톱 */
  }
}
```

레이아웃도 패딩과 폰트 크기를 3단계(`base → sm → lg`)로 점진적으로 키우는 방식으로 변경했다.

***

## 정리

| 문제 | 원인 | 해결 |
| --- | --- | --- |
| 서브 경로 배포의 복잡성 | 레포명이 `minsnote.github.io`라 서브 경로에 서빙 | 레포명을 `JINWONMIN.github.io`로 변경, `basePath` 제거 |
| 한글 태그 404 | `generateStaticParams`에서 `encodeURIComponent` 사용 | 인코딩 제거, 한글 디렉토리 그대로 생성 |
| 모바일 가로 스크롤 | 긴 단어 + 코드 블록 패딩 과다 | `word-break` 추가, 반응형 패딩 분리 |

GitHub Pages는 편하지만, 서브 경로 배포와 한글 URL 처리에서 예상치 못한 동작이 있었다. 특히 한글 태그 문제는 "빌드 시 파일명"과 "서버의 URL 디코딩 동작"이 일치해야 한다는 걸 모르면 원인을 찾기 어려운 종류의 버그였다.
