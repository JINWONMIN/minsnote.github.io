---
title: "블로그 기술 스택"
date: "2026-03-27"
description: "이 블로그를 만들면서 선택한 기술 스택과 겪었던 시행착오를 정리합니다."
tags: ["블로그", "Next.js", "GitHub Pages", "Sveltia CMS"]
---

## 이 블로그는 이렇게 만들어졌습니다

개발 공부를 기록할 공간이 필요했다. 여러 블로그 플랫폼을 고민하다가, 직접 만들어 보는 것도 공부가 되겠다 싶어서 Next.js + GitHub Pages 조합으로 시작했다. 결과적으로 하루 만에 블로그를 완성했지만, 그 과정에서 꽤 많은 삽질이 있었다.

---

## 기술 스택

| 구분 | 기술 | 버전 |
|------|------|------|
| Framework | Next.js | 16.2.1 |
| Language | TypeScript | 5.x |
| UI Library | React | 19.2.4 |
| Styling | Tailwind CSS | 4.x |
| Typography | @tailwindcss/typography | 0.5.19 |
| Markdown | remark + remark-html + gray-matter | - |
| Reading Time | reading-time | 1.5.0 |
| CMS | Sveltia CMS | CDN |
| OAuth Proxy | Cloudflare Workers (Sveltia CMS Authenticator) | - |
| Hosting | GitHub Pages | - |
| CI/CD | GitHub Actions | - |

---

## Framework: Next.js

`create-next-app`으로 프로젝트를 생성하고, App Router 기반으로 구성했다. 블로그는 동적 서버가 필요 없기 때문에 `next.config.ts`에서 `output: "export"`를 설정해 정적 사이트로 빌드한다.

마크다운 파일을 `posts/` 디렉토리에 두고, `gray-matter`로 frontmatter(제목, 날짜, 태그)를 파싱하고 `remark` + `remark-html`로 본문을 HTML로 변환하는 구조다. `reading-time` 라이브러리로 예상 읽기 시간도 계산한다.

페이지 라우팅은 `generateStaticParams()`를 활용해 빌드 타임에 모든 포스트와 태그 페이지를 미리 생성한다. 배포 후에는 별도의 서버 없이 정적 HTML만으로 동작한다.

---

## Styling: Tailwind CSS + Typography

스타일링은 Tailwind CSS 4.x를 사용했다. 마크다운 본문에는 `@tailwindcss/typography` 플러그인의 `prose` 클래스를 적용해 별도 스타일 작업 없이 깔끔한 본문 렌더링을 구현했다.

폰트는 Space Grotesk(본문)과 JetBrains Mono(코드), 포인트 컬러는 rose 계열을 사용했다. 다크 모드는 처음부터 기본값으로 설정했는데, `prefers-color-scheme` 대신 html 요소에 `dark` 클래스를 직접 적용하는 방식으로 전환했다. `@custom-variant`를 사용해 클래스 기반 다크 모드를 적용하는 게 Tailwind CSS 4에서 더 깔끔했다.

---

## Hosting: GitHub Pages

GitHub Pages를 호스팅으로 선택한 이유는 단순하다. 무료이고, GitHub 레포지토리와 자연스럽게 연동되며, GitHub Actions로 push만 하면 자동 배포가 된다.

### basePath 문제

여기서 첫 번째 삽질이 있었다. GitHub Pages에 배포했더니 **CSS와 JS가 전혀 로드되지 않았다.** 페이지는 열리는데 스타일이 하나도 적용되지 않은 백지 상태였다.

원인은 GitHub Pages의 URL 구조 때문이었다. 레포지토리 이름이 `minsnote.github.io`이다 보니 사이트가 `https://jinwonmin.github.io/minsnote.github.io/` 하위 경로에 배포되는데, Next.js는 기본적으로 루트(`/`)에서 에셋을 찾으려 한다.

`next.config.ts`에 `basePath`와 `assetPrefix`를 추가해서 해결했다.

```typescript
const nextConfig: NextConfig = {
  output: "export",
  basePath: "/minsnote.github.io",
  assetPrefix: "/minsnote.github.io/",
  images: { unoptimized: true },
};
```

단순한 설정이지만, 이걸 모르면 한참 헤맬 수 있다.

---

## CMS: Decap CMS에서 Sveltia CMS로

블로그 글을 매번 로컬에서 마크다운 파일을 만들고 커밋하는 건 번거롭다. 브라우저에서 바로 글을 쓸 수 있는 CMS를 붙이고 싶었고, 처음에는 **Decap CMS**(구 Netlify CMS)를 선택했다.

### Decap CMS의 인증 지옥

Decap CMS 자체는 금방 붙였다. `public/admin/`에 `index.html`과 `config.yml`만 넣으면 된다. 문제는 **GitHub OAuth 인증**이었다.

Decap CMS는 GitHub 로그인을 위해 별도의 OAuth 프록시 서버가 필요하다. 처음에는 Netlify를 OAuth 프록시로 사용하려 했는데, "Sign in with GitHub" 버튼을 누르면 팝업 창에 **404 Not Found**만 떴다.

그 뒤로 약 1시간 동안 아래 방법들을 순서대로 시도했다:

1. **Netlify OAuth 프록시** → 404 에러. `site_domain` 설정이 맞지 않았다
2. **GitHub PKCE 인증** (`auth_type: pkce`) → 역시 실패. Decap CMS의 PKCE 지원이 불안정했다
3. **`site_domain` 명시적 설정** → 여전히 Netlify 인증 폴백이 발생
4. **Netlify `site_domain` 재설정** → 부분적으로 동작했지만 안정적이지 않았다

커밋 로그를 보면 15:42 → 15:46 → 15:52로 6분 간격으로 수정을 반복한 흔적이 남아 있다.

### Sveltia CMS로 전환

결국 Decap CMS를 포기하고 **Sveltia CMS**로 전환했다. Sveltia CMS는 Decap CMS의 드롭인 대체제로, CDN 스크립트 하나만 교체하면 된다.

하지만 Sveltia CMS도 GitHub OAuth를 위해서는 **OAuth 클라이언트 서버**가 필요했다. 공식적으로 제공하는 **Sveltia CMS Authenticator**를 Cloudflare Workers에 배포하고, GitHub OAuth App을 등록한 뒤 `config.yml`에 `base_url`을 추가하니 드디어 인증이 정상 동작했다.

최종 인증 흐름은 이렇다:

```
사용자 → "Sign in with GitHub" 클릭
  → Cloudflare Workers (OAuth 프록시)
  → GitHub OAuth 인증
  → 토큰 발급 → CMS 로그인 완료
```

돌이켜보면, 처음부터 Sveltia CMS + Cloudflare Workers 조합으로 갔으면 시간을 아꼈을 것이다. Decap CMS는 Netlify 환경이 아니면 OAuth 설정이 상당히 까다롭다.

---

## CI/CD: GitHub Actions

배포 파이프라인은 GitHub Actions로 구성했다. `main` 브랜치에 push하면 자동으로 빌드하고 GitHub Pages에 배포한다.

```yaml
# .github/workflows/deploy.yml
jobs:
  build:
    steps:
      - npm ci
      - npm run build        # → ./out/ 디렉토리에 정적 파일 생성
      - upload-pages-artifact # → GitHub Pages에 업로드
  deploy:
    - deploy-pages           # → 배포
```

CMS에서 글을 쓰면 GitHub에 커밋이 생기고, 그 커밋이 자동으로 빌드 → 배포까지 이어진다. 로컬에서 아무것도 안 해도 브라우저에서 글을 쓰고 발행할 수 있는 구조다.

---

## 프로젝트 구조

```
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # 루트 레이아웃 (Header + Footer)
│   │   ├── page.tsx            # 홈페이지
│   │   ├── posts/[slug]/       # 포스트 상세 페이지
│   │   ├── tags/               # 태그 목록 / 태그별 필터
│   │   └── about/              # 소개 페이지
│   ├── components/             # UI 컴포넌트
│   │   ├── Header.tsx          # 상단 네비게이션
│   │   ├── Sidebar.tsx         # 사이드바 레이아웃
│   │   ├── ProfileCard.tsx     # 프로필 카드
│   │   ├── PostCard.tsx        # 포스트 목록 카드
│   │   ├── TagNav.tsx          # 태그 필터 (클라이언트)
│   │   ├── TableOfContents.tsx # 목차 (Intersection Observer)
│   │   └── HomeContent.tsx     # 홈 콘텐츠 (클라이언트)
│   └── lib/
│       ├── posts.ts            # 마크다운 파싱 및 포스트 데이터
│       └── formatDate.ts       # 한국어 날짜 포맷
├── posts/                      # 마크다운 포스트 파일
├── public/admin/               # Sveltia CMS
└── .github/workflows/          # GitHub Actions 배포
```

---

## 정리

| 문제 | 해결 |
|------|------|
| 정적 사이트에서 에셋 로드 실패 | `basePath` + `assetPrefix` 설정 |
| 마크다운 본문 스타일링 | `@tailwindcss/typography` prose 클래스 |
| 다크 모드 기본 적용 | html에 `dark` 클래스 + `@custom-variant` |
| Decap CMS OAuth 인증 실패 | Sveltia CMS + Cloudflare Workers로 전환 |
| 브라우저 글 작성 → 자동 배포 | Sveltia CMS → GitHub 커밋 → Actions → Pages |

삽질의 대부분은 "GitHub Pages 하위 경로 배포"와 "CMS 인증"에서 발생했다. 특히 CMS 인증은 공식 문서만으로는 해결이 어려웠고, 직접 여러 방법을 시도하면서 맞는 조합을 찾아야 했다.
