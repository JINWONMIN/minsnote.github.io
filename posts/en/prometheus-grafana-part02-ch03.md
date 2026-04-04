---
title: '[Prometheus & Grafana] Chapter 3. Data Model'
date: 2026-04-04
description: The structure of Prometheus time series, metric naming, labels, cardinality, and how samples are stored
tags:
  - Prometheus
  - Grafana
  - Monitoring
  - Observability
series: Prometheus & Grafana
seriesOrder: 3
---

> **Note**: This post is a summary based on the official Prometheus (v3.2.1) and Grafana documentation. For precise details, please refer to the official docs.
> - [Prometheus Official Docs](https://prometheus.io/docs/)
> - [Grafana Official Docs](https://grafana.com/docs/grafana/latest/)

***

## 3.1 What is a Time Series?

Prometheus stores all data as **time series**. A time series is defined as:

> A stream of timestamped values uniquely identified by a metric name and a set of labels

In simpler terms, it's a chronological record of values for a specific measurement (metric name) along a specific dimension (labels).

**Example:**

```plain
http_requests_total{method="GET", status="200"} → [t1: 100, t2: 150, t3: 230, ...]
http_requests_total{method="POST", status="500"} → [t1: 2, t2: 3, t3: 5, ...]
```

In the example above, `http_requests_total{method="GET", status="200"}` and `http_requests_total{method="POST", status="500"}` are **different time series**. They share the same metric name but have different labels.

### Components of a Time Series

A single time series consists of the following.

| Component | Description | Example |
| --- | --- | --- |
| Metric name | What is being measured | `http_requests_total` |
| Label set | Which dimension | `{method="GET", status="200"}` |
| Sample stream | Values over time | `[1709000000: 100, 1709000015: 105, ...]` |

***

## 3.2 Metric Naming Rules

Metric names should clearly express what the system is measuring.

### Character Rules

Starting from Prometheus v3.0.0, UTF-8 characters are supported, but the following pattern is recommended for compatibility.

```plain
[a-zA-Z_:][a-zA-Z0-9_:]*
```

**Valid names:**
- `http_requests_total`
- `node_cpu_seconds_total`
- `process_resident_memory_bytes`

**Names to avoid:**
- `http-requests` (uses hyphens -- not recommended)
- `123_metric` (starts with a number)

### Naming Conventions

The naming conventions from the official best practices are as follows.

**1. Use an application prefix**

Make the owning system clear.

```plain
prometheus_notifications_total      ← Prometheus's own metric
node_cpu_seconds_total              ← Node Exporter metric
myapp_http_requests_total           ← Custom application metric
```

**2. Use base units**

Use base units that don't require conversion.

| Category | Base Unit | Correct | Incorrect |
| --- | --- | --- | --- |
| Time | seconds | `request_duration_seconds` | `request_duration_ms` |
| Data size | bytes | `response_size_bytes` | `response_size_kb` |
| Ratio | ratio (0~1) | `cpu_usage_ratio` | `cpu_usage_percent` |
| Temperature | celsius | `temperature_celsius` | `temperature_fahrenheit` |

**3. Suffix conventions**

Express the metric's meaning through suffixes.

| Suffix | Meaning | Example |
| --- | --- | --- |
| `_total` | Cumulative counter | `http_requests_total` |
| `_seconds` | Time (in seconds) | `request_duration_seconds` |
| `_bytes` | Data size | `response_size_bytes` |
| `_info` | Metadata (value is always 1) | `node_uname_info` |
| `_timestamp_seconds` | Unix timestamp | `process_start_time_seconds` |
| `_bucket` | Histogram bucket | `request_duration_seconds_bucket` |
| `_sum` | Histogram/Summary total | `request_duration_seconds_sum` |
| `_count` | Histogram/Summary count | `request_duration_seconds_count` |

**4. Colons (`:`) are reserved for Recording Rules**

Only use colons in the output metric names of user-defined Recording Rules.

```plain
# Recording Rule output examples
level:metric:operations

job:http_requests:rate5m
instance:node_cpu:avg
```

Do not use colons in regular metric names.

***

## 3.3 Labels

Labels are at the heart of Prometheus's data model. They are **key-value pairs** that distinguish different dimensions of the same metric.

### What Labels Do

Without labels, the metric `http_requests_total` can only tell you the total request count. Adding labels enables multi-dimensional analysis.

```plain
http_requests_total{method="GET", handler="/api/users", status="200"} = 15234
http_requests_total{method="POST", handler="/api/users", status="201"} = 532
http_requests_total{method="GET", handler="/api/users", status="500"} = 12
```

Now you can answer all of these questions:
- Total request count? → `sum(http_requests_total)`
- Only GET requests? → `http_requests_total{method="GET"}`
- Only 500 errors? → `http_requests_total{status="500"}`
- Error rate for the `/api/users` handler? → Filtering + arithmetic operations

### Label Name Rules

```plain
[a-zA-Z_][a-zA-Z0-9_]*
```

- Label names starting with `__` (double underscore) are reserved for Prometheus internals.
  - `__name__`: The metric name (internally stored as a label)
  - `__address__`: The scrape target's address
  - `__scheme__`: The scraping protocol (http/https)

### Labels and Cardinality

**Cardinality** refers to the number of unique combinations of label values. This is one of the most important concepts in Prometheus operations.

**Why does it matter?**

Every unique combination of label values **creates a separate time series**.

```plain
# If there are 2 labels with 3 and 5 values respectively
# 3 × 5 = 15 time series are created

http_requests_total{method="GET", status="200"}
http_requests_total{method="GET", status="201"}
http_requests_total{method="GET", status="404"}
http_requests_total{method="GET", status="500"}
http_requests_total{method="GET", status="503"}
http_requests_total{method="POST", status="200"}
... (15 total)
```

**Cardinality management principles:**

| Rule | Description |
| --- | --- |
| Keep cardinality under 10 per metric | Ideal level |
| Redesign if over 100 | Puts strain on the system |
| Never use unique identifiers like user_id or email as labels | Causes time series explosion into tens of thousands or millions |

**Bad example:**

```plain
# Using user ID as a label — never do this
http_requests_total{user_id="12345"}
http_requests_total{user_id="12346"}
... (creates as many time series as there are users)
```

**Good example:**

```plain
# Only use labels with bounded values
http_requests_total{method="GET"}    # method: 5-10 values
http_requests_total{status="200"}    # status: 5-20 values
```

### Empty Label Values

A label with an empty string value (`""`) is treated the same as if that label doesn't exist. Keep this in mind when writing PromQL queries.

***

## 3.4 Samples: float64 Value + Millisecond Timestamp

The individual data points that make up a time series are called **samples**. Each sample consists of two things.

| Component | Type | Description |
| --- | --- | --- |
| Value | float64 or Native Histogram | The measured value |
| Timestamp | int64 (milliseconds) | Milliseconds since Unix epoch |

**Example:**

```plain
# Metric: http_requests_total{method="GET"}
# Sample stream:
#   Timestamp          Value
    1709000000000    100      ← 2024-02-27 00:00:00 UTC
    1709000015000    105      ← 15 seconds later
    1709000030000    112      ← 30 seconds later
```

### Storage Efficiency

Prometheus uses an average of only **1-2 bytes per sample**. This is thanks to highly optimized compression algorithms. Consecutive values are stored in very compact form using delta encoding and XOR-based compression.

**Capacity calculation example:**

```plain
100 time series × 15-second interval = ~7 samples per second
= ~24,000 samples per hour
= ~576,000 samples per day
≈ ~1MB per day (at 2 bytes per sample)
```

***

## 3.5 Notation: `metric{label="value"}`

The standard notation for identifying a time series in Prometheus is as follows.

### Basic Notation

```plain
<metric_name>{<label_name>="<label_value>", ...}
```

**Example:**

```plain
api_http_requests_total{method="POST", handler="/messages"}
```

### Alternative Notation Using the __name__ Label

The metric name is internally stored as a special label called `__name__`. Therefore, the following two notations are equivalent.

```plain
# Basic notation
api_http_requests_total{method="POST"}

# Using the __name__ label
{__name__="api_http_requests_total", method="POST"}
```

This alternative notation is useful when applying regex to metric names.

```plain
# Query all metrics starting with "job:"
{__name__=~"job:.*"}
```

### UTF-8 Special Character Handling (v3.0+)

Starting from Prometheus v3.0.0, UTF-8 metric names and label names are supported. When special characters are included, use quotes.

```plain
{"metric.name.with.dots", label_name="value"}
```

However, since the ecosystem is still transitioning to UTF-8, it's recommended to stick with the traditional ASCII character set for now.

***

## Summary

| Concept | Key Point |
| --- | --- |
| Time series | A stream of values uniquely identified by metric name + label set |
| Metric name | Named clearly with prefix (owner) + unit suffix |
| Labels | Key-value pairs that enable multi-dimensional analysis |
| Cardinality | Number of label combinations; keep under 10 recommended |
| Samples | float64 value + millisecond timestamp, 1-2 bytes per sample |
| Notation | `metric{label="value"}`, alternative `__name__` notation available |
