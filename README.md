# 🚀 AI Inference Rate Limiter

<div align="center">

![Rate Limiter](https://img.shields.io/badge/Rate%20Limiter-Distributed-blue)
![Redis](https://img.shields.io/badge/Backend-Redis-red)
![Sliding Window](https://img.shields.io/badge/Algorithm-Sliding%20Window%20Log-green)
![Status](https://img.shields.io/badge/Status-Phase%201-yellow)

**A distributed rate limiting service designed to control and manage AI inference requests, ensuring fair usage and preventing system overload.**

[Features](#-features) • [Architecture](#-architecture) • [Quick Start](#-getting-started) • [API Reference](#-api-reference) • [Monitoring](#-monitoring--observability)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Architecture](#-architecture)
- [Core Concepts](#-core-concepts)
- [Rate Limiting Algorithm](#-rate-limiting-algorithm)
- [Configuration Model](#-configuration-model)
- [Getting Started](#-getting-started)
- [API Reference](#-api-reference)
- [Deployment Patterns](#-deployment-patterns)
- [Monitoring & Observability](#-monitoring--observability)
- [Evolution Path](#-evolution-path)
- [Advanced Topics](#-advanced-topics)

---

## 🎯 Overview

This project implements a **distributed rate limiting system** specifically tailored for AI inference workloads. It enforces a **Sliding Window Log** policy to control request rates, manage quotas across multiple dimensions, and ensure optimal resource utilization.

<div align="center">

```mermaid
graph TB
    Client[👤 Client] -->|HTTP/gRPC Request| Gateway[🌐 API Gateway]
    Gateway -->|AuthN/Z| Auth[🔐 Authentication]
    Auth -->|Check Rate Limit| RateLimiter[⚡ Rate Limiter Service]
    RateLimiter -->|Query State| Redis[(📦 Redis Cluster)]
    RateLimiter -->|Allow/Deny| Decision{✅ Allowed?}
    Decision -->|Yes| Router[🔀 Model Router]
    Decision -->|No| Reject[❌ HTTP 429]
    Router -->|Route Request| ModelServers[🤖 Model Servers / GPU Pool]
    
    style Client fill:#e1f5ff
    style Gateway fill:#fff4e1
    style RateLimiter fill:#ffe1f5
    style Redis fill:#ff6b6b,color:#fff
    style ModelServers fill:#d4edda
```

</div>

### Key Capabilities

- ✅ **Multi-Scope Rate Limiting** - Enforce limits across user, tenant, API key, model tier, and more
- ✅ **Sliding Window Log** - True time-based windowing for accurate rate limiting
- ✅ **Distributed & Scalable** - Stateless nodes with Redis-backed shared state
- ✅ **AI-Specific Optimizations** - GPU pool protection, global model caps, multi-window protection
- ✅ **Production-Ready** - Comprehensive monitoring, alerts, and graceful degradation

---

## ✨ Features

### 🔹 Core Functional Features

| Feature | Description | Status |
|---------|-------------|--------|
| **Per User + Model** | Default 100 requests/hour per (userId, modelId) pair | ✅ |
| **Multi-Scope Enforcement** | Simultaneous checks across multiple dimensions | ✅ |
| **Configurable Rules** | Dynamic rule resolution with hierarchy | ✅ |
| **Sliding Window Log** | Accurate time-based windowing | ✅ |
| **Metadata-Rich Responses** | Returns limit, remaining, reset time | ✅ |
| **Low-Latency** | Single Redis round-trip via Lua scripts | ✅ |

### 🔹 Safety & Protection Features

| Feature | Description | Status |
|---------|-------------|--------|
| **Global Model Caps** | Cluster-wide RPS limits per model | ✅ |
| **Burst Protection** | Multi-window support (5s, 1m, 1h) | ✅ |
| **Tenant Fairness** | Prevent single-tenant resource saturation | ✅ |
| **QoS Tiers** | Different policies for INTERNAL vs EXTERNAL | ✅ |

### 🔹 Operational Features

| Feature | Description | Status |
|---------|-------------|--------|
| **Hot Reload** | Configuration updates without restart | ✅ |
| **Metrics Export** | Prometheus/StatsD integration | ✅ |
| **Structured Logging** | Request-level decision logs | ✅ |
| **Graceful Degradation** | Configurable fail-open/closed policies | ✅ |

---

## 🏗️ Architecture

### System Architecture Overview

<div align="center">

```mermaid
graph TB
    subgraph "Client Layer"
        C1[Web Client]
        C2[Mobile App]
        C3[Partner API]
    end
    
    subgraph "Edge Layer"
        Gateway[API Gateway<br/>TLS Termination<br/>Basic Validation]
    end
    
    subgraph "Auth Layer"
        Auth[AuthN/Z Service<br/>Resolve: userId, tenantId,<br/>apiKeyId, clientType]
    end
    
    subgraph "Rate Limiter Service"
        RL1[Rate Limiter<br/>Node 1]
        RL2[Rate Limiter<br/>Node 2]
        RL3[Rate Limiter<br/>Node N]
    end
    
    subgraph "Storage Layer"
        Redis[(Redis Cluster<br/>Shared State<br/>ZSET per Key)]
    end
    
    subgraph "Routing Layer"
        Router[Model Router<br/>Request Routing]
    end
    
    subgraph "Inference Layer"
        GPU1[GPU Pool 1<br/>Model: GPT-4]
        GPU2[GPU Pool 2<br/>Model: GPT-3.5]
        GPU3[GPU Pool N<br/>Model: Custom]
    end
    
    C1 --> Gateway
    C2 --> Gateway
    C3 --> Gateway
    
    Gateway --> Auth
    Auth --> RL1
    Auth --> RL2
    Auth --> RL3
    
    RL1 --> Redis
    RL2 --> Redis
    RL3 --> Redis
    
    RL1 -->|Allow| Router
    RL2 -->|Allow| Router
    RL3 -->|Allow| Router
    
    Router --> GPU1
    Router --> GPU2
    Router --> GPU3
    
    style Gateway fill:#fff4e1
    style Auth fill:#ffe1f5
    style RL1 fill:#e1f5ff
    style RL2 fill:#e1f5ff
    style RL3 fill:#e1f5ff
    style Redis fill:#ff6b6b,color:#fff
    style Router fill:#d4edda
    style GPU1 fill:#f0f0f0
    style GPU2 fill:#f0f0f0
    style GPU3 fill:#f0f0f0
```

</div>

### Request Flow Sequence

<div align="center">

```mermaid
sequenceDiagram
    participant C as Client
    participant GW as API Gateway
    participant Auth as AuthN/Z
    participant RL as Rate Limiter
    participant R as Redis Cluster
    participant MR as Model Router
    participant MS as Model Server
    
    C->>GW: HTTP/gRPC Request
    GW->>GW: TLS Termination
    GW->>Auth: Authenticate Request
    Auth->>Auth: Resolve userId, tenantId,<br/>apiKeyId, clientType
    Auth->>RL: allow(userId, tenantId, ...)
    
    RL->>RL: Resolve Rate Rules<br/>(Hierarchy Lookup)
    RL->>R: Execute Lua Script<br/>(Sliding Window Check)
    R->>R: ZREMRANGEBYSCORE<br/>(Remove old entries)
    R->>R: ZCARD<br/>(Count current)
    R->>R: Compare with limit
    R-->>RL: Allow (1) or Deny (0)
    
    alt Request Allowed
        RL-->>GW: {allowed: true, remaining: 45}
        GW->>MR: Route to Model Router
        MR->>MS: Forward to Model Server
        MS-->>MR: Inference Result
        MR-->>GW: Response
        GW-->>C: HTTP 200 + Result
    else Request Denied
        RL-->>GW: {allowed: false, reason: "HIT_LIMIT"}
        GW-->>C: HTTP 429 Too Many Requests
    end
```

</div>

---

## 💡 Core Concepts

### Problem Statement & Interface

We need a **distributed rate limiter** for AI model serving that enforces a **Sliding Window Log** policy.

#### Core API Interface

```typescript
// Core interface
bool allow(
  userId: string,
  modelId: string,
  apiKey?: string,
  tenantId?: string,
  modelTier?: string,
  clientType?: string
)
```

**Returns:** `true` if the request is allowed, `false` if rejected.

#### Exposed Endpoints

**REST API:**
```http
POST /rate-limit/allow
Content-Type: application/json

{
  "userId": "u123",
  "modelId": "gpt4",
  "apiKey": "k789",
  "tenantId": "t456",
  "modelTier": "PREMIUM",
  "clientType": "EXTERNAL"
}
```

**gRPC:**
```protobuf
rpc Allow(AllowRequest) returns (AllowResponse)
```

#### Base Rule

**Default:** 100 requests / hour / (userId, modelId) pair

### Rate Limiting Dimensions

The system supports multiple dimensions for rate limiting:

<div align="center">

```mermaid
mindmap
  root((Rate Limit<br/>Dimensions))
    User
      userId
      Per User Limits
    Tenant
      tenantId
      Tenant-wide Limits
      Org-level Caps
    API Key
      apiKeyId
      Per-Key Limits
    Model
      modelId
      Model-specific Limits
      Global Model Caps
    Tier
      PREMIUM
      STANDARD
      INTERNAL
    Client Type
      EXTERNAL
      INTERNAL
      PARTNER
```

</div>

---

## ⚙️ Configuration Model

### Rule Resolution Hierarchy

Rate limits are resolved using a **most-specific to most-generic** hierarchy:

<div align="center">

```mermaid
graph TD
    Start[Incoming Request] --> Check1{API Key +<br/>Model Rule?}
    Check1 -->|Yes| Rule1[API_KEY_MODEL<br/>Highest Priority]
    Check1 -->|No| Check2{Tenant + Tier<br/>Rule?}
    
    Check2 -->|Yes| Rule2[TENANT_MODEL_TIER]
    Check2 -->|No| Check3{Tenant Global<br/>Rule?}
    
    Check3 -->|Yes| Rule3[TENANT_GLOBAL]
    Check3 -->|No| Check4{User + Model<br/>Rule?}
    
    Check4 -->|Yes| Rule4[USER_MODEL]
    Check4 -->|No| Default[System Default<br/>100 req/hour]
    
    Rule1 --> Final[Effective Limit]
    Rule2 --> Final
    Rule3 --> Final
    Rule4 --> Final
    Default --> Final
    
    style Rule1 fill:#4CAF50,color:#fff
    style Rule2 fill:#2196F3,color:#fff
    style Rule3 fill:#FF9800,color:#fff
    style Rule4 fill:#9C27B0,color:#fff
    style Default fill:#757575,color:#fff
```

</div>

### Configuration Table

| Scope | Key Pattern | Window | Default Limit | Example |
|-------|------------|--------|---------------|---------|
| **API_KEY_MODEL** | `apiKey=K1, modelId=GPT4` | 1h | - | 200 req/hour |
| **TENANT_MODEL_TIER** | `tenant=T1, tier=PREMIUM` | 1h | - | 5000 req/hour |
| **TENANT_GLOBAL** | `tenant=T2` | 1h | - | 1000 req/hour |
| **USER_MODEL** | `userId=U1, modelId=GPT4` | 1h | 100 | 100 req/hour |
| **GLOBAL_MODEL** | `modelId=GPT4` | 1h | - | 10000 req/hour |

### Multi-Scope Enforcement

The system enforces **all applicable scopes simultaneously**. All checks must pass for a request to be allowed:

<div align="center">

```mermaid
graph LR
    Request[Incoming Request] --> Scope1[USER_MODEL<br/>Limit: 100/h]
    Request --> Scope2[TENANT_TIER<br/>Limit: 5000/h]
    Request --> Scope3[GLOBAL_MODEL<br/>Limit: 10000/h]
    
    Scope1 --> Check1{Count < 100?}
    Scope2 --> Check2{Count < 5000?}
    Scope3 --> Check3{Count < 10000?}
    
    Check1 -->|Yes| Pass1[✓]
    Check1 -->|No| Fail[✗ BLOCKED]
    
    Check2 -->|Yes| Pass2[✓]
    Check2 -->|No| Fail
    
    Check3 -->|Yes| Pass3[✓]
    Check3 -->|No| Fail
    
    Pass1 --> Final{All Pass?}
    Pass2 --> Final
    Pass3 --> Final
    
    Final -->|Yes| Allow[✅ ALLOWED]
    Final -->|No| Fail
    
    style Allow fill:#4CAF50,color:#fff
    style Fail fill:#f44336,color:#fff
```

</div>

---

## 🔄 Rate Limiting Algorithm

### Sliding Window Log Implementation

The system uses **Redis Sorted Sets (ZSET)** to maintain a log of timestamps per rate-limit key.

#### Redis Key Structure

```
rl:{tenantId}:{scope}:{userId}:{apiKeyId}:{clientType}:{modelTier}:{modelId}
```

**Example:**
```
rl:t123:scope:user_model:user:u456:key:k789:client:EXTERNAL:tier:PREMIUM:model:gpt4
```

#### Algorithm Flow

<div align="center">

```mermaid
flowchart TD
    Start[Request Arrives] --> GetTime[Get Current Time<br/>now = currentTimeMillis]
    GetTime --> CalcWindow[Calculate Window Start<br/>windowStart = now - WINDOW_MS]
    CalcWindow --> ResolveKey[Resolve Rate Limit Key<br/>from request dimensions]
    ResolveKey --> LuaScript[Execute Lua Script<br/>on Redis]
    
    LuaScript --> Step1[1. Remove Old Entries<br/>ZREMRANGEBYSCORE<br/>key 0 windowStart]
    Step1 --> Step2[2. Count Current Entries<br/>ZCARD key]
    Step2 --> Compare{Count >=<br/>Limit?}
    
    Compare -->|Yes| Block[Block Request<br/>Return 0]
    Compare -->|No| Step3[3. Add New Entry<br/>ZADD key now member]
    Step3 --> Step4[4. Set TTL<br/>EXPIRE key ttlSeconds]
    Step4 --> Allow[Allow Request<br/>Return 1]
    
    Block --> End[Return Denied]
    Allow --> End
    
    style Block fill:#f44336,color:#fff
    style Allow fill:#4CAF50,color:#fff
    style LuaScript fill:#FF9800,color:#fff
```

</div>

### Lua Script Implementation

```lua
-- KEYS[1] = rate limit key
-- ARGV[1] = windowStart (timestamp in ms)
-- ARGV[2] = now (timestamp in ms)
-- ARGV[3] = limit (max requests)
-- ARGV[4] = ttlSeconds (expiration time)
-- ARGV[5] = member (unique identifier: timestamp:random)

-- Remove entries outside the window
redis.call('ZREMRANGEBYSCORE', KEYS[1], 0, ARGV[1])

-- Count current entries in window
local current = redis.call('ZCARD', KEYS[1])

-- Check if limit exceeded
if current >= tonumber(ARGV[3]) then
  return 0  -- Blocked
end

-- Add new entry
redis.call('ZADD', KEYS[1], ARGV[2], ARGV[5])

-- Set expiration
redis.call('EXPIRE', KEYS[1], ARGV[4])

return 1  -- Allowed
```

### Multi-Scope Atomic Check

For requests that must check multiple scopes, all checks are performed atomically:

<div align="center">

```mermaid
sequenceDiagram
    participant RL as Rate Limiter
    participant L as Lua Script
    participant R as Redis
    
    RL->>L: Execute Multi-Scope Script<br/>Keys: [key1, key2, key3]
    L->>R: For Each Key:<br/>ZREMRANGEBYSCORE
    R-->>L: Old entries removed
    L->>R: For Each Key:<br/>ZCARD
    R-->>L: Counts: [55, 203, 8900]
    L->>L: Check All Limits<br/>55 < 100? ✓<br/>203 < 5000? ✓<br/>8900 < 10000? ✓
    alt All Pass
        L->>R: ZADD for all keys
        L->>R: EXPIRE for all keys
        L-->>RL: Return 1 (Allowed)
    else Any Fail
        L-->>RL: Return 0 (Blocked)<br/>No entries added
    end
```

</div>

---

## 🚀 Getting Started

### Prerequisites

- **Redis Cluster** (v6.0+) or Redis with clustering support
- **Node.js** 18+ / **Python** 3.9+ / **Go** 1.20+ (depending on implementation)
- **NTP** synchronized clocks across all nodes

### Quick Start

```bash
# Clone the repository
git clone https://github.com/yourorg/ai-inference-rate-limiter.git
cd ai-inference-rate-limiter

# Install dependencies
npm install  # or pip install -r requirements.txt

# Configure Redis connection
export REDIS_URL="redis://localhost:6379"
export REDIS_CLUSTER_MODE=true

# Start the service
npm start  # or python -m ratelimiter or go run main.go
```

### Configuration Example

```yaml
# config.yaml
redis:
  cluster_mode: true
  endpoints:
    - redis-node-1:6379
    - redis-node-2:6379
    - redis-node-3:6379
  timeout_ms: 20

rate_limits:
  default:
    limit: 100
    window_ms: 3600000  # 1 hour
  
  scopes:
    - type: API_KEY_MODEL
      limit: 200
      window_ms: 3600000
    
    - type: TENANT_MODEL_TIER
      limit: 5000
      window_ms: 3600000
      tier: PREMIUM
```

---

## 📡 API Reference

### REST API

#### Check Rate Limit

```http
POST /rate-limit/allow
Content-Type: application/json

{
  "userId": "user123",
  "modelId": "gpt4",
  "apiKey": "ak_1234567890",
  "tenantId": "tenant_abc",
  "modelTier": "PREMIUM",
  "clientType": "EXTERNAL"
}
```

**Response (Allowed):**
```json
{
  "allowed": true,
  "remaining": 45,
  "resetAt": "2025-12-03T16:00:00Z",
  "effectiveLimit": 100,
  "scopes": [
    {
      "name": "USER_MODEL",
      "limit": 100,
      "current": 55,
      "remaining": 45
    }
  ]
}
```

**Response (Denied):**
```json
{
  "allowed": false,
  "reason": "HIT_TENANT_TIER_MODEL_LIMIT",
  "scopeHit": "TENANT_MODEL_TIER",
  "resetAt": "2025-12-03T16:47:32Z",
  "scopes": [
    {
      "name": "TENANT_MODEL_TIER",
      "limit": 5000,
      "current": 5000,
      "remaining": 0
    }
  ]
}
```

### gRPC API

```protobuf
service RateLimiterService {
  rpc Allow(AllowRequest) returns (AllowResponse);
}

message AllowRequest {
  string userId = 1;
  string modelId = 2;
  optional string apiKey = 3;
  optional string tenantId = 4;
  optional string modelTier = 5;
  optional string clientType = 6;
}

message AllowResponse {
  bool allowed = 1;
  int32 remaining = 2;
  string resetAt = 3;
  string scopeHit = 4;
  repeated ScopeStatus scopes = 5;
}
```

---

## 🏭 Deployment Patterns

### Pattern 1: Sidecar Deployment

<div align="center">

```mermaid
graph TB
    subgraph "Gateway Pod"
        Gateway[API Gateway<br/>Envoy/NGINX]
        Sidecar[Rate Limiter<br/>Sidecar<br/>localhost:8080]
    end
    
    subgraph "Storage"
        Redis[(Redis Cluster)]
    end
    
    Client -->|HTTP/gRPC| Gateway
    Gateway -->|localhost RPC| Sidecar
    Sidecar --> Redis
    
    Gateway -->|If Allowed| Backend[Model Router]
    
    style Gateway fill:#fff4e1
    style Sidecar fill:#e1f5ff
    style Redis fill:#ff6b6b,color:#fff
```

**Pros:**
- ✅ Low latency (localhost communication)
- ✅ Simple network topology
- ✅ Scales with gateway pods

**Cons:**
- ❌ More complex deployment (sidecar per pod)
- ❌ Resource overhead

</div>

### Pattern 2: Centralized Service

<div align="center">

```mermaid
graph TB
    subgraph "Client Layer"
        Gateway[API Gateway]
    end
    
    subgraph "Rate Limiter Cluster"
        RL1[Rate Limiter<br/>Node 1]
        RL2[Rate Limiter<br/>Node 2]
        RL3[Rate Limiter<br/>Node N]
    end
    
    subgraph "Storage"
        Redis[(Redis Cluster)]
    end
    
    Gateway -->|gRPC/HTTP| RL1
    Gateway -->|gRPC/HTTP| RL2
    Gateway -->|gRPC/HTTP| RL3
    
    RL1 --> Redis
    RL2 --> Redis
    RL3 --> Redis
    
    Gateway -->|If Allowed| Backend[Model Router]
    
    style Gateway fill:#fff4e1
    style RL1 fill:#e1f5ff
    style RL2 fill:#e1f5ff
    style RL3 fill:#e1f5ff
    style Redis fill:#ff6b6b,color:#fff
```

**Pros:**
- ✅ Single deployment to manage
- ✅ Easy versioning and rollouts
- ✅ Better resource utilization

**Cons:**
- ❌ Extra network hop (still sub-ms in same VPC)

</div>

---

## 📊 Monitoring & Observability

### Metrics Dashboard Overview

<div align="center">

```mermaid
graph TB
    subgraph "Metrics Collection"
        Prom[Prometheus<br/>Metrics Scraper]
    end
    
    subgraph "Rate Limiter Service"
        RL[Rate Limiter Nodes]
        Metrics[Exported Metrics]
    end
    
    subgraph "Monitoring Stack"
        Grafana[Grafana<br/>Dashboards]
        AlertMgr[AlertManager]
    end
    
    RL --> Metrics
    Metrics --> Prom
    Prom --> Grafana
    Prom --> AlertMgr
    
    style Prom fill:#E6522C,color:#fff
    style Grafana fill:#F46800,color:#fff
    style AlertMgr fill:#FF6B6B,color:#fff
```

</div>

### Key Metrics

#### Request Metrics

| Metric | Type | Description | Labels |
|--------|------|-------------|--------|
| `rate_limiter_requests_total` | Counter | Total allow/deny decisions | `result`, `scope`, `model_id`, `tenant_id` |
| `rate_limiter_latency_seconds` | Histogram | Allow() operation latency | `operation` |
| `rate_limiter_usage_ratio` | Gauge | Current usage / limit ratio | `scope`, `model_id`, `tenant_id` |

#### Redis Metrics

| Metric | Type | Description | Labels |
|--------|------|-------------|--------|
| `rate_limiter_redis_errors_total` | Counter | Redis operation errors | `type`, `operation` |
| `rate_limiter_redis_latency_seconds` | Histogram | Redis operation latency | `operation` |
| `rate_limiter_redis_calls_total` | Counter | Total Redis calls | `operation` |

#### System Health Metrics

| Metric | Type | Description | Labels |
|--------|------|-------------|--------|
| `rate_limiter_config_version` | Gauge | Current config version | `source` |
| `rate_limiter_fallback_total` | Counter | Fallback mode activations | `mode` |
| `rate_limiter_config_load_failures_total` | Counter | Config reload failures | - |

### Sample Dashboard Panels

<div align="center">

```mermaid
graph LR
    subgraph "Dashboard Panels"
        P1[Allowed vs Blocked<br/>Requests Over Time]
        P2[P95/P99 Latency<br/>of allow Operation]
        P3[Top N Tenants<br/>by Consumption]
        P4[Block Rate<br/>by Tenant/Model]
        P5[Redis Health<br/>CPU/Memory/Ops]
    end
    
    style P1 fill:#4CAF50,color:#fff
    style P2 fill:#2196F3,color:#fff
    style P3 fill:#FF9800,color:#fff
    style P4 fill:#f44336,color:#fff
    style P5 fill:#9C27B0,color:#fff
```

</div>

### Structured Logging Example

```json
{
  "timestamp": "2025-12-03T15:00:01Z",
  "level": "INFO",
  "requestId": "req-uuid-1234",
  "userId": "u123",
  "tenantId": "t1",
  "apiKeyId": "k1",
  "modelId": "gpt4",
  "modelTier": "PREMIUM",
  "clientType": "EXTERNAL",
  "scopes": [
    {
      "name": "USER_MODEL",
      "limit": 100,
      "count": 55,
      "remaining": 45
    },
    {
      "name": "TENANT_TIER_MODEL",
      "limit": 5000,
      "count": 203,
      "remaining": 4797
    }
  ],
  "allowed": true,
  "remaining": 45,
  "windowResetAt": "2025-12-03T15:47:32Z",
  "latencyMs": 3.2
}
```

### Alert Rules

<div align="center">

```mermaid
flowchart TD
    Alert1[High Block Rate<br/>> 5% for 5 min] --> Action1[Page On-Call]
    Alert2[Redis Timeouts<br/>> 0.5% error rate] --> Action2[Page On-Call]
    Alert3[High Latency<br/>P95 > 20ms] --> Action3[Warning]
    Alert4[Config Reload Failures<br/>No reload in > 10 min] --> Action4[Warning]
    Alert5[Excessive Fallback<br/>Fail-open activations] --> Action5[Page On-Call]
    
    style Alert1 fill:#f44336,color:#fff
    style Alert2 fill:#f44336,color:#fff
    style Alert3 fill:#FF9800,color:#fff
    style Alert4 fill:#FF9800,color:#fff
    style Alert5 fill:#f44336,color:#fff
```

</div>

---

## 🔄 Evolution Path

### From In-Memory to Distributed

This section outlines the evolution from a simple in-memory implementation to a production-ready distributed system.

<div align="center">

```mermaid
gantt
    title Evolution Roadmap
    dateFormat  YYYY-MM-DD
    section Phase 1
    In-Memory Implementation     :done, phase1, 2025-01-01, 7d
    Interface Abstraction        :done, phase2, 2025-01-08, 3d
    section Phase 2
    Redis Backend                :active, phase3, 2025-01-11, 5d
    Clock Skew Handling          :phase4, 2025-01-16, 2d
    Retry & Fallback             :phase5, 2025-01-18, 3d
    section Phase 3
    Gateway Integration          :phase6, 2025-01-21, 4d
    Monitoring & Alerts          :phase7, 2025-01-25, 5d
    Production Hardening         :phase8, 2025-01-30, 7d
```

</div>

### Step-by-Step Evolution

#### Step 1: Abstract Storage Layer

<div align="center">

```mermaid
classDiagram
    class SlidingWindowStore {
        <<interface>>
        +pruneAndCount(key, windowStartMs) int
        +tryAdd(key, nowMs, limit, windowMs) bool
    }
    
    class InMemorySlidingWindowStore {
        -state: ConcurrentMap~String, TreeSet~Long~~
        +pruneAndCount() int
        +tryAdd() bool
    }
    
    class RedisSlidingWindowStore {
        -redis: RedisClient
        -scriptSha: String
        +pruneAndCount() int
        +tryAdd() bool
    }
    
    class RateLimiter {
        -store: SlidingWindowStore
        -config: Config
        +allow(request) AllowDecision
    }
    
    SlidingWindowStore <|.. InMemorySlidingWindowStore
    SlidingWindowStore <|.. RedisSlidingWindowStore
    RateLimiter --> SlidingWindowStore
    
    note for InMemorySlidingWindowStore "Phase 1:<br/>Single-process<br/>Development/Testing"
    note for RedisSlidingWindowStore "Phase 2:<br/>Distributed<br/>Production"
```

</div>

#### Step 2: Introduce Redis Backend

```typescript
// Pseudo-code evolution

// Phase 1: In-Memory
class InMemoryStore implements SlidingWindowStore {
  private state = new Map<string, SortedSet<number>>();
  
  tryAdd(key: string, nowMs: number, limit: number): boolean {
    const windowStart = nowMs - WINDOW_MS;
    const set = this.state.get(key) || new SortedSet();
    
    // Prune old entries
    while (set.size > 0 && set.first() < windowStart) {
      set.removeFirst();
    }
    
    if (set.size >= limit) return false;
    set.add(nowMs);
    return true;
  }
}

// Phase 2: Redis-backed
class RedisStore implements SlidingWindowStore {
  constructor(private redis: RedisClient) {
    this.scriptSha = redis.scriptLoad(SLIDING_WINDOW_LUA);
  }
  
  tryAdd(key: string, nowMs: number, limit: number): boolean {
    const result = redis.evalSha(
      this.scriptSha,
      [key],
      [windowStart, nowMs, limit, ttl, member]
    );
    return result === 1;
  }
}
```

#### Step 3: Handle Clock Skew

<div align="center">

```mermaid
sequenceDiagram
    participant RL as Rate Limiter Node 1
    participant R2 as Rate Limiter Node 2
    participant Redis as Redis Server
    
    Note over RL,Redis: Problem: Clock Skew
    RL->>RL: Local Time: 10:00:00.100
    R2->>R2: Local Time: 10:00:00.050
    Redis->>Redis: Server Time: 10:00:00.075
    
    Note over RL,Redis: Solution: Use Redis TIME
    
    RL->>Redis: TIME command
    Redis-->>RL: {seconds, microseconds}
    RL->>Redis: Use Redis time in Lua script
    R2->>Redis: TIME command
    Redis-->>R2: {seconds, microseconds}
    R2->>Redis: Use Redis time in Lua script
    
    Note over RL,Redis: All nodes use same<br/>authoritative time source
```

</div>

#### Step 4: Retry & Failure Handling

<div align="center">

```mermaid
flowchart TD
    Start[Redis Call] --> Try1[Attempt 1<br/>Timeout: 20ms]
    Try1 --> Success{Success?}
    
    Success -->|Yes| Done[Return Result]
    Success -->|No| Retry{Retryable?}
    
    Retry -->|Yes| Wait[Wait with Jitter<br/>5-10ms]
    Wait --> Try2[Attempt 2<br/>Timeout: 20ms]
    Try2 --> Success2{Success?}
    
    Success2 -->|Yes| Done
    Success2 -->|No| Policy{Client Type?}
    
    Policy -->|EXTERNAL| FailClosed[Fail-Closed<br/>Block Request]
    Policy -->|INTERNAL| FailOpen[Fail-Open<br/>or Local Fallback]
    
    FailClosed --> Metrics[Record Metrics]
    FailOpen --> Metrics
    Metrics --> End
    
    style Success fill:#4CAF50,color:#fff
    style Success2 fill:#4CAF50,color:#fff
    style FailClosed fill:#f44336,color:#fff
    style FailOpen fill:#FF9800,color:#fff
```

</div>

---

## 🎓 Advanced Topics

### Multi-Window Protection

For comprehensive protection, multiple time windows can be enforced simultaneously:

<div align="center">

```mermaid
graph TB
    Request[Incoming Request] --> Win5s[5 Second Window<br/>Burst Control]
    Request --> Win1m[1 Minute Window<br/>Short-term Load]
    Request --> Win1h[1 Hour Window<br/>Fairness & Billing]
    
    Win5s --> Check5s{Count < Limit?}
    Win1m --> Check1m{Count < Limit?}
    Win1h --> Check1h{Count < Limit?}
    
    Check5s -->|Yes| Pass5s[✓]
    Check5s -->|No| Block[BLOCKED<br/>Burst Exceeded]
    
    Check1m -->|Yes| Pass1m[✓]
    Check1m -->|No| Block
    
    Check1h -->|Yes| Pass1h[✓]
    Check1h -->|No| Block
    
    Pass5s --> Final{All Pass?}
    Pass1m --> Final
    Pass1h --> Final
    
    Final -->|Yes| Allow[✅ ALLOWED]
    Final -->|No| Block
    
    style Win5s fill:#E91E63,color:#fff
    style Win1m fill:#2196F3,color:#fff
    style Win1h fill:#4CAF50,color:#fff
    style Allow fill:#4CAF50,color:#fff
    style Block fill:#f44336,color:#fff
```

</div>

### QoS Tiers: Internal vs External

<div align="center">

```mermaid
graph LR
    subgraph "Client Types"
        Internal[🔵 INTERNAL<br/>Higher Limits<br/>Fail-Open Policy]
        External[🔴 EXTERNAL<br/>Stricter Limits<br/>Fail-Closed Policy]
        Partner[🟡 PARTNER<br/>Medium Limits<br/>Fail-Closed Policy]
    end
    
    subgraph "Rate Limits Example"
        I1[INTERNAL: 1000/h]
        E1[EXTERNAL: 100/h]
        P1[PARTNER: 500/h]
    end
    
    Internal --> I1
    External --> E1
    Partner --> P1
    
    style Internal fill:#2196F3,color:#fff
    style External fill:#f44336,color:#fff
    style Partner fill:#FF9800,color:#fff
```

</div>

### Cost/Token-Aware Limits (Future Extension)

<div align="center">

```mermaid
graph TB
    Request[Incoming Request] --> RL[Request Count<br/>Rate Limiter]
    Request --> CL[Cost/Token<br/>Rate Limiter]
    
    RL --> Check1{Request Count<br/>< Limit?}
    CL --> Check2{Token Cost<br/>< Limit?}
    
    Check1 -->|Yes| Pass1[✓]
    Check1 -->|No| Block1[BLOCKED<br/>Request Limit]
    
    Check2 -->|Yes| Pass2[✓]
    Check2 -->|No| Block2[BLOCKED<br/>Cost Limit]
    
    Pass1 --> Final{All Pass?}
    Pass2 --> Final
    
    Final -->|Yes| Allow[✅ ALLOWED]
    Final -->|No| Block[BLOCKED]
    
    style RL fill:#4CAF50,color:#fff
    style CL fill:#2196F3,color:#fff
    style Allow fill:#4CAF50,color:#fff
    style Block fill:#f44336,color:#fff
    
    note1[Future Extension:<br/>Track tokens/$spend<br/>in sliding window]
    note1 -.-> CL
```

</div>

---

## 📝 Summary

This AI Inference Rate Limiter provides:

- ✅ **Accurate Rate Limiting** - Sliding Window Log algorithm for precise control
- ✅ **Multi-Dimensional** - User, tenant, API key, model, tier, and client type
- ✅ **Distributed & Scalable** - Stateless nodes with Redis-backed shared state
- ✅ **Production-Ready** - Comprehensive monitoring, alerts, and graceful degradation
- ✅ **AI-Optimized** - GPU pool protection, global caps, multi-window support

### Quick Reference

| Aspect | Implementation |
|--------|----------------|
| **Algorithm** | Sliding Window Log |
| **Storage** | Redis Sorted Sets (ZSET) |
| **Atomicity** | Lua scripts for atomic operations |
| **Scalability** | Stateless nodes, Redis Cluster |
| **Latency** | Single Redis round-trip |
| **Accuracy** | Time-based, not bucket-based |

---

<div align="center">

**Built with ❤️ for AI Inference Workloads**

[Documentation](#) • [API Reference](#api-reference) • [Contributing](#) • [License](#)

</div>
