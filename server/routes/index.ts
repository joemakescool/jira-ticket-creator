/**
 * Route Aggregator
 *
 * Combines all route modules
 */

import { Router } from 'express';
import { LLMFactory } from '../services/llm/index.js';
import ticketRoutes from './tickets.js';

const router = Router();

/**
 * Health check — returns server status, uptime, and configured providers
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    providers: LLMFactory.getAvailableProviders(),
    defaultProvider: process.env.DEFAULT_LLM_PROVIDER || 'ollama',
    timestamp: new Date().toISOString(),
  });
});

/**
 * List available providers
 */
router.get('/providers', (req, res) => {
  const providers = LLMFactory.getAvailableProviders();
  res.json({
    providers,
    default: process.env.DEFAULT_LLM_PROVIDER || 'claude',
  });
});

// Mount ticket routes
router.use('/tickets', ticketRoutes);

export default router;
