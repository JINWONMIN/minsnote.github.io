---
title: "Next.js + GitHub Pages에서 한글 URL이 404 나는 이유"
date: 2026-04-05
description: "generateStaticParams의 인코딩과 GitHub Pages의 디코딩이 어긋나면 한글 페이지가 통째로 사라진다"
tags:
  - Next.js
  - GitHub Pages
  - 트러블슈팅
---

## 배포했는데 백지

블로그를 처음 GitHub Pages에 올렸을 때, 사이트에 접속하니 하얀 화면만 떴다. HTML은 있는데 CSS, JS가 전혀 로드되지 않았다. 개발자 도구를 열어보니 모든 에셋 요청이 404였다.

레포 이름이 `minsnote.github.io`였다. GitHub 계정 이름은 `JINWONMIN`이고. GitHub Pages는 `{username}.github.io`라는 이름의 레포만 루트 도메인으로 서빙한다. 그 외의 레포는 전부 서브 경로로 들어간다. 그러니까 내 사이트 URL이 `https://jinwonmin.github.io/minsnote.github.io/`가 되어버린 것이다.

Next.js는 에셋을 `/`에서 찾으려 하는데, 실제 서빙 경로는 `/minsnote.github.io/`이니 당연히 못 찾는다.

## basePath라는 응급 처치

검색하니 `basePath`와 `assetPrefix`를 설정하면 된다는 글이 나왔다.

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  output: "export",
  basePath: "/minsnote.github.io",
  assetPrefix: "/minsnote.github.io/",
};
```

에셋은 로드됐다. 화면도 나왔다. 해결인 줄 알았다.

근데 이게 시작이었다. `basePath`를 넣는 순간 모든 내부 링크 앞에 `/minsnote.github.io`가 붙는다. sitemap URL도 꼬이고, CMS 경로도 꼬이고, 로컬 개발할 때 `localhost:3000/minsnote.github.io/`로 접속해야 하는 웃긴 상황까지 생겼다. (이건 진짜 불편했다)

한 줄 추가했을 뿐인데 다섯 군데를 수정하고 있었다.

## 레포 이름을 바꾸면 끝이었다

결국 근본 원인은 레포 이름이었다. `minsnote.github.io`를 `JINWONMIN.github.io`로 바꿨다. GitHub Pages는 `{username}.github.io` 이름의 레포를 루트(`/`)에서 직접 서빙한다.

```typescript
// next.config.ts — basePath 삭제 후
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
};
```

`basePath` 지우고, `assetPrefix` 지우고, sitemap 경로 원복하고, CMS 설정 원복하고, `metadataBase` 원복하고. 아까 고쳤던 다섯 군데를 다시 원래대로 되돌렸다. 응급 처치가 아니라 처음부터 이렇게 했어야 했다.

(이 과정은 [1편: 블로그 기술 스택](/ko/posts/tech-stack)과 [4편: 도메인 연결과 한글 URL 이슈](/ko/posts/domain-and-korean-url)에서 좀 더 자세히 다뤘다.)

## 그다음은 한글 태그 404

도메인 문제를 해결하고 나서, 태그 페이지를 눌러봤다. `/tags/Next.js`는 잘 뜬다. `/tags/GitHub Pages`도 된다. `/tags/블로그`를 누르니 404.

영문 태그는 전부 정상이고, 한글 태그만 죽어있었다.

## 빌드 결과물을 까봤다

`out/` 디렉토리를 열어봤다. 영문 태그는 `out/tags/Next.js/index.html`로 깔끔하게 들어가 있었다. 한글 태그는... `out/tags/%EB%B8%94%EB%A1%9C%EA%B7%B8/index.html`. 퍼센트 인코딩된 파일명이었다.

`generateStaticParams`를 보니 범인이 바로 거기 있었다:

```typescript
// Before
return Array.from(tags).map((tag) => ({
  tag: encodeURIComponent(tag),
}));
```

`encodeURIComponent`로 태그를 인코딩하고 있었다. "한글이 URL에 들어가니까 인코딩해야지"라는 아주 자연스러운 판단이었는데, 이게 문제였다.

## GitHub Pages의 디코딩

브라우저가 `/tags/%EB%B8%94%EB%A1%9C%EA%B7%B8`를 요청한다. 여기까진 정상이다. 그런데 GitHub Pages는 이 URL을 받아서 **디코딩한 뒤** 파일을 찾는다. `%EB%B8%94%EB%A1%9C%EA%B7%B8`를 `블로그`로 풀어서, `블로그/index.html`을 찾으려고 한다.

실제 파일명은 `%EB%B8%94%EB%A1%9C%EA%B7%B8/index.html`이다. 한쪽은 디코딩하고, 한쪽은 인코딩된 채로 있으니 영원히 만나지 못한다.

정리하면 이런 흐름이다:

| 단계 | 영문 태그 (`Next.js`) | 한글 태그 (`블로그`) |
|------|----------------------|---------------------|
| `generateStaticParams` 반환값 | `Next.js` | `%EB%B8%94%EB%A1%9C%EA%B7%B8` |
| 빌드 파일명 | `Next.js/index.html` | `%EB%B8%94%EB%A1%9C%EA%B7%B8/index.html` |
| 브라우저 요청 URL | `/tags/Next.js` | `/tags/%EB%B8%94%EB%A1%9C%EA%B7%B8` |
| GitHub Pages가 찾는 파일 | `Next.js/index.html` | `블로그/index.html` |
| 결과 | 200 | 404 |

영문은 인코딩해도 값이 안 변하니까 문제가 안 보였던 것이다. 한글에서만 터지는 이유가 이거였다.

## 인코딩을 빼면 된다

`generateStaticParams`에서 `encodeURIComponent`를 제거했다:

```typescript
// After
return Array.from(tags).map((tag) => ({ tag }));
```

이러면 빌드 시 `블로그/index.html`이 한글 그대로 생성된다. GitHub Pages가 디코딩해서 `블로그`를 찾으면 실제 파일명과 일치한다.

단, 런타임에서 URL 파라미터를 받는 쪽은 `decodeURIComponent`를 유지해야 한다. 브라우저가 주소창의 한글을 자동으로 퍼센트 인코딩해서 보내는 경우가 있기 때문이다:

```typescript
export default async function TagPage({ params }: Props) {
  const { tag } = await params;
  const decodedTag = decodeURIComponent(tag);
  // decodedTag로 포스트 필터링
}
```

**빌드 시에는 인코딩하지 않고, 런타임에서만 디코딩한다.** 이 비대칭이 핵심이다.

## 교훈이라면

"URL에 비ASCII 문자가 들어가면 인코딩해야 한다"는 상식이 정적 사이트 빌드에서는 오히려 독이 됐다. 빌드 결과물의 파일명과 서버의 URL 해석 방식이 일치해야 한다는 건, 직접 404를 맞아보기 전까지는 잘 모르는 종류의 지식인 것 같다.

`basePath` 삽질도 비슷했다. 프레임워크가 제공하는 설정으로 땜질하기 전에, 문제의 원인 자체를 없앨 수 있는지 먼저 봤어야 했다. 레포 이름 하나 바꾸면 끝날 일이었으니.

결국 두 이슈 모두, 프레임워크나 플랫폼이 내부적으로 뭘 하는지 모르면 삽질한다는 같은 이야기다. 알고 나면 당연한 건데, 모를 때는 한참을 헤맨다. 그런 거다.
