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

import routes from './routes';
import { LLMFactory } from '../src/services/llm';

// Load environment variables
config();

const app = express();
const PORT = process.env.PORT || 3001;

// --- Middleware ---

app.use(helmet()); // Security headers
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10kb' }));

// --- Rate limiting ---
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests, please try again later' },
});
app.use('/api/', limiter);

// --- Routes ---

app.use('/api', routes);

// --- Error Handling ---

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('API Error:', err);

  const isDev = process.env.NODE_ENV === 'development';

  res.status(500).json({
    error: isDev ? err.message : 'Internal server error',
    ...(isDev && { stack: err.stack }),
  });
});

// --- Start Server ---

app.listen(PORT, () => {
  console.log(`🚀 JIRA Ticket Creator API running on port ${PORT}`);
  console.log(`📦 Available providers: ${LLMFactory.getAvailableProviders().join(', ') || 'None configured'}`);
});

export default app;
