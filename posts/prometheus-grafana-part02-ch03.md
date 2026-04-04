---
title: '[Prometheus & Grafana] Chapter 3. 데이터 모델'
date: 2026-04-04
description: Prometheus 타임시리즈의 구조, 메트릭 네이밍, 레이블, 카디널리티, 샘플 저장 방식 정리
tags:
  - Prometheus
  - Grafana
  - 모니터링
  - 옵저버빌리티
  - Prometheus & Grafana Series
series: Prometheus & Grafana
seriesOrder: 3
---

> **참고**: 이 글은 Prometheus (v3.2.1)와 Grafana 공식 문서를 기반으로 요약·정리한 내용입니다. 정확한 내용은 공식 문서를 참조해 주세요.
> - [Prometheus 공식 문서](https://prometheus.io/docs/)
> - [Grafana 공식 문서](https://grafana.com/docs/grafana/latest/)

***

## 3.1 타임시리즈의 정의

Prometheus는 모든 데이터를 **타임시리즈(time series)**로 저장한다. 타임시리즈란 다음과 같이 정의된다.

> 메트릭 이름과 레이블 집합으로 고유하게 식별되는, 시간 순서로 정렬된 값들의 스트림

쉽게 말해, 특정 측정 대상(메트릭 이름)의 특정 차원(레이블)에 대한 시간별 값의 기록이다.

**예시:**

```plain
http_requests_total{method="GET", status="200"} → [t1: 100, t2: 150, t3: 230, ...]
http_requests_total{method="POST", status="500"} → [t1: 2, t2: 3, t3: 5, ...]
```

위 예시에서 `http_requests_total{method="GET", status="200"}`과 `http_requests_total{method="POST", status="500"}`은 **서로 다른 타임시리즈**다. 메트릭 이름은 같지만 레이블이 다르기 때문이다.

### 타임시리즈의 구성 요소

하나의 타임시리즈는 다음으로 구성된다.

| 구성 요소 | 설명 | 예시 |
| --- | --- | --- |
| 메트릭 이름 | 무엇을 측정하는가 | `http_requests_total` |
| 레이블 집합 | 어떤 차원인가 | `{method="GET", status="200"}` |
| 샘플 스트림 | 시간별 값들 | `[1709000000: 100, 1709000015: 105, ...]` |

***

## 3.2 메트릭 이름 규칙

메트릭 이름은 시스템에서 측정하는 대상을 명확하게 표현해야 한다.

### 문자 규칙

Prometheus v3.0.0부터 UTF-8 문자를 지원하지만, 호환성을 위해 다음 패턴을 권장한다.

```plain
[a-zA-Z_:][a-zA-Z0-9_:]*
```

**유효한 이름:**
- `http_requests_total`
- `node_cpu_seconds_total`
- `process_resident_memory_bytes`

**피해야 할 이름:**
- `http-requests` (하이픈 사용 — 권장하지 않음)
- `123_metric` (숫자로 시작)

### 네이밍 규칙

공식 문서의 베스트 프랙티스에 따른 네이밍 규칙은 다음과 같다.

**1. 애플리케이션 접두사 사용**

소속 시스템을 명확히 한다.

```plain
prometheus_notifications_total      ← Prometheus 자체 메트릭
node_cpu_seconds_total              ← Node Exporter 메트릭
myapp_http_requests_total           ← 커스텀 애플리케이션 메트릭
```

**2. 기본 단위(Base Unit) 사용**

변환이 필요 없는 기본 단위를 사용한다.

| 분류 | 기본 단위 | 올바른 예 | 잘못된 예 |
| --- | --- | --- | --- |
| 시간 | seconds | `request_duration_seconds` | `request_duration_ms` |
| 데이터 크기 | bytes | `response_size_bytes` | `response_size_kb` |
| 비율 | ratio (0~1) | `cpu_usage_ratio` | `cpu_usage_percent` |
| 온도 | celsius | `temperature_celsius` | `temperature_fahrenheit` |

**3. 접미사 규칙**

메트릭의 의미를 접미사로 표현한다.

| 접미사 | 의미 | 예시 |
| --- | --- | --- |
| `_total` | 누적 카운터 | `http_requests_total` |
| `_seconds` | 시간 (초 단위) | `request_duration_seconds` |
| `_bytes` | 데이터 크기 | `response_size_bytes` |
| `_info` | 메타데이터 (값은 항상 1) | `node_uname_info` |
| `_timestamp_seconds` | Unix 타임스탬프 | `process_start_time_seconds` |
| `_bucket` | 히스토그램 버킷 | `request_duration_seconds_bucket` |
| `_sum` | 히스토그램/서머리 합계 | `request_duration_seconds_sum` |
| `_count` | 히스토그램/서머리 개수 | `request_duration_seconds_count` |

**4. 콜론(`:`)은 Recording Rule 전용**

사용자가 정의하는 Recording Rule의 출력 메트릭에만 콜론을 사용한다.

```plain
# Recording Rule 출력 예시
level:metric:operations

job:http_requests:rate5m
instance:node_cpu:avg
```

일반 메트릭 이름에는 콜론을 사용하지 않는다.

***

## 3.3 레이블 (Labels)

레이블은 Prometheus 데이터 모델의 핵심이다. 동일한 메트릭의 다양한 차원을 구분하는 **키-값 쌍(key-value pair)**이다.

### 레이블의 역할

레이블이 없다면, `http_requests_total`이라는 메트릭은 전체 요청 수만 알려줄 수 있다. 레이블을 추가하면 다차원으로 분석할 수 있다.

```plain
http_requests_total{method="GET", handler="/api/users", status="200"} = 15234
http_requests_total{method="POST", handler="/api/users", status="201"} = 532
http_requests_total{method="GET", handler="/api/users", status="500"} = 12
```

이제 다음 질문에 모두 답할 수 있다.
- 전체 요청 수는? → `sum(http_requests_total)`
- GET 요청만? → `http_requests_total{method="GET"}`
- 500 에러만? → `http_requests_total{status="500"}`
- `/api/users` 핸들러의 에러율? → 필터링 + 산술 연산

### 레이블 이름 규칙

```plain
[a-zA-Z_][a-zA-Z0-9_]*
```

- `__` (이중 언더스코어)로 시작하는 레이블 이름은 Prometheus 내부용으로 예약되어 있다.
  - `__name__`: 메트릭 이름 (내부적으로 레이블로 저장됨)
  - `__address__`: 스크래핑 대상의 주소
  - `__scheme__`: 스크래핑 프로토콜 (http/https)

### 레이블과 카디널리티

**카디널리티(cardinality)**란 레이블 값의 고유한 조합 수를 의미한다. 이것은 Prometheus 운영에서 가장 중요한 개념 중 하나다.

**왜 중요한가?**

레이블 값의 모든 고유한 조합이 **별도의 타임시리즈를 생성**한다.

```plain
# 레이블이 2개이고 각각 3개, 5개의 값을 가지면
# 3 × 5 = 15개의 타임시리즈가 생성된다

http_requests_total{method="GET", status="200"}
http_requests_total{method="GET", status="201"}
http_requests_total{method="GET", status="404"}
http_requests_total{method="GET", status="500"}
http_requests_total{method="GET", status="503"}
http_requests_total{method="POST", status="200"}
... (총 15개)
```

**카디널리티 관리 원칙:**

| 규칙 | 설명 |
| --- | --- |
| 메트릭당 카디널리티 10 이하 유지 | 이상적인 수준 |
| 100 이상이면 재설계 필요 | 시스템에 부담이 된다 |
| user_id, email 같은 고유 식별자는 레이블로 사용 금지 | 수만~수백만 개의 타임시리즈 폭발 |

**나쁜 예시:**

```plain
# 사용자 ID를 레이블로 사용 — 절대 하지 말 것
http_requests_total{user_id="12345"}
http_requests_total{user_id="12346"}
... (사용자 수만큼 타임시리즈 생성)
```

**좋은 예시:**

```plain
# 제한된 값만 레이블로 사용
http_requests_total{method="GET"}    # method: 5~10가지
http_requests_total{status="200"}    # status: 5~20가지
```

### 빈 레이블 값

빈 문자열(`""`)을 가진 레이블은 해당 레이블이 존재하지 않는 것과 동일하게 취급된다. PromQL 쿼리 시 이 점을 주의해야 한다.

***

## 3.4 샘플: float64 값 + 밀리초 타임스탬프

타임시리즈를 구성하는 개별 데이터 포인트를 **샘플(sample)**이라 한다. 각 샘플은 두 가지로 구성된다.

| 구성 요소 | 타입 | 설명 |
| --- | --- | --- |
| 값 (value) | float64 또는 Native Histogram | 측정된 수치 |
| 타임스탬프 (timestamp) | int64 (밀리초) | Unix epoch 기준 밀리초 |

**예시:**

```plain
# 메트릭: http_requests_total{method="GET"}
# 샘플 스트림:
#   타임스탬프        값
    1709000000000    100      ← 2024-02-27 00:00:00 UTC
    1709000015000    105      ← 15초 후
    1709000030000    112      ← 30초 후
```

### 저장 효율

Prometheus는 샘플당 평균 **1~2바이트**만 사용한다. 이는 고도로 최적화된 압축 알고리즘 덕분이다. 연속된 값은 델타 인코딩과 XOR 기반 압축을 통해 매우 작은 크기로 저장된다.

**용량 계산 예시:**

```plain
100개 타임시리즈 × 15초 간격 = 초당 약 7개 샘플
= 시간당 약 24,000개 샘플
= 일당 약 576,000개 샘플
≈ 일당 약 1MB (샘플당 2바이트 기준)
```

***

## 3.5 표기법: `metric{label="value"}`

Prometheus에서 타임시리즈를 식별하는 표준 표기법은 다음과 같다.

### 기본 표기법

```plain
<metric_name>{<label_name>="<label_value>", ...}
```

**예시:**

```plain
api_http_requests_total{method="POST", handler="/messages"}
```

### __name__ 레이블을 사용한 대체 표기법

메트릭 이름은 내부적으로 `__name__`이라는 특수 레이블로 저장된다. 따라서 다음 두 표기법은 동일하다.

```plain
# 기본 표기법
api_http_requests_total{method="POST"}

# __name__ 레이블 사용
{__name__="api_http_requests_total", method="POST"}
```

이 대체 표기법은 메트릭 이름에 정규표현식을 적용할 때 유용하다.

```plain
# "job:"으로 시작하는 모든 메트릭 조회
{__name__=~"job:.*"}
```

### UTF-8 특수 문자 처리 (v3.0+)

Prometheus v3.0.0부터 UTF-8 메트릭 이름과 레이블 이름을 지원한다. 특수 문자가 포함된 경우 인용 부호를 사용한다.

```plain
{"metric.name.with.dots", label_name="value"}
```

다만 아직 생태계 전체가 UTF-8으로 전환 중이므로, 당분간은 기존의 ASCII 문자 세트를 사용하는 것을 권장한다.

***

## 정리

| 개념 | 핵심 |
| --- | --- |
| 타임시리즈 | 메트릭 이름 + 레이블 집합으로 고유하게 식별되는 값의 스트림 |
| 메트릭 이름 | 접두사(소속) + 단위 접미사로 명확하게 명명 |
| 레이블 | 다차원 분석을 가능하게 하는 키-값 쌍 |
| 카디널리티 | 레이블 조합 수, 10 이하 유지 권장 |
| 샘플 | float64 값 + 밀리초 타임스탬프, 샘플당 1~2바이트 |
| 표기법 | `metric{label="value"}`, `__name__` 대체 표기 가능 |
