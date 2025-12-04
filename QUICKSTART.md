# Quick Start Guide

## Exercise 1, Phase 2 - TypeScript/Express.js Implementation

This is a quick guide to get started with the rate limiter implementation.

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

## Installation

```bash
# Install dependencies
npm install
```

## Running the Implementation

### 1. Development Mode (with hot reload)

```bash
npm run dev
```

Server will start on `http://localhost:3000`

## Testing

This project uses Jest as the testing framework. The test suite includes comprehensive unit tests for the rate limiter functionality.

### Running Tests

#### Run All Tests

```bash
npm test
```

This command runs all test files in the `tests/` directory and displays the results.

#### Run Tests in Watch Mode

```bash
npm run test:watch
```

Watch mode automatically re-runs tests when you make changes to your code or test files. This is useful during development for immediate feedback.

#### Run Tests with Coverage Report

```bash
npm run test:coverage
```

This command runs all tests and generates a detailed coverage report showing:
- **Statement coverage**: Percentage of code statements executed
- **Branch coverage**: Percentage of code branches (if/else, switch) executed
- **Function coverage**: Percentage of functions called
- **Line coverage**: Percentage of lines executed

The coverage report is generated in the `coverage/` directory. You can open `coverage/lcov-report/index.html` in your browser to view an interactive coverage report.

### Test Coverage Output

When you run `npm run test:coverage`, you'll see output similar to:

```
-------------------|---------|----------|---------|---------|-------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-------------------|---------|----------|---------|---------|-------------------
All files          |   95.45 |    90.00 |   100.00 |   95.45 |
 rateLimiter.ts    |   95.45 |    90.00 |   100.00 |   95.45 | 45,67
-------------------|---------|----------|---------|---------|-------------------
```

### Viewing Coverage Reports

After running the coverage command, you can view the detailed HTML report:

```bash
# On macOS
open coverage/lcov-report/index.html

# On Linux
xdg-open coverage/lcov-report/index.html

# On Windows
start coverage/lcov-report/index.html
```

### Test Files

The test suite is located in the `tests/` directory:
- `tests/rateLimiter.test.ts` - Comprehensive tests for the RateLimiter class

### 2. Run Usage Example

```bash
# Demonstrates 100 requests/hour requirement
npm run example
```

Expected output:
```
Request   1: ✓ ALLOWED | Remaining:  99
Request   2: ✓ ALLOWED | Remaining:  98
...
Request 100: ✓ ALLOWED | Remaining:   0
Request 101: ✗ BLOCKED | Remaining:   0
...
✅ Requirement satisfied: After 100 allowed calls, subsequent calls are blocked!
```

## API Endpoints

Once the server is running, you can test the API:

### Check Rate Limit

```bash
curl -X POST http://localhost:3000/rate-limit/allow \
  -H "Content-Type: application/json" \
  -d '{"userId": "user123"}'
```

Response (allowed):
```json
{
  "allowed": true,
  "userId": "user123",
  "remaining": 99,
  "currentCount": 1,
  "limit": 100,
  "message": "Request allowed"
}
```

Response (blocked):
```json
{
  "allowed": false,
  "userId": "user123",
  "remaining": 0,
  "currentCount": 100,
  "limit": 100,
  "message": "Rate limit exceeded"
}
```

### Get Stats

```bash
curl http://localhost:3000/rate-limit/stats/user123
```

### Reset User

```bash
curl -X DELETE http://localhost:3000/rate-limit/reset/user123
```

## Testing the API

Run the API test script:

```bash
# Make sure server is running first
npm run dev

# In another terminal
ts-node examples/api_test.ts
```

## Project Structure

```
├── src/
│   ├── rateLimiter.ts          # Core RateLimiter class
│   ├── routes/
│   │   └── rateLimitRoutes.ts  # Express.js routes
│   └── index.ts                # Server entry point
├── tests/
│   └── rateLimiter.test.ts     # Test suite
├── examples/
│   ├── basic_usage.ts          # Basic usage example
│   └── api_test.ts             # API testing example
└── docs/
    └── EVOLUTION_TO_DISTRIBUTED.md  # Evolution guide
```

## Key Files

- **`src/rateLimiter.ts`** - Core implementation of Sliding Window Log algorithm
- **`tests/rateLimiter.test.ts`** - Comprehensive test suite
- **`examples/basic_usage.ts`** - Demonstrates the 100 requests/hour requirement
- **`docs/EVOLUTION_TO_DISTRIBUTED.md`** - Bonus: How to evolve to distributed design

## Requirements Met

✅ Single-node, in-memory rate limiter  
✅ Sliding Window Log algorithm  
✅ Clear, readable TypeScript code  
✅ Test demonstrating 100 requests/hour limit  
✅ Bonus: Evolution to distributed design documented

## Next Steps

1. Review the implementation in `src/rateLimiter.ts`
2. Run the tests: `npm test`
3. Try the usage example: `npm run example`
4. Read the evolution guide: `docs/EVOLUTION_TO_DISTRIBUTED.md`


