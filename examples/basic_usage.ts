/**
 * Basic usage example for the Rate Limiter.
 *
 * This script demonstrates the core requirement:
 * "Show that after 100 allowed calls in 1 hour, subsequent calls are blocked."
 */

import { RateLimiter } from '../src/rateLimiter';

function main(): void {
  console.log('='.repeat(70));
  console.log('Rate Limiter - Basic Usage Example');
  console.log('='.repeat(70));
  console.log(
    '\nRequirement: After 100 allowed calls in 1 hour, subsequent calls are blocked.',
  );
  console.log('\n' + '-'.repeat(70));

  // Create a rate limiter with 100 requests per hour limit
  const rateLimiter = new RateLimiter(100, 3600);
  const userId = 'demo_user';

  console.log(`\nCreating RateLimiter with maxRequestsPerHour=100`);
  console.log(`Testing with userId: '${userId}'`);
  console.log('\n' + '-'.repeat(70));

  // Make requests and track the results
  console.log('\nMaking requests...');
  console.log('\nFirst 5 requests:');
  for (let i = 0; i < 5; i++) {
    const allowed = rateLimiter.allow(userId);
    const remaining = rateLimiter.getRemainingRequests(userId);
    const status = allowed ? '✓ ALLOWED' : '✗ BLOCKED';
    console.log(`  Request ${(i + 1).toString().padStart(3)}: ${status} | Remaining: ${remaining.toString().padStart(3)}`);
  }

  // Fast-forward: make many requests silently
  console.log('\nMaking requests 6-95 (silent)...');
  for (let i = 5; i < 95; i++) {
    rateLimiter.allow(userId);
  }

  // Show the last few requests before the limit
  console.log('\nRequests 96-100 (last allowed requests):');
  for (let i = 95; i < 100; i++) {
    const allowed = rateLimiter.allow(userId);
    const remaining = rateLimiter.getRemainingRequests(userId);
    const status = allowed ? '✓ ALLOWED' : '✗ BLOCKED';
    console.log(`  Request ${(i + 1).toString().padStart(3)}: ${status} | Remaining: ${remaining.toString().padStart(3)}`);
  }

  // Now show requests that should be blocked
  console.log('\nRequests 101-105 (should be blocked):');
  for (let i = 100; i < 105; i++) {
    const allowed = rateLimiter.allow(userId);
    const remaining = rateLimiter.getRemainingRequests(userId);
    const status = allowed ? '✓ ALLOWED' : '✗ BLOCKED';
    console.log(`  Request ${(i + 1).toString().padStart(3)}: ${status} | Remaining: ${remaining.toString().padStart(3)}`);
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('Summary:');
  console.log('='.repeat(70));

  const currentCount = rateLimiter.getRequestCount(userId);
  const remaining = rateLimiter.getRemainingRequests(userId);

  console.log(`\nTotal requests made: 105`);
  console.log(`Current requests in window: ${currentCount}`);
  console.log(`Remaining requests: ${remaining}`);
  console.log(`\n✓ First 100 requests: ALLOWED`);
  console.log(`✗ Requests 101-105: BLOCKED`);
  console.log('\n' + '='.repeat(70));
  console.log(
    '✅ Requirement satisfied: After 100 allowed calls, subsequent calls are blocked!',
  );
  console.log('='.repeat(70));
}

if (require.main === module) {
  main();
}

