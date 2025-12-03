# Evolution from In-Memory to Distributed Design

This document describes how to evolve the in-memory Rate Limiter implementation into a distributed, production-ready system as described in Phase 1.

## Overview

The current implementation is a single-node, in-memory rate limiter. To make it production-ready for distributed AI inference systems, we need to:

1. Introduce a shared storage backend (Redis)
2. Handle clock skew and distributed time synchronization
3. Implement retry logic and failure handling
4. Integrate with API Gateway or sidecar for model serving

## Step-by-Step Evolution

### Step 1: Abstract the Storage Layer

First, we introduce an interface to abstract storage operations:

```typescript
interface SlidingWindowStore {
  // Remove events outside window and return current count of remaining events
  pruneAndCount(key: string, windowStartMs: number): Promise<number>;
  
  // Add a new event at time `nowMs` if below limit, and return whether it's allowed
  tryAdd(key: string, nowMs: number, limit: number, windowMs: number): Promise<boolean>;
}
```

Then, define a high-level RateLimiter that depends on this interface:

```typescript
class RateLimiter {
  constructor(
    private store: SlidingWindowStore,
    private config: Config
  ) {}

  async allow(request: Request): Promise<AllowDecision> {
    const now = Date.now();
    const rule = this.config.resolveRule(request);
    const windowStart = now - rule.windowMs;

    for (const scope of rule.scopes) {
      const key = scope.composeKey(request);
      const allowed = await this.store.tryAdd(key, now, scope.limit, scope.windowMs);
      
      if (!allowed) {
        return this.decisionBlocked(scope, rule, now);
      }
    }

    return this.decisionAllowed(rule, now);
  }
}
```

### Step 2: Introduce Redis-Backed Store

Implement `RedisSlidingWindowStore` using Redis Sorted Sets (ZSET) and Lua scripts for atomic operations:

```typescript
class RedisSlidingWindowStore implements SlidingWindowStore {
  private redis: RedisClient;
  private scriptSha: string;

  constructor(redis: RedisClient) {
    this.redis = redis;
    this.scriptSha = redis.scriptLoad(SLIDING_WINDOW_LUA);
  }

  async tryAdd(key: string, nowMs: number, limit: number, windowMs: number): Promise<boolean> {
    const windowStart = nowMs - windowMs;
    const ttlSeconds = Math.ceil((windowMs * 2) / 1000);
    const member = `${nowMs}:${Math.random().toString(36).substring(7)}`;

    const result = await this.redis.evalSha(
      this.scriptSha,
      [key],
      [windowStart, nowMs, limit, ttlSeconds, member]
    );

    return result === 1;
  }
}
```

**Lua Script for Atomic Operations:**

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

**Key Benefits:**
- Atomic operations ensure consistency across concurrent requests
- Single round-trip to Redis for each rate limit check
- Automatic expiration of old entries via TTL

### Step 3: Handle Clock Skew

In a distributed setup, rate-limiter nodes and Redis have separate clocks. To handle clock skew:

**Option 1: Use Redis Server Time**

Prefer using Redis server time for scoring events:

```lua
local nowParts = redis.call('TIME')  -- returns {seconds, microseconds}
local nowMs = nowParts[1] * 1000 + math.floor(nowParts[2] / 1000)
local windowStart = nowMs - tonumber(ARGV[1])  -- ARGV[1] = windowMs
```

This ensures all rate limiter instances use the same logical clock.

**Option 2: Enforce NTP Sync**

- Ensure all nodes have NTP synchronization (skew < few ms)
- Accept minor skew; sliding window logic is tolerant
- Guard against extreme skew (log error if > 5 minutes difference)

### Step 4: Retry & Failure Handling

Implement retry logic with configurable fallback policies:

```typescript
class RateLimiterService {
  async allowWithRetry(request: Request): Promise<AllowDecision> {
    const maxRetries = 2;
    const timeout = 20; // ms

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await Promise.race([
          this.store.tryAdd(key, now, limit, windowMs),
          this.timeout(timeout)
        ]);
        return result;
      } catch (error) {
        if (attempt === maxRetries) {
          return this.handleFailure(request, error);
        }
        await this.delay(5 + Math.random() * 5); // Jitter
      }
    }
  }

  private handleFailure(request: Request, error: Error): AllowDecision {
    this.metrics.increment('redis_errors');
    
    // Fail-closed for external clients (default)
    if (request.clientType === 'EXTERNAL') {
      return {
        allowed: false,
        reason: 'RATE_LIMITER_UNHEALTHY'
      };
    }
    
    // Fail-open or local fallback for internal clients
    if (request.clientType === 'INTERNAL') {
      const allowed = this.localFallbackLimiter.allow(request);
      return {
        allowed,
        reason: allowed ? 'FALLBACK_FAIL_OPEN' : 'LOCAL_FALLBACK_LIMIT'
      };
    }
    
    return { allowed: false, reason: 'ERROR' };
  }
}
```

**Local Fallback Limiter:**
- Simple token bucket or fixed window per process
- Very conservative limits to avoid abuse during outage
- Only used when Redis is unavailable

### Step 5: Integration with API Gateway

**Option A: Rate Limiter as Sidecar**

```
[Envoy/NGINX] <-- localhost --> [Rate Limiter Sidecar] --> Redis
```

The gateway calls allow() over localhost (HTTP/gRPC):

```typescript
// Express.js middleware example
app.use(async (req, res, next) => {
  const userId = req.headers['x-user-id'];
  const modelId = req.query.modelId;
  
  const decision = await rateLimiterService.allow({
    userId,
    modelId,
    tenantId: req.headers['x-tenant-id'],
    clientType: req.headers['x-client-type']
  });
  
  if (!decision.allowed) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      reason: decision.reason,
      resetAt: decision.resetAt
    });
  }
  
  next();
});
```

**Option B: Centralized Rate Limiter Service**

```
Client --> API Gateway --> Rate Limiter Service (cluster) --> Redis --> Model Router
```

Gateway calls centralized service via HTTP/gRPC before routing requests.

### Step 6: Multi-Scope Support

For requests that must check multiple scopes atomically:

```typescript
class MultiScopeRateLimiter {
  async allow(request: Request): Promise<AllowDecision> {
    const scopes = this.resolveScopes(request);
    const keys = scopes.map(scope => scope.composeKey(request));
    
    // Execute multi-key Lua script atomically
    const result = await this.redis.eval(MULTI_SCOPE_LUA, keys, [
      ...scopes.flatMap(s => [s.windowStart, s.limit, s.windowMs])
    ]);
    
    return result.allowed ? this.decisionAllowed() : this.decisionBlocked(result.scopeHit);
  }
}
```

**Multi-Scope Lua Script:**
- Checks all keys sequentially
- Returns early if any limit is exceeded
- Only adds entries if all checks pass

## Configuration Examples

### Redis Configuration

```typescript
const redisConfig = {
  cluster: {
    nodes: [
      { host: 'redis-node-1', port: 6379 },
      { host: 'redis-node-2', port: 6379 },
      { host: 'redis-node-3', port: 6379 }
    ]
  },
  options: {
    retryStrategy: (times: number) => Math.min(times * 50, 2000),
    maxRetriesPerRequest: 3
  }
};
```

### Rate Limit Rules

```typescript
const rateLimitRules = {
  default: {
    limit: 100,
    windowMs: 3600000 // 1 hour
  },
  scopes: [
    {
      type: 'API_KEY_MODEL',
      limit: 200,
      windowMs: 3600000
    },
    {
      type: 'TENANT_MODEL_TIER',
      limit: 5000,
      windowMs: 3600000,
      tier: 'PREMIUM'
    }
  ]
};
```

## Monitoring & Observability

### Key Metrics

- `rate_limiter_requests_total{result="allowed|blocked", scope="..."}`
- `rate_limiter_latency_seconds{operation="allow"}`
- `rate_limiter_redis_errors_total{type="timeout|connection|..."}`
- `rate_limiter_usage_ratio{scope, ...}` (currentCount / limit)

### Structured Logging

```typescript
logger.info('Rate limit decision', {
  requestId: req.id,
  userId,
  modelId,
  allowed: decision.allowed,
  scopes: decision.scopes.map(s => ({
    name: s.name,
    limit: s.limit,
    count: s.count,
    remaining: s.remaining
  })),
  latencyMs: Date.now() - startTime
});
```

## Summary

The evolution path:

1. ✅ **Abstract Storage Layer** - Create interface for storage operations
2. ✅ **Redis Backend** - Implement Redis-backed store with Lua scripts
3. ✅ **Clock Skew Handling** - Use Redis TIME or enforce NTP sync
4. ✅ **Retry & Fallback** - Implement retry logic with fail-open/closed policies
5. ✅ **Gateway Integration** - Add middleware or sidecar pattern
6. ✅ **Multi-Scope Support** - Atomic multi-key checks
7. ✅ **Monitoring** - Metrics, logs, and alerting

This transforms the simple in-memory implementation into a production-ready, distributed rate limiting service for AI inference workloads.

