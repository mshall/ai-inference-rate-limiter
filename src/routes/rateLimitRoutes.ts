/**
 * Express.js routes for the rate limiter API
 */

import { Router, Request, Response } from 'express';
import { RateLimiter } from '../rateLimiter';

const router = Router();

// Create a single rate limiter instance (in-memory, shared across requests)
const rateLimiter = new RateLimiter(100, 3600); // 100 requests per hour

/**
 * POST /rate-limit/allow
 * Check if a request should be allowed based on rate limiting rules
 *
 * Request body:
 * {
 *   "userId": "string" (required)
 * }
 *
 * Response:
 * {
 *   "allowed": boolean,
 *   "userId": string,
 *   "remaining": number,
 *   "currentCount": number,
 *   "limit": number
 * }
 */
router.post('/allow', (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    // Validate userId
    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'userId is required and must be a string',
      });
    }

    // Check if request is allowed
    const allowed = rateLimiter.allow(userId);
    const stats = rateLimiter.getStats(userId);

    if (allowed) {
      res.status(200).json({
        allowed: true,
        userId,
        remaining: stats.remaining,
        currentCount: stats.currentCount,
        limit: stats.limit,
        message: 'Request allowed',
      });
    } else {
      res.status(429).json({
        allowed: false,
        userId,
        remaining: stats.remaining,
        currentCount: stats.currentCount,
        limit: stats.limit,
        message: 'Rate limit exceeded',
      });
    }
  } catch (error) {
    console.error('Error in /allow endpoint:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while checking rate limit',
    });
  }
});

/**
 * GET /rate-limit/stats/:userId
 * Get current rate limit statistics for a user
 *
 * Response:
 * {
 *   "userId": string,
 *   "currentCount": number,
 *   "remaining": number,
 *   "limit": number,
 *   "windowSizeSeconds": number
 * }
 */
router.get('/stats/:userId', (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'userId parameter is required',
      });
    }

    const stats = rateLimiter.getStats(userId);

    res.status(200).json({
      userId,
      ...stats,
    });
  } catch (error) {
    console.error('Error in /stats endpoint:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while fetching stats',
    });
  }
});

/**
 * DELETE /rate-limit/reset/:userId
 * Reset rate limit for a specific user (useful for testing)
 */
router.delete('/reset/:userId', (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'userId parameter is required',
      });
    }

    rateLimiter.resetUser(userId);

    res.status(200).json({
      message: `Rate limit reset for user: ${userId}`,
      userId,
    });
  } catch (error) {
    console.error('Error in /reset endpoint:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while resetting rate limit',
    });
  }
});

export default router;

