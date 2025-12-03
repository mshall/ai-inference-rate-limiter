/**
 * Tests for the in-memory Sliding Window Log Rate Limiter.
 *
 * These tests demonstrate that:
 * 1. Users can make requests up to the limit
 * 2. Requests beyond the limit are blocked
 * 3. The sliding window correctly expires old requests
 * 4. Different users have independent rate limits
 */

import { RateLimiter } from '../src/rateLimiter';

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter(100, 3600); // 100 requests per hour
  });

  describe('Initial requests within limit', () => {
    it('should allow initial requests within the limit', () => {
      const userId = 'user123';

      // First 100 requests should be allowed
      for (let i = 0; i < 100; i++) {
        const result = rateLimiter.allow(userId);
        expect(result).toBe(true);
      }

      // Check remaining requests
      const remaining = rateLimiter.getRemainingRequests(userId);
      expect(remaining).toBe(0);
    });
  });

  describe('Request blocking after limit', () => {
    it('should block requests after reaching the limit', () => {
      const userId = 'user123';

      // Make 100 requests (all should be allowed)
      for (let i = 0; i < 100; i++) {
        expect(rateLimiter.allow(userId)).toBe(true);
      }

      // 101st request should be blocked
      expect(rateLimiter.allow(userId)).toBe(false);

      // Subsequent requests should also be blocked
      for (let i = 0; i < 5; i++) {
        expect(rateLimiter.allow(userId)).toBe(false);
      }
    });
  });

  describe('Sliding window expiration', () => {
    it('should allow new requests after window expires', (done) => {
      const userId = 'user123';
      // Use a short window for testing (2 seconds)
      const shortWindowLimiter = new RateLimiter(10, 2);

      // Make 10 requests (all should be allowed)
      for (let i = 0; i < 10; i++) {
        expect(shortWindowLimiter.allow(userId)).toBe(true);
      }

      // 11th request should be blocked
      expect(shortWindowLimiter.allow(userId)).toBe(false);

      // Wait for window to slide (wait 3 seconds)
      setTimeout(() => {
        // Now requests should be allowed again (old requests expired)
        const result = shortWindowLimiter.allow(userId);
        expect(result).toBe(true);
        done();
      }, 3000);
    }, 5000); // Increase timeout for async test
  });

  describe('Independent user limits', () => {
    it('should maintain independent rate limits for different users', () => {
      const user1 = 'user1';
      const user2 = 'user2';

      // User 1 makes 100 requests
      for (let i = 0; i < 100; i++) {
        expect(rateLimiter.allow(user1)).toBe(true);
      }

      // User 1 should be blocked
      expect(rateLimiter.allow(user1)).toBe(false);

      // User 2 should still be able to make requests
      for (let i = 0; i < 100; i++) {
        expect(rateLimiter.allow(user2)).toBe(true);
      }

      // User 2 should now be blocked
      expect(rateLimiter.allow(user2)).toBe(false);
    });
  });

  describe('Remaining requests count', () => {
    it('should accurately track remaining requests', () => {
      const userId = 'user123';

      // Initially, 100 requests should remain
      expect(rateLimiter.getRemainingRequests(userId)).toBe(100);

      // Make 45 requests
      for (let i = 0; i < 45; i++) {
        rateLimiter.allow(userId);
      }

      // 55 requests should remain
      expect(rateLimiter.getRemainingRequests(userId)).toBe(55);

      // Make 55 more requests (total 100)
      for (let i = 0; i < 55; i++) {
        rateLimiter.allow(userId);
      }

      // 0 requests should remain
      expect(rateLimiter.getRemainingRequests(userId)).toBe(0);
    });
  });

  describe('Request count accuracy', () => {
    it('should accurately track request count', () => {
      const userId = 'user123';

      // Initially, count should be 0
      expect(rateLimiter.getRequestCount(userId)).toBe(0);

      // Make 50 requests
      for (let i = 0; i < 50; i++) {
        rateLimiter.allow(userId);
      }

      // Count should be 50
      expect(rateLimiter.getRequestCount(userId)).toBe(50);

      // Make 50 more requests
      for (let i = 0; i < 50; i++) {
        rateLimiter.allow(userId);
      }

      // Count should be 100
      expect(rateLimiter.getRequestCount(userId)).toBe(100);
    });
  });

  describe('Usage Example: 100 requests per hour requirement', () => {
    it('should demonstrate that after 100 allowed calls, subsequent calls are blocked', () => {
      // Create a rate limiter with default 100 requests per hour
      const limiter = new RateLimiter(100, 3600);
      const userId = 'example_user';

      console.log('\n=== Rate Limiter Usage Example ===');
      console.log(`Testing rate limit: 100 requests per hour for user '${userId}'\n`);

      // Make requests and track results
      let allowedCount = 0;
      let blockedCount = 0;

      // Make 105 requests (5 more than the limit)
      for (let i = 0; i < 105; i++) {
        const isAllowed = limiter.allow(userId);
        if (isAllowed) {
          allowedCount++;
        } else {
          blockedCount++;
        }

        if (i < 5 || i >= 98) {
          const status = isAllowed ? 'ALLOWED' : 'BLOCKED';
          const remaining = limiter.getRemainingRequests(userId);
          console.log(`Request ${i + 1}: ${status.padEnd(7)} | Remaining: ${remaining}`);
        }
      }

      console.log(`\nSummary:`);
      console.log(`  Total requests: 105`);
      console.log(`  Allowed: ${allowedCount}`);
      console.log(`  Blocked: ${blockedCount}`);

      // Verify the expected behavior
      expect(allowedCount).toBe(100);
      expect(blockedCount).toBe(5);

      // Verify 101st request is blocked
      expect(limiter.allow(userId)).toBe(false);

      console.log('\n✅ Test passed: Rate limiter correctly blocks requests after 100 calls\n');
    });
  });

  describe('Stats retrieval', () => {
    it('should return accurate statistics', () => {
      const userId = 'user123';

      // Initially
      let stats = rateLimiter.getStats(userId);
      expect(stats.currentCount).toBe(0);
      expect(stats.remaining).toBe(100);
      expect(stats.limit).toBe(100);
      expect(stats.windowSizeSeconds).toBe(3600);

      // After making 30 requests
      for (let i = 0; i < 30; i++) {
        rateLimiter.allow(userId);
      }

      stats = rateLimiter.getStats(userId);
      expect(stats.currentCount).toBe(30);
      expect(stats.remaining).toBe(70);
      expect(stats.limit).toBe(100);
    });
  });

  describe('User reset functionality', () => {
    it('should reset user rate limit', () => {
      const userId = 'user123';

      // Make 50 requests
      for (let i = 0; i < 50; i++) {
        rateLimiter.allow(userId);
      }

      expect(rateLimiter.getRequestCount(userId)).toBe(50);

      // Reset user
      rateLimiter.resetUser(userId);

      // Count should be 0
      expect(rateLimiter.getRequestCount(userId)).toBe(0);
      expect(rateLimiter.getRemainingRequests(userId)).toBe(100);
    });
  });
});

