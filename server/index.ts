/**
 * Backend API Server
 *
 * Handles:
 * - Server configuration and middleware
 * - Error handling
 * - Server startup
 *
 * Routes are defined in ./routes/
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import routes from './routes/index.js';
import { LLMFactory } from '../src/services/llm/index.js';
import { serverLogger as logger } from './lib/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config();

const app = express();
const PORT = process.env.PORT || 3001;
const isDev = process.env.NODE_ENV !== 'production';

// --- Middleware ---

// Security headers (relaxed for API usage)
app.use(
  helmet({
    contentSecurityPolicy: false, // APIs don't serve HTML
    crossOriginEmbedderPolicy: false,
  })
);

// CORS configuration
const corsOrigin = process.env.CORS_ORIGIN || (isDev ? 'http://localhost:3000' : undefined);
if (!corsOrigin && !isDev) {
  logger.warn('CORS_ORIGIN not set in production - CORS will be restrictive');
}
app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  })
);

// Request parsing with size limits
app.use(express.json({ limit: '10kb' }));

// Request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info(
      {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration,
      },
      'Request completed'
    );
  });
  next();
});

// --- Rate limiting ---
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// --- Routes ---

app.use('/api', routes);

// --- Static Files (Production) ---

if (!isDev) {
  // In production, __dirname is dist/server/server, so go up two levels to dist/client
  const clientPath = path.join(__dirname, '../../client');

  // Serve static files from the built frontend
  app.use(express.static(clientPath));

  // SPA fallback: serve index.html for all non-API routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientPath, 'index.html'));
  });
}

// --- Error Handling ---

// 404 handler (only for API routes in production, all routes in dev)
app.use((req, res) => {
  logger.debug({ path: req.path, method: req.method }, 'Route not found');
  res.status(404).json({ error: 'Not found' });
});

// Custom error class for API errors
class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Global error handler
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  // Handle known API errors
  if (err instanceof ApiError) {
    logger.warn({ error: err, path: req.path }, 'API error');
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
    });
  }

  // Handle standard errors
  const error = err instanceof Error ? err : new Error(String(err));

  // Log the full error server-side
  logger.error(
    {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      path: req.path,
      method: req.method,
    },
    'Unhandled error'
  );

  // Don't leak error details in production
  res.status(500).json({
    error: isDev ? error.message : 'Internal server error',
    ...(isDev && { stack: error.stack }),
  });
});

// --- Start Server ---

app.listen(PORT, () => {
  const providers = LLMFactory.getAvailableProviders();

  logger.info(
    {
      port: PORT,
      env: process.env.NODE_ENV || 'development',
      providers: providers.length > 0 ? providers : ['none configured'],
    },
    'Server started'
  );
});

export { ApiError };
export default app;
