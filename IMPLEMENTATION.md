# Exercise 1, Phase 2: Implementation

## Overview

This is the **TypeScript/Express.js/Node.js** implementation of the in-memory Sliding Window Log rate limiter as specified in Exercise 1, Phase 2.

## Requirements Met

✅ **Single-node, in-memory rate limiter**  
✅ **Sliding Window Log algorithm implementation**  
✅ **Clear, readable TypeScript code**  
✅ **Simple and correct implementation**  
✅ **Test demonstrating 100 requests/hour limit**  
✅ **Bonus: Evolution to distributed design documented**

## Project Structure

```
ai-inference-rate-limiter/
├── src/
│   ├── rateLimiter.ts          # Core RateLimiter class
│   ├── routes/
│   │   └── rateLimitRoutes.ts  # Express.js API routes
│   └── index.ts                # Express.js server entry point
├── tests/
│   └── rateLimiter.test.ts     # Comprehensive test suite
├── examples/
│   └── basic_usage.ts          # Usage example
├── docs/
│   └── EVOLUTION_TO_DISTRIBUTED.md  # Bonus: Evolution guide
├── package.json
├── tsconfig.json
└── jest.config.js
```

## Core Implementation

### RateLimiter Class

The `RateLimiter` class implements the Sliding Window Log algorithm:

```typescript
class RateLimiter {
  constructor(maxRequestsPerHour: number, windowSizeSeconds: number = 3600)
  allow(userId: string): boolean
  getRemainingRequests(userId: string): number
  getRequestCount(userId: string): number
  getStats(userId: string): RateLimitStats
  resetUser(userId: string): void
}
```

**Key Features:**
- Maintains a sorted log of timestamps per user
- Automatically prunes old entries outside the sliding window
- Thread-safe (single-threaded Node.js, but designed for async operations)
- Efficient O(n) pruning where n is number of expired entries

### API Endpoints

**POST `/rate-limit/allow`**
```json
Request: { "userId": "user123" }
Response: {
  "allowed": true,
  "userId": "user123",
  "remaining": 99,
  "currentCount": 1,
  "limit": 100
}
```

**GET `/rate-limit/stats/:userId`**
```json
Response: {
  "userId": "user123",
  "currentCount": 45,
  "remaining": 55,
  "limit": 100,
  "windowSizeSeconds": 3600
}
```

**DELETE `/rate-limit/reset/:userId`**
```json
Response: {
  "message": "Rate limit reset for user: user123",
  "userId": "user123"
}
```

## Running the Implementation

### Installation

```bash
npm install
```

### Development

```bash
# Start development server with hot reload
npm run dev

# Server runs on http://localhost:3000
```

### Production

```bash
# Build TypeScript to JavaScript
npm run build

# Start production server
npm start
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Run Usage Example

```bash
npm run example
```

This demonstrates the core requirement: **After 100 allowed calls in 1 hour, subsequent calls are blocked.**

## Test Results

The test suite verifies:

1. ✅ Initial requests within limit are allowed
2. ✅ Requests after limit are blocked
3. ✅ Sliding window correctly expires old requests
4. ✅ Different users have independent rate limits
5. ✅ Remaining requests count is accurate
6. ✅ Request count is accurate
7. ✅ **Usage example: 100 requests/hour requirement**

Example output:
```
Request   1: ALLOWED | Remaining: 99
Request   2: ALLOWED | Remaining: 98
...
Request 100: ALLOWED | Remaining: 0
Request 101: BLOCKED | Remaining: 0
Request 102: BLOCKED | Remaining: 0
...
Summary:
  Total requests: 105
  Allowed: 100
  Blocked: 5

✅ Test passed: Rate limiter correctly blocks requests after 100 calls
```

## API Testing

### Using curl

```bash
# Check if request is allowed
curl -X POST http://localhost:3000/rate-limit/allow \
  -H "Content-Type: application/json" \
  -d '{"userId": "user123"}'

# Get stats for a user
curl http://localhost:3000/rate-limit/stats/user123

# Reset a user's rate limit
curl -X DELETE http://localhost:3000/rate-limit/reset/user123
```

### Example Script

```bash
# Make 105 requests to demonstrate the limit
for i in {1..105}; do
  curl -X POST http://localhost:3000/rate-limit/allow \
    -H "Content-Type: application/json" \
    -d "{\"userId\": \"test_user\"}" \
    -w "\nRequest $i: %{http_code}\n"
done
```

## Key Implementation Details

### Sliding Window Log Algorithm

1. **Store timestamps**: Each user has a sorted list of request timestamps
2. **Prune old entries**: On each request, remove timestamps outside the window
3. **Count and compare**: Count remaining timestamps and compare with limit
4. **Allow or block**: If under limit, add current timestamp and allow; otherwise block

### Time Handling

- Uses `Date.now() / 1000` for seconds-based timestamps
- Maintains sorted order for efficient pruning
- Window size defaults to 3600 seconds (1 hour)

### Memory Management

- Old timestamps are automatically removed (pruning)
- Memory usage is bounded by `maxRequestsPerHour` per user
- Map-based storage for efficient user lookups

## Evolution to Distributed Design

See [docs/EVOLUTION_TO_DISTRIBUTED.md](./docs/EVOLUTION_TO_DISTRIBUTED.md) for detailed documentation on:

- Abstracting storage layer
- Introducing Redis backend
- Handling clock skew
- Retry and failure handling
- API Gateway integration
- Multi-scope support

## Notes

- This is a **single-threaded, in-memory** implementation for Exercise 1, Phase 2
- For production use, see the evolution guide for distributed implementation
- The Express.js server provides REST API endpoints for testing
- All code is in TypeScript for type safety and better developer experience

