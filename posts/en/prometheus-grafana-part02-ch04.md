---
title: '[Prometheus & Grafana] Chapter 4. Metric Types'
date: 2026-04-05
description: Characteristics and selection criteria for the four metric types — Counter, Gauge, Histogram, and Summary
tags:
  - Prometheus
  - Grafana
  - Monitoring
  - Observability
series: Prometheus & Grafana
seriesOrder: 4
---

> **Note**: This post is a summary based on the official Prometheus (v3.2.1) and Grafana documentation. For precise details, please refer to the official docs.
> - [Prometheus Official Docs](https://prometheus.io/docs/)
> - [Grafana Official Docs](https://grafana.com/docs/grafana/latest/)

***

Prometheus defines four core metric types. Each type is optimized for a different measurement pattern, and choosing the right one is the starting point of sound metric design.

One thing to clarify upfront: as covered in [Chapter 3. Data Model](/en/posts/prometheus-grafana-part02-ch03), Prometheus internally stores all metrics as identically structured time series. Metric types are a **logical classification** that distinguishes usage patterns at the client library level. The underlying storage structure does not change.

| Metric Type | One-Line Summary |
| --- | --- |
| Counter | Cumulative counter. Can only increase |
| Gauge | Current state. Can increase or decrease |
| Histogram | Bucket-based distribution measurement |
| Summary | Client-side quantile calculation |

***

## 4.1 Counter: A Monotonically Increasing Cumulative Value

A Counter represents a **monotonically increasing** cumulative value. It can only go up or be reset to zero -- it never decreases.

### Use Cases

- Total number of requests processed
- Total number of errors occurred
- Total bytes transmitted
- Total tasks completed

Counters must not be used for measurements that can decrease. Current active connections, pending queue size, and similar fluctuating values require Gauge, which is covered next.

### rate() Over Raw Values

The raw value of a Counter has limited meaning on its own. Knowing that "total requests reached 1,542,876" is far less useful than knowing "the request rate over the last 5 minutes was 230 per second." For this reason, Counters are almost always used with the `rate()` function.

```promql
# Counter raw value — not useful by itself
http_requests_total{job="api-server"}

# Per-second request rate — actionable information
rate(http_requests_total{job="api-server"}[5m])
```

### Reset Handling

When a process restarts, the Counter resets to zero. The `rate()` function automatically detects and compensates for this.

```plain
# Process restart scenario
t1: 1000    <- normal increment
t2: 1050    <- normal increment
t3: 30      <- reset! (restarted from 0)
t4: 80      <- normal increment
```

> `rate()` detects the reset between t2 and t3, then adjusts the calculation accordingly. There is no need to handle resets manually.

### Naming Convention

Counter metric names must include the `_total` suffix.

| Name | Valid | Reason |
| --- | --- | --- |
| `http_requests_total` | O | Includes `_total` suffix |
| `http_requests` | X | Missing suffix |
| `http_requests_count` | X | `_count` is reserved for Histogram/Summary |

***

## 4.2 Gauge: A Mutable Current-State Value

A Gauge represents a single numeric value that **can arbitrarily increase or decrease**. It captures a snapshot at a specific point in time.

### Use Cases

- Current temperature
- Current memory usage
- Current active connections
- Current queue size

### Key Differences from Counter

| Property | Counter | Gauge |
| --- | --- | --- |
| Direction | Increase only | Both increase and decrease |
| Meaning | Cumulative total | Current state |
| Common functions | `rate()`, `increase()` | Direct query, `delta()` |
| On reset | Goes to 0 on process restart | Reflects current state |

Unlike Counter, a Gauge's raw value is directly meaningful. "Current memory usage is 4.2GB" is immediately actionable information.

```promql
# Current memory usage — the raw value is meaningful as-is
node_memory_MemAvailable_bytes

# Memory change over 30 minutes
delta(node_memory_MemAvailable_bytes[30m])

# Disk space prediction 1 hour ahead — predict_linear is Gauge-only
predict_linear(node_filesystem_avail_bytes[6h], 3600)
```

> **Caution**: `rate()` is designed for Counters. Applying `rate()` to a Gauge produces meaningless results.

***

## 4.3 Histogram: Bucket-Based Distribution Measurement

A Histogram measures the **distribution of observed values**. It is used when the spread of values matters -- request latency and response size are typical examples.

### Why Averages Fall Short

Suppose the average API response time is 100ms. That average cannot distinguish between the following two scenarios.

- **Scenario A**: All requests fall between 80--120ms
- **Scenario B**: 90% of requests complete in 50ms, 10% take 550ms (= average 100ms)

In Scenario B, 10% of users are having a terrible experience, but the average alone conceals this entirely. Histograms solve this problem.

### Time Series Exposed by a Histogram

A single Histogram metric internally generates **multiple time series**.

```plain
# 1. Cumulative counters per bucket (_bucket)
http_request_duration_seconds_bucket{le="0.05"}  = 700
http_request_duration_seconds_bucket{le="0.1"}   = 900
http_request_duration_seconds_bucket{le="0.25"}  = 980
http_request_duration_seconds_bucket{le="0.5"}   = 995
http_request_duration_seconds_bucket{le="1.0"}   = 999
http_request_duration_seconds_bucket{le="+Inf"}  = 1000

# 2. Sum of all observed values (_sum)
http_request_duration_seconds_sum = 125.5

# 3. Total number of observations (_count)
http_request_duration_seconds_count = 1000
```

The three suffixes serve the following purposes.

| Suffix | Role | Notes |
| --- | --- | --- |
| `_bucket` | Cumulative counter per bucket | Upper boundary indicated by the `le` label |
| `_sum` | Sum of all observed values | Used for calculating averages |
| `_count` | Total number of observations | Equals the value of the `+Inf` bucket |

### Bucket Characteristics

Buckets are **cumulative**. Each bucket includes all observations at or below its boundary. `le` stands for "less than or equal to."

> In concrete terms, if the `le="0.1"` bucket has a value of 900, that means "900 requests responded in 0.1 seconds or less."

The `+Inf` bucket always exists and includes all observations, so its value is identical to `_count`.

### Bucket Design

The default buckets are `.005, .01, .025, .05, .1, .25, .5, 1, 2.5, 5, 10`. In practice, placing finer-grained buckets near SLO thresholds is recommended. A range of 10--20 buckets is generally appropriate. Too many buckets increase cardinality; too few reduce accuracy.

### Quantile Calculation

The `histogram_quantile()` function computes quantiles from Histogram data.

```promql
# P50 (median)
histogram_quantile(0.5, rate(http_request_duration_seconds_bucket[5m]))

# P95
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# P99
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))
```

> **Caution**: The input to `histogram_quantile()` must be buckets with `rate()` applied. Passing raw bucket values directly produces incorrect results.

***

## 4.4 Summary: Client-Side Quantile Calculation

A Summary is similar to a Histogram in that it measures the distribution of observed values. The key difference is that **quantiles are calculated on the client side** before being exposed.

### Time Series Exposed by a Summary

```plain
# 1. Pre-calculated quantiles (computed on the client)
http_request_duration_seconds{quantile="0.5"}  = 0.12
http_request_duration_seconds{quantile="0.9"}  = 0.25
http_request_duration_seconds{quantile="0.99"} = 0.48

# 2. Sum of all observed values (_sum)
http_request_duration_seconds_sum = 125.5

# 3. Total number of observations (_count)
http_request_duration_seconds_count = 1000
```

The critical difference from Histogram is that quantiles are pre-computed over a sliding window. Since computation happens on the client, server load is lower. However, **quantiles from multiple instances cannot be aggregated**. This is the most significant limitation of Summary.

***

## 4.5 Histogram vs Summary: Selection Criteria

In most cases, **choose Histogram**. There are three reasons.

1. **Aggregability**: Histograms from multiple instances can be combined; Summary quantiles cannot
2. **Flexibility**: Even after changing bucket boundaries, new quantiles can be calculated from historical data
3. **Recording Rule compatibility**: Pre-aggregation is possible

| Criterion | Histogram | Summary |
| --- | --- | --- |
| Server-side aggregation | Possible | Not possible |
| Client performance | Only increments bucket counters (low cost) | Streaming quantile computation (high cost) |
| Server performance | Quantile calculation required (relatively high cost) | Pre-computed (low cost) |
| Quantile error | Depends on bucket width | Configurable |
| Changing buckets/quantiles | Server-side configuration only | Requires client redeployment |
| Prior knowledge of value range | Required (for bucket boundaries) | Not required |

Summary is appropriate only in limited cases: when operating on a single instance where the value distribution is unpredictable, or when precise quantiles must be pre-computed on the client.

***

## 4.6 Native Histogram (v2.40+)

Native Histogram, introduced experimentally in Prometheus v2.40, addresses the limitations of classic Histograms.

### Problems with Classic Histograms

Classic Histograms require bucket boundaries to be defined in advance. More buckets mean higher cardinality, and selecting optimal bucket boundaries is inherently difficult.

### Improvements in Native Histogram

- **Automatic buckets**: Exponential buckets are generated automatically
- **Efficiency**: Provides higher resolution with far fewer time series compared to classic Histograms
- **Single sample**: An entire histogram's data is contained in a single sample

Activation requires configuring the scrape protocol in `prometheus.yml`.

```yaml
# Enable in prometheus.yml
global:
  scrape_protocols:
    - PrometheusProto
    - OpenMetricsText1.0.0
    - OpenMetricsText0.0.1
    - PrometheusText1.0.0
    - PrometheusText0.0.4
```

> Native Histogram is still an experimental feature. Evaluate carefully before using it in production.

***

## Summary

| Metric Type | Key Characteristics | Primary Functions | Representative Example |
| --- | --- | --- | --- |
| Counter | Monotonically increasing, `_total` suffix | `rate()`, `increase()` | `http_requests_total` |
| Gauge | Increases and decreases, current state | Direct query, `delta()`, `predict_linear()` | `node_memory_MemAvailable_bytes` |
| Histogram | Bucket-based distribution, `_bucket`/`_sum`/`_count` | `histogram_quantile()` | `http_request_duration_seconds` |
| Summary | Client-side quantiles, not aggregatable | Direct query | `http_request_duration_seconds{quantile="0.5"}` |

The decision criteria for metric type selection are straightforward. Cumulative totals call for Counter, current state calls for Gauge, and distribution analysis calls for Histogram. Summary is reserved for special cases only.

The next chapter covers Jobs and Instances -- the units by which Prometheus organizes metric collection.
