/**
 * Route Aggregator
 *
 * Combines all route modules
 */

import { Router } from 'express';
import { LLMFactory } from '../../src/services/llm/index.js';
import ticketRoutes from './tickets.js';

const router = Router();

/**
 * Health check
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    availableProviders: LLMFactory.getAvailableProviders(),
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
