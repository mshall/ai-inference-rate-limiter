/**
 * Exercise 1, Phase 2: In-Memory Sliding Window Log Rate Limiter
 *
 * This module implements a single-node, in-memory rate limiter using the
 * Sliding Window Log algorithm. It tracks timestamps for each user and
 * enforces rate limits based on requests per hour.
 */

/**
 * Interface for rate limiter statistics
 */
export interface RateLimitStats {
  currentCount: number;
  remaining: number;
  limit: number;
  windowSizeSeconds: number;
}

/**
 * In-memory rate limiter using Sliding Window Log algorithm.
 *
 * Maintains a log of request timestamps for each user. When checking
 * if a request is allowed, it removes timestamps outside the sliding
 * window and compares the count against the limit.
 */
export class RateLimiter {
  private userLogs: Map<string, number[]>;
  private readonly maxRequestsPerHour: number;
  private readonly windowSizeSeconds: number;

  /**
   * Initialize the rate limiter.
   *
   * @param maxRequestsPerHour - Maximum number of requests allowed per hour per user
   * @param windowSizeSeconds - Size of the sliding window in seconds (default: 3600 for 1 hour)
   */
  constructor(maxRequestsPerHour: number, windowSizeSeconds: number = 3600) {
    this.maxRequestsPerHour = maxRequestsPerHour;
    this.windowSizeSeconds = windowSizeSeconds;
    // Map to store timestamp logs for each user
    // Key: userId (string), Value: Array of timestamps (sorted)
    this.userLogs = new Map<string, number[]>();
  }

  /**
   * Check if a request from the given user should be allowed.
   *
   * Implements the Sliding Window Log algorithm:
   * 1. Get current timestamp
   * 2. Calculate window start time (current time - window size)
   * 3. Remove all timestamps outside the window (older than window start)
   * 4. Count remaining timestamps
   * 5. If count < limit, add current timestamp and return true
   * 6. Otherwise, return false
   *
   * @param userId - Unique identifier for the user making the request
   * @returns True if the request is allowed, False if rate limit is exceeded
   */
  allow(userId: string): boolean {
    const currentTime = Date.now() / 1000; // Convert to seconds for consistency
    const windowStart = currentTime - this.windowSizeSeconds;

    // Get the user's timestamp log (or create empty array if new user)
    let userLog = this.userLogs.get(userId);
    if (!userLog) {
      userLog = [];
      this.userLogs.set(userId, userLog);
    }

    // Remove timestamps outside the sliding window (pruning old entries)
    // Since we maintain sorted order, we can efficiently remove from the front
    while (userLog.length > 0 && userLog[0] <= windowStart) {
      userLog.shift();
    }

    // Check if we're under the limit
    if (userLog.length < this.maxRequestsPerHour) {
      // Add current request timestamp to the log
      userLog.push(currentTime);
      // Maintain sorted order (insertion at end is fine since timestamps are monotonic)
      return true;
    } else {
      // Rate limit exceeded
      return false;
    }
  }

  /**
   * Get the number of remaining requests allowed for a user in the current window.
   *
   * @param userId - Unique identifier for the user
   * @returns Number of remaining requests allowed before hitting the limit
   */
  getRemainingRequests(userId: string): number {
    const currentTime = Date.now() / 1000;
    const windowStart = currentTime - this.windowSizeSeconds;

    const userLog = this.userLogs.get(userId) || [];

    // Remove old timestamps
    const filteredLog = userLog.filter((timestamp) => timestamp > windowStart);

    const currentCount = filteredLog.length;
    const remaining = Math.max(0, this.maxRequestsPerHour - currentCount);
    return remaining;
  }

  /**
   * Get the current number of requests in the window for a user.
   *
   * @param userId - Unique identifier for the user
   * @returns Current number of requests in the sliding window
   */
  getRequestCount(userId: string): number {
    const currentTime = Date.now() / 1000;
    const windowStart = currentTime - this.windowSizeSeconds;

    const userLog = this.userLogs.get(userId) || [];

    // Remove old timestamps and return count
    const filteredLog = userLog.filter((timestamp) => timestamp > windowStart);
    return filteredLog.length;
  }

  /**
   * Get detailed statistics for a user's rate limit status.
   *
   * @param userId - Unique identifier for the user
   * @returns Rate limit statistics
   */
  getStats(userId: string): RateLimitStats {
    const currentCount = this.getRequestCount(userId);
    const remaining = this.getRemainingRequests(userId);

    return {
      currentCount,
      remaining,
      limit: this.maxRequestsPerHour,
      windowSizeSeconds: this.windowSizeSeconds,
    };
  }

  /**
   * Reset the rate limit log for a specific user (useful for testing).
   *
   * @param userId - Unique identifier for the user to reset
   */
  resetUser(userId: string): void {
    this.userLogs.delete(userId);
  }

  /**
   * Reset all users' rate limit logs (useful for testing).
   */
  resetAll(): void {
    this.userLogs.clear();
  }
}

