---
title: '[Prometheus & Grafana] Chapter 4. 메트릭 타입'
date: 2026-04-05
description: Counter, Gauge, Histogram, Summary 네 가지 메트릭 타입의 특성과 선택 기준 정리
tags:
  - Prometheus
  - Grafana
  - 모니터링
  - 옵저버빌리티
series: Prometheus & Grafana
seriesOrder: 4
---

> **참고**: 이 글은 Prometheus (v3.2.1)와 Grafana 공식 문서를 기반으로 요약·정리한 내용입니다. 정확한 내용은 공식 문서를 참조해 주세요.
> - [Prometheus 공식 문서](https://prometheus.io/docs/)
> - [Grafana 공식 문서](https://grafana.com/docs/grafana/latest/)

***

Prometheus는 네 가지 핵심 메트릭 타입을 정의한다. 각 타입은 서로 다른 측정 패턴에 최적화되어 있으며, 적절한 타입을 선택하는 것이 올바른 메트릭 설계의 시작이다.

한 가지 먼저 짚고 넘어갈 점이 있다. [Chapter 3. 데이터 모델](/ko/posts/prometheus-grafana-part02-ch03)에서 다뤘듯이 Prometheus는 내부적으로 모든 메트릭을 동일한 형태의 타임시리즈로 저장한다. 메트릭 타입은 클라이언트 라이브러리에서의 사용 패턴을 구분하기 위한 **논리적 분류**다. 저장 구조가 달라지는 것이 아니다.

| 메트릭 타입 | 한 줄 요약 |
| --- | --- |
| Counter | 누적 카운터. 증가만 가능 |
| Gauge | 현재 상태. 증감 모두 가능 |
| Histogram | 버킷 기반 분포 측정 |
| Summary | 클라이언트 측 분위수 계산 |

***

## 4.1 Counter: 단조 증가하는 누적 값

Counter는 **단조 증가**(monotonically increasing)하는 누적 값을 나타내는 메트릭이다. 값은 오직 증가하거나 0으로 리셋될 수 있으며, 감소는 불가능하다.

### 사용 대상

- 처리한 총 요청 수
- 발생한 총 에러 수
- 전송한 총 바이트 수
- 완료한 총 작업 수

값이 감소할 수 있는 측정에는 Counter를 사용하면 안 된다. 현재 활성 연결 수, 큐에 대기 중인 작업 수 등은 뒤에서 다룰 Gauge를 사용해야 한다.

### 원시 값보다 rate()

Counter의 원시 값(raw value)은 그 자체로는 의미가 제한적이다. "총 요청 수가 1,542,876"이라는 정보보다 "최근 5분간 초당 요청이 230건"이라는 정보가 더 유용하다. 따라서 Counter는 거의 항상 `rate()` 함수와 함께 사용한다.

```promql
# Counter 원시 값 — 이것만으로는 유용하지 않다
http_requests_total{job="api-server"}

# 초당 요청률 — 실제로 유용한 정보
rate(http_requests_total{job="api-server"}[5m])
```

### 리셋 처리

프로세스가 재시작되면 Counter는 0으로 리셋된다. `rate()` 함수는 이를 자동으로 감지하고 보정한다.

```plain
# 프로세스 재시작 시나리오
t1: 1000    <- 정상 증가
t2: 1050    <- 정상 증가
t3: 30      <- 리셋! (재시작으로 0에서 다시 시작)
t4: 80      <- 정상 증가
```

> `rate()`는 t2에서 t3 사이의 리셋을 감지하고 보정 계산한다. 리셋을 직접 처리할 필요는 없다.

### 네이밍 규칙

Counter 메트릭 이름에는 반드시 `_total` 접미사를 붙인다.

| 이름 | 적합 여부 | 이유 |
| --- | --- | --- |
| `http_requests_total` | O | `_total` 접미사 포함 |
| `http_requests` | X | 접미사 누락 |
| `http_requests_count` | X | `_count`는 Histogram/Summary 전용 |

***

## 4.2 Gauge: 증감 가능한 현재 상태

Gauge는 **임의로 증가하거나 감소할 수 있는** 단일 수치를 나타내는 메트릭이다. 특정 시점의 순간 값(snapshot)을 표현한다.

### 사용 대상

- 현재 온도
- 현재 메모리 사용량
- 현재 활성 연결 수
- 현재 큐 크기

### Counter와의 핵심 차이

| 특성 | Counter | Gauge |
| --- | --- | --- |
| 방향 | 증가만 가능 | 증감 모두 가능 |
| 의미 | 누적량 | 현재 상태 |
| 주로 사용하는 함수 | `rate()`, `increase()` | 직접 조회, `delta()` |
| 리셋 | 프로세스 재시작 시 0 | 현재 상태 반영 |

Counter와 달리 Gauge의 원시 값은 그 자체로 의미가 있다. "현재 메모리 사용량이 4.2GB"는 직접적으로 유용한 정보다.

```promql
# 현재 메모리 사용량 — 원시 값이 바로 의미 있다
node_memory_MemAvailable_bytes

# 30분간 메모리 변화량
delta(node_memory_MemAvailable_bytes[30m])

# 1시간 후 디스크 예측 — predict_linear는 Gauge에만 사용
predict_linear(node_filesystem_avail_bytes[6h], 3600)
```

> **주의**: `rate()`는 Counter 전용이다. Gauge에 `rate()`를 사용하면 의미 없는 결과가 나온다.

***

## 4.3 Histogram: 버킷 기반 분포 측정

Histogram은 **관찰값(observation)의 분포**를 측정하는 메트릭이다. 요청 지연시간이나 응답 크기처럼 값의 분포가 중요한 경우에 사용한다.

### 왜 평균으로는 부족한가

API 응답 시간의 평균이 100ms라고 하자. 하지만 이 평균은 다음 두 시나리오를 구분하지 못한다.

- **시나리오 A**: 모든 요청이 80~120ms 사이
- **시나리오 B**: 90%의 요청이 50ms, 10%의 요청이 550ms (= 평균 100ms)

시나리오 B에서 10%의 사용자는 매우 나쁜 경험을 하고 있지만, 평균만으로는 이를 발견할 수 없다. Histogram은 이 문제를 해결한다.

### Histogram이 노출하는 시계열

Histogram 메트릭 하나는 내부적으로 **여러 개의 타임시리즈**를 생성한다.

```plain
# 1. 버킷별 누적 카운터 (_bucket)
http_request_duration_seconds_bucket{le="0.05"}  = 700
http_request_duration_seconds_bucket{le="0.1"}   = 900
http_request_duration_seconds_bucket{le="0.25"}  = 980
http_request_duration_seconds_bucket{le="0.5"}   = 995
http_request_duration_seconds_bucket{le="1.0"}   = 999
http_request_duration_seconds_bucket{le="+Inf"}  = 1000

# 2. 관찰값의 합계 (_sum)
http_request_duration_seconds_sum = 125.5

# 3. 관찰 횟수 (_count)
http_request_duration_seconds_count = 1000
```

세 가지 접미사의 의미를 정리하면 다음과 같다.

| 접미사 | 역할 | 비고 |
| --- | --- | --- |
| `_bucket` | 버킷별 누적 카운터 | `le` 레이블로 상한 경계 표시 |
| `_sum` | 관찰값의 합계 | 평균 계산에 사용 |
| `_count` | 관찰 횟수 | `+Inf` 버킷과 동일한 값 |

### 버킷의 특성

버킷은 **누적**(cumulative) 방식이다. 각 버킷은 해당 경계 이하의 모든 관찰을 포함한다. `le`는 "less than or equal to"의 약자다.

> 쉽게 말해, `le="0.1"` 버킷의 값이 900이라면 "0.1초 이하로 응답한 요청이 900건"이라는 뜻이다.

`+Inf` 버킷은 항상 존재하며, 모든 관찰을 포함하므로 `_count`와 동일한 값을 가진다.

### 버킷 설계

기본 버킷은 `.005, .01, .025, .05, .1, .25, .5, 1, 2.5, 5, 10`이다. 실무에서는 SLO 근처에 더 세밀한 버킷을 배치하는 것이 좋다. 일반적으로 10~20개 버킷이 적절하다. 너무 많으면 카디널리티가 높아지고, 너무 적으면 정확도가 떨어진다.

### 분위수(Quantile) 계산

`histogram_quantile()` 함수를 사용하여 Histogram에서 분위수를 계산한다.

```promql
# P50 (중간값)
histogram_quantile(0.5, rate(http_request_duration_seconds_bucket[5m]))

# P95
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# P99
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))
```

> **주의**: `histogram_quantile()`에 전달하는 것은 반드시 `rate()`가 적용된 버킷이어야 한다. 원시 버킷 값을 그대로 넣으면 안 된다.

***

## 4.4 Summary: 클라이언트 측 분위수 계산

Summary는 Histogram과 유사하게 관찰값의 분포를 측정하지만, **클라이언트 측에서 분위수를 직접 계산**하여 노출한다는 점이 다르다.

### Summary가 노출하는 시계열

```plain
# 1. 분위수 값 (클라이언트 측 계산)
http_request_duration_seconds{quantile="0.5"}  = 0.12
http_request_duration_seconds{quantile="0.9"}  = 0.25
http_request_duration_seconds{quantile="0.99"} = 0.48

# 2. 관찰값의 합계 (_sum)
http_request_duration_seconds_sum = 125.5

# 3. 관찰 횟수 (_count)
http_request_duration_seconds_count = 1000
```

Histogram과의 결정적인 차이는 분위수가 슬라이딩 윈도우에서 미리 계산된다는 점이다. 클라이언트에서 계산되므로 서버 부하가 적지만, **여러 인스턴스의 분위수는 합산할 수 없다**. 이것이 Summary의 가장 큰 제약이다.

***

## 4.5 Histogram vs Summary 선택 기준

대부분의 경우 **Histogram을 선택하라**. 이유는 세 가지다.

1. **집계 가능성**: 여러 인스턴스의 Histogram은 합산할 수 있지만, Summary 분위수는 합산할 수 없다
2. **유연성**: 버킷을 변경해도 과거 데이터로 새로운 분위수를 계산할 수 있다
3. **Recording Rule 호환**: 사전 집계가 가능하다

| 기준 | Histogram | Summary |
| --- | --- | --- |
| 서버 측 집계 | 가능 | 불가능 |
| 클라이언트 성능 | 버킷 카운터 증가만 (저비용) | 스트리밍 분위수 계산 (고비용) |
| 서버 성능 | 분위수 계산 필요 (상대적 고비용) | 사전 계산됨 (저비용) |
| 분위수 오차 | 버킷 너비에 의존 | 설정 가능 |
| 버킷/분위수 변경 | 서버 설정만 변경 | 클라이언트 재배포 필요 |
| 값의 범위를 미리 알아야 | 필요 (버킷 경계 설정) | 불필요 |

Summary가 적합한 경우는 제한적이다. 단일 인스턴스에서만 사용하며 값의 분포를 예측할 수 없거나, 클라이언트에서 정확한 분위수를 미리 계산해야 하는 경우에 한한다.

***

## 4.6 Native Histogram (v2.40+)

Prometheus v2.40부터 실험적으로 도입된 Native Histogram은 기존 Histogram의 한계를 개선한다.

### 기존 Histogram의 문제

기존 Histogram은 버킷 경계를 미리 정의해야 하고, 버킷 수가 많으면 카디널리티가 높아지며, 최적의 버킷 경계를 선택하기 어렵다는 문제가 있다.

### Native Histogram의 개선

- **자동 버킷**: 지수적(exponential) 버킷을 자동 생성한다
- **효율성**: 기존 Histogram 대비 훨씬 적은 타임시리즈로 더 높은 해상도를 제공한다
- **단일 샘플**: 하나의 샘플에 전체 히스토그램 데이터가 포함된다

활성화는 `prometheus.yml`에서 스크래핑 프로토콜을 설정하면 된다.

```yaml
# prometheus.yml에서 활성화
global:
  scrape_protocols:
    - PrometheusProto
    - OpenMetricsText1.0.0
    - OpenMetricsText0.0.1
    - PrometheusText1.0.0
    - PrometheusText0.0.4
```

> Native Histogram은 아직 실험적 기능이다. 프로덕션 사용은 신중하게 검토해야 한다.

***

## 정리

| 메트릭 타입 | 핵심 특성 | 주요 함수 | 대표 예시 |
| --- | --- | --- | --- |
| Counter | 단조 증가, `_total` 접미사 | `rate()`, `increase()` | `http_requests_total` |
| Gauge | 증감 모두 가능, 현재 상태 | 직접 조회, `delta()`, `predict_linear()` | `node_memory_MemAvailable_bytes` |
| Histogram | 버킷 기반 분포, `_bucket`/`_sum`/`_count` | `histogram_quantile()` | `http_request_duration_seconds` |
| Summary | 클라이언트 측 분위수, 합산 불가 | 직접 조회 | `http_request_duration_seconds{quantile="0.5"}` |

메트릭 타입 선택의 핵심 판단 기준은 간단하다. 누적량이면 Counter, 현재 상태면 Gauge, 분포가 중요하면 Histogram이다. Summary는 특수한 경우에만 사용한다.

다음 장에서는 Prometheus가 메트릭을 수집하는 단위인 Jobs와 Instances를 다룬다.
