# minsnote

개발하며 배운 것들을 기록하는 블로그.

https://jinwonmin.github.io

## 기술 스택

| 구분 | 기술 |
| --- | --- |
| Framework | Next.js (App Router, Static Export) |
| Language | TypeScript |
| Styling | Tailwind CSS + @tailwindcss/typography |
| Markdown | remark + remark-gfm + rehype-highlight |
| CMS | Sveltia CMS |
| API | Cloudflare Workers + KV + D1 ([minsnote-api](https://github.com/JINWONMIN/minsnote-api)) |
| Hosting | GitHub Pages |
| CI/CD | GitHub Actions |

## 기능

- 마크다운 기반 블로그 포스팅
- 태그 분류 및 필터링
- 포스트별 조회수, 사이트 방문자 카운터
- 댓글 (비밀번호 기반 수정/삭제, 스레드 답글)
- 코드 블록 Syntax Highlighting + 복사 버튼
- 텍스트 복사 방지 (코드 블록 제외)
- SEO (sitemap, RSS, robots.txt, canonical, JSON-LD)
- Sveltia CMS로 브라우저에서 글 작성

## 로컬 개발

```bash
npm install
npm run dev
```

http://localhost:3000 으로 접속.

## 환경변수

`.env.example` 참고:

```
NEXT_PUBLIC_API_KEY=your_api_key_here
```

## 빌드

```bash
npm run build
```

`next build` 후 sitemap.xml, rss.xml이 자동 생성됩니다.

## 프로젝트 구조

```
├── src/
│   ├── app/              # Next.js App Router
│   ├── components/       # UI 컴포넌트
│   └── lib/              # 마크다운 파싱, API 클라이언트
├── posts/                # 마크다운 포스트
├── public/               # 정적 파일 (CMS, 검색엔진 인증)
├── scripts/              # sitemap, RSS 생성 스크립트
└── .github/workflows/    # GitHub Actions 배포
```
