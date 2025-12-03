/**
 * Main Express.js application entry point
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import rateLimitRoutes from './routes/rateLimitRoutes';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'AI Inference Rate Limiter',
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use('/rate-limit', rateLimitRoutes);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    service: 'AI Inference Rate Limiter',
    version: '1.0.0',
    description: 'In-memory Sliding Window Log rate limiter for AI inference requests',
    endpoints: {
      health: 'GET /health',
      allow: 'POST /rate-limit/allow',
      stats: 'GET /rate-limit/stats/:userId',
      reset: 'DELETE /rate-limit/reset/:userId',
    },
  });
});

// Start server
app.listen(PORT, () => {
  console.log('='.repeat(70));
  console.log('🚀 AI Inference Rate Limiter Service');
  console.log('='.repeat(70));
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`📋 API docs: http://localhost:${PORT}/`);
  console.log('='.repeat(70));
});

export default app;

