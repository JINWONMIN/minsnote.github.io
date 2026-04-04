---
title: '[Prometheus & Grafana] Chapter 1. Why Monitoring Matters'
date: 2026-04-02
description: The cost of outages, the 3 pillars of observability, and an overview of the Prometheus + Grafana ecosystem
tags:
  - Prometheus
  - Grafana
  - Monitoring
  - Observability
series: Prometheus & Grafana
seriesOrder: 1
---

> **Note**: This post is a summary based on the official Prometheus (v3.2.1) and Grafana documentation. For precise details, please refer to the official docs.
> - [Prometheus Official Docs](https://prometheus.io/docs/)
> - [Grafana Official Docs](https://grafana.com/docs/grafana/latest/)

***

## 1.1 The Cost of Outages and the Value of Monitoring

Modern IT systems are complex. With microservice architectures, containerization, and cloud infrastructure, it's common to operate environments with dozens to hundreds of components. When outages occur in such environments, the cost is larger than you might imagine.

### What Makes Up Outage Costs

Outage costs aren't just about the time a service was down.

- **Direct costs**: Revenue loss from service disruption, penalties from SLA (Service Level Agreement) violations
- **Indirect costs**: Customer churn, brand trust erosion, productivity loss from engineers handling incidents at night
- **Opportunity costs**: The loss from incident-response staff not being available for new feature development

There's research showing that for Amazon, 1 minute of downtime translates to roughly $220,000 in lost revenue. Even for smaller services, repeated outages put significant strain on organizations.

### What Monitoring Solves

Monitoring serves three core roles: "preventing" failures, "rapidly detecting" them when they occur, and "quickly identifying" root causes.

1. **Proactive Detection**: When disk usage hits 80%, an alert fires so you can act before it reaches 100% and takes down the service.
2. **Rapid Awareness**: Automatically detects a spike in error rates and notifies engineers before users start complaining.
3. **Root Cause Analysis**: Quickly traces from the symptom "the server is slow" to the cause "a specific database query is lagging."

### Monitoring Maturity Model

An organization's monitoring capability evolves through these stages.

| Level | Description | Example |
| --- | --- | --- |
| Level 0 | No monitoring | Learn about outages from user complaints |
| Level 1 | Basic availability checks | ping, port checks |
| Level 2 | Metric collection | CPU, memory, disk usage |
| Level 3 | Automated alerting | Threshold-based alert delivery |
| Level 4 | Dashboard-driven operations | Real-time monitoring via Grafana dashboards |
| Level 5 | Observability | Integrated analysis of metrics + logs + traces |

The goal of this guide is to build capabilities from Level 2 through Level 4.

***

## 1.2 The 3 Pillars of Observability: Metrics, Logs, Traces

Observability is the ability to understand a system's internal state from its external outputs alone. There are three core signals that make this possible.

### Metrics

Metrics are **numerical measurements**. They quantify the state of a system at a specific point in time and are best suited for tracking changes over time.

**Characteristics:**

- Highly storage-efficient (number + timestamp = very small data)
- Support aggregation and math operations (averages, sums, percentiles, etc.)
- Great for trend analysis across time ranges

**Example:**

```plain
http_requests_total{method="GET", status="200"} = 15234
node_cpu_seconds_total{mode="idle"} = 82340.56
```

Metrics answer the question "What is happening?" This is the domain Prometheus covers.

### Logs

Logs are **text records of events**. They record individual system events in structured or unstructured form.

**Characteristics:**

- Contain rich context (error messages, stack traces, etc.)
- Higher storage cost than metrics
- Support search and pattern analysis

**Example:**

```plain
2026-03-26 10:15:23 ERROR [PaymentService] Failed to process payment for user_id=12345: timeout after 30s
```

Logs answer the question "Why did it happen?" Tools like Loki and Elasticsearch handle this.

### Traces

Traces are **records that track the full path of a request**. In microservice environments, they visualize how a single request travels through multiple services.

**Characteristics:**

- Reveal call relationships between services
- Precisely measure time spent at each step
- Make bottlenecks intuitively identifiable

**Example:**

```plain
[API Gateway] 2ms → [Auth Service] 5ms → [Order Service] 150ms → [DB Query] 145ms
```

Traces answer the question "Where was time spent?" Tools like Jaeger and Tempo handle this.

### How the Three Signals Complement Each Other

| Question | Best Signal |
| --- | --- |
| What's the error rate? | Metrics |
| What errors occurred? | Logs |
| Which service did the error originate from? | Traces |
| How much has request volume increased in the last hour? | Metrics |
| Why did a specific user's request fail? | Logs + Traces |

The official docs focus primarily on **metrics**. The core content is about collecting metrics with Prometheus and visualizing them with Grafana.

***

## 1.3 Prometheus + Grafana Ecosystem Overview

### What is Prometheus?

Prometheus is an open-source monitoring system originally developed at SoundCloud in 2012, which became the second graduated project of the CNCF (Cloud Native Computing Foundation) in 2016.

**Key features:**

- **Multi-dimensional data model**: Identifies time series by metric name and labels (key-value pairs)
- **PromQL**: A dedicated query language for flexibly querying multi-dimensional data
- **Pull model**: Fetches metrics from target systems via HTTP
- **Independent operation**: Single-server architecture with no dependency on distributed storage
- **Service discovery**: Auto-detects targets through integration with Kubernetes, Consul, etc.

### What is Grafana?

Grafana is an open-source platform for visualizing metrics, logs, and traces.

**Key features:**

- **Rich visualization**: 25+ chart types
- **Dynamic dashboards**: Dropdown-based filtering using template variables
- **Alerting**: Condition-based alert rules with various notification channels
- **Explore**: Run ad-hoc queries and view results without building a dashboard
- **Provisioning**: Manage dashboards and data sources as code (YAML, Terraform)

***

## 1.4 Comparison with Other Monitoring Tools

### Traditional Monitoring Tools

| Tool | Features | vs. Prometheus |
| --- | --- | --- |
| **Nagios** | Check-based, agent model, released 1999 | No multi-dimensional data model, limited scalability |
| **Zabbix** | Agent-based, rich UI, database storage | SQL-based queries make complex aggregation difficult |
| **Munin** | Graph-centric, RRDtool-based | No label concept, inflexible querying |

### Modern Monitoring Tools

| Tool | Features | vs. Prometheus |
| --- | --- | --- |
| **Datadog** | SaaS, rich integrations, agent model | Commercial service (costs money), vendor lock-in |
| **New Relic** | APM-focused, SaaS | More application-centric than infrastructure monitoring |
| **InfluxDB + Telegraf** | Push model, general-purpose time series DB | SQL-like queries (not as powerful as PromQL) |

### When Prometheus is a Good Fit

- Pure numeric time series data collection
- Machine-centric infrastructure monitoring
- Dynamic microservice architectures
- Environments requiring multi-dimensional collection and querying

### When Prometheus is Not a Good Fit

> "It is not suited for use cases where 100% accuracy is required, such as per-request billing." - Prometheus official docs

Metric collection inherently carries a slight possibility of data loss, which is negligible for monitoring purposes but unsuitable for financial settlement.
