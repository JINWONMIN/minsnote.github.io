---
title: "실무에서 유용한 TypeScript 팁 모음"
date: "2026-03-26"
description: "TypeScript를 사용하면서 알아두면 좋은 실용적인 팁들을 정리합니다."
tags: ["TypeScript", "개발"]
---

## 실무에서 유용한 TypeScript 팁

TypeScript를 사용하면서 자주 활용하는 패턴들을 정리해봤습니다.

### 1. Discriminated Union

여러 타입을 구분할 때 공통 필드를 활용하면 타입 가드가 자동으로 동작합니다.

```typescript
type Result =
  | { status: "success"; data: string }
  | { status: "error"; error: Error };

function handle(result: Result) {
  if (result.status === "success") {
    console.log(result.data); // string으로 추론
  } else {
    console.error(result.error); // Error로 추론
  }
}
```

### 2. satisfies 연산자

타입 체크는 하되, 추론된 타입을 유지하고 싶을 때 유용합니다.

```typescript
const config = {
  api: "https://api.example.com",
  timeout: 3000,
} satisfies Record<string, string | number>;

// config.api는 string으로 추론 (string | number가 아님)
```

### 3. Template Literal Types

문자열 패턴을 타입으로 표현할 수 있습니다.

```typescript
type EventName = `on${Capitalize<string>}`;
// "onClick", "onSubmit" 등 매칭
```

이런 패턴들을 적절히 활용하면 런타임 에러를 줄이고 개발 생산성을 높일 수 있습니다.
