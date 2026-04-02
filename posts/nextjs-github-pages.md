---
title: "Next.js로 GitHub Pages 블로그 만들기"
date: "2026-03-27"
description: "Next.js의 Static Export 기능을 활용하여 GitHub Pages에 블로그를 배포하는 방법을 정리합니다."
tags: ["Next.js", "GitHub Pages", "배포"]
---

## Next.js + GitHub Pages

Next.js의 `output: 'export'` 옵션을 사용하면 정적 HTML 파일로 빌드할 수 있습니다. 이를 GitHub Pages에 배포하면 무료로 블로그를 운영할 수 있습니다.

### 1. next.config.ts 설정

```typescript
const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
};
```

`output: 'export'`는 정적 파일로 빌드하게 하고, `images.unoptimized`는 GitHub Pages에서 이미지 최적화 API를 사용할 수 없기 때문에 필요합니다.

### 2. 마크다운 포스트 시스템

`gray-matter`로 frontmatter를 파싱하고, `remark`로 마크다운을 HTML로 변환합니다.

```typescript
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";

const { data, content } = matter(fileContents);
const result = await remark().use(html).process(content);
```

### 3. GitHub Actions 배포

`main` 브랜치에 push하면 자동으로 빌드 후 GitHub Pages에 배포됩니다.

이 과정을 통해 별도의 서버 없이 빠르고 안정적인 블로그를 운영할 수 있습니다.
