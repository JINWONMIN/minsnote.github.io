---
title: "3편: 공개 API에 인증키 달기"
date: 2026-04-03
description: Cloudflare Workers API에 X-API-Key 헤더 인증을 적용하고, GitHub Actions 빌드에 시크릿을 주입하는 과정
tags:
  - Cloudflare Workers
  - API
  - 보안
series: 블로그 개발기
seriesOrder: 3
---

## 문제 인식

블로그 API를 만들고 나서 뿌듯하게 바라보고 있었는데, 문득 생각이 들었다. 이 API URL을 아는 사람이면 누구든 curl로 호출할 수 있지 않나?

```bash
curl -X POST https://minsnote-api.xxx.workers.dev/api/comments \
  -H "Content-Type: application/json" \
  -d '{"slug":"tech-stack","nickname":"스팸","content":"광고입니다"}'
```

CORS가 있으니까 브라우저에서는 막히지만, curl이나 Postman 같은 도구는 CORS를 무시한다. 즉, API URL만 알면 댓글 스팸을 쏟아부을 수 있고, 조회수도 마음대로 조작할 수 있다.

개인 블로그라 당장 큰 문제는 아니지만, 열려 있는 문은 닫아두는 게 맞다.

***

## 인증 방식 선택

API 인증 방식은 여러 가지가 있다:

| 방식 | 복잡도 | 적합한 경우 |
| --- | --- | --- |
| API Key (헤더) | 낮음 | 서버-서버, 신뢰된 클라이언트 |
| OAuth 2.0 | 높음 | 사용자별 인증이 필요할 때 |
| JWT | 중간 | 로그인 세션 관리 |
| HMAC 서명 | 중간 | 요청 위변조 방지 |

블로그 프론트엔드 → Workers API 호출이라는 단순한 구조에서 OAuth나 JWT는 과하다. **API Key를 커스텀 헤더로 보내는 방식**이 가장 간단하고 충분하다.

***

## Workers 쪽 구현

### 1. Env에 API_KEY 추가

```typescript
export interface Env {
  VIEWS: KVNamespace;
  DB: D1Database;
  ALLOWED_ORIGIN: string;
  API_KEY: string;  // 추가
}
```

### 2. CORS 헤더에 X-API-Key 허용

API Key를 커스텀 헤더로 보내려면 CORS preflight에서 해당 헤더를 허용해야 한다. 안 그러면 브라우저가 preflight 단계에서 차단한다.

```typescript
function corsHeaders(origin: string, allowed: string) {
  return {
    "Access-Control-Allow-Origin": isAllowedOrigin(origin, allowed) ? origin : "",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-API-Key",  // 추가
  };
}
```

### 3. 라우터 앞단에서 검증

OPTIONS(preflight)는 통과시키고, 그 외 모든 요청은 API Key를 확인한다.

```typescript
if (request.method === "OPTIONS") {
  return new Response(null, { status: 204, headers: corsHeaders(origin, allowed) });
}

const apiKey = request.headers.get("X-API-Key") || "";
if (!env.API_KEY || apiKey !== env.API_KEY) {
  return jsonResponse({ error: "Unauthorized" }, 401, origin, allowed);
}
```

이게 전부다. 세 곳만 수정하면 된다.

***

## API Key 생성과 등록

API Key는 충분히 긴 랜덤 문자열이면 된다.

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
# → e2877cbd3e06fadc9b3c6c071c4f7b8cfa996c95...
```

이 키를 Workers에 **시크릿**으로 등록한다. `wrangler.toml`에 직접 쓰면 코드에 키가 노출되니까, 반드시 시크릿으로.

```bash
echo "생성된키" | wrangler secret put API_KEY
```

시크릿은 Cloudflare 서버에 암호화되어 저장되고, Workers 런타임에서 `env.API_KEY`로 접근할 수 있다. `wrangler.toml`이나 소스 코드에는 키가 남지 않는다.

배포 후 확인:

```bash
# API Key 없이 → 401
curl -s https://minsnote-api.xxx.workers.dev/api/visitors
# {"error":"Unauthorized"}

# API Key 있으면 → 200
curl -s -H "X-API-Key: 생성된키" https://minsnote-api.xxx.workers.dev/api/visitors
# {"today":1,"total":1}
```

***

## 프론트엔드에 API Key 주입

여기서 고민이 하나 있었다. 이 블로그는 `output: "export"`로 빌드되는 정적 사이트다. 클라이언트 컴포넌트에서 API를 호출하니까, API Key가 결국 브라우저에 노출된다. 그럼 의미가 없지 않나?

완전히 숨기는 건 불가능하지만, 그래도 효과는 있다:

- URL만 알고는 호출 못 함 (Key도 알아야 함)
- Key가 바뀌면 기존 유출된 Key는 무효화됨
- CORS + API Key 조합으로 최소한의 방어선

서버 사이드 프록시를 두면 완전히 숨길 수 있지만, 정적 사이트에서는 불가능하니 이 정도가 현실적인 타협이다.

### 환경변수 설정

Next.js에서 클라이언트에서 접근 가능한 환경변수는 `NEXT_PUBLIC_` 접두사가 필요하다.

로컬 개발용 `.env.local`:

```
NEXT_PUBLIC_API_KEY=생성된키
```

API 클라이언트에서 사용:

```typescript
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "";

function headers(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "X-API-Key": API_KEY,
  };
}
```

모든 fetch 호출에 `headers()` 함수를 통해 API Key를 전달한다.

***

## GitHub Actions에 시크릿 등록

`.env.local`은 `.gitignore`에 포함되어 있어서 GitHub에 올라가지 않는다. 그럼 GitHub Actions 빌드에서는 API Key를 어떻게 알까?

GitHub repo의 **Settings → Secrets and variables → Actions**에 `NEXT_PUBLIC_API_KEY`를 등록하면 된다.

그리고 워크플로우에서 빌드 시 환경변수로 주입한다:

```yaml
- name: Build
  run: npm run build
  env:
    NEXT_PUBLIC_API_KEY: ${{ secrets.NEXT_PUBLIC_API_KEY }}
```

이렇게 하면:

- 로컬: `.env.local`에서 읽음
- CI/CD: GitHub Secrets에서 주입
- 소스 코드: 키가 어디에도 하드코딩되지 않음

***

## .env.example

프로젝트를 클론한 사람이 어떤 환경변수가 필요한지 알 수 있도록 `.env.example`을 추가했다.

```
NEXT_PUBLIC_API_KEY=your_api_key_here
```

`.gitignore`에 `.env*`가 설정되어 있어서 `.env.example`은 명시적으로 예외 처리해야 한다:

```gitignore
.env*
!.env.example
```

사소한 부분이지만, 나중에 다른 환경에서 세팅할 때 이게 없으면 뭘 설정해야 하는지 모른다.

***

## 정리

| 계층 | 보호 수단 |
| --- | --- |
| 브라우저 | CORS (허용된 Origin만 통과) |
| API 서버 | X-API-Key 헤더 검증 |
| 댓글 | 4자리 비밀번호 해시 |
| Rate Limit | IP 기반 60초 제한 |
| 키 관리 | wrangler secret + GitHub Secrets |

완벽한 보안은 아니다. 브라우저 개발자 도구를 열면 API Key를 볼 수 있다. 하지만 "URL만 알면 누구나 호출 가능한 상태"에서 "Key를 알아야 호출 가능한 상태"로 바뀐 것만으로도, 개인 블로그 수준에서는 충분한 개선이다.

보안은 결국 비용 대비 효과의 문제다. 완벽을 추구하면 끝이 없고, 적당한 선에서 멈추는 것도 판단이다. 지금 이 조합이면 블로그 API 수준에서는 괜찮다고 본다.
