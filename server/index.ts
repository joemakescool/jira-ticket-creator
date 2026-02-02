/**
 * Backend API Server
 * 
 * Why a backend?
 * - API keys stay secure (never exposed to browser)
 * - Rate limiting and caching
 * - Request validation and sanitization
 * - Logging and analytics
 * - Easy to add authentication later
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from 'dotenv';

import { LLMFactory, LLM_PROVIDERS, LLMProviderName } from '../src/services/llm';
import { TicketService } from '../src/services/ticket/TicketService';
import {
  GenerateTicketRequest,
  RefineTicketRequest,
  GenerateTitleRequest,
  RefinementStyle,
} from '../src/types/ticket';

// Load environment variables
config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10kb' })); // Body parser with size limit

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: { error: 'Too many requests, please try again later' },
});
app.use('/api/', limiter);

// Initialize services
const ticketService = new TicketService();

// Helper to get provider
function getProvider(providerName?: string) {
  const name = (providerName || process.env.DEFAULT_LLM_PROVIDER || 'claude') as LLMProviderName;
  
  // Validate provider name
  if (!Object.values(LLM_PROVIDERS).includes(name)) {
    throw new Error(`Invalid provider: ${name}`);
  }
  
  return LLMFactory.createFromEnv(name);
}

// --- API Routes ---

/**
 * Health check
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    availableProviders: LLMFactory.getAvailableProviders(),
    timestamp: new Date().toISOString(),
  });
});

/**
 * List available providers
 */
app.get('/api/providers', (req, res) => {
  const providers = LLMFactory.getAvailableProviders();
  res.json({
    providers,
    default: process.env.DEFAULT_LLM_PROVIDER || 'claude',
  });
});

/**
 * Generate a ticket
 */
app.post('/api/tickets/generate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { input, provider: providerName } = req.body as GenerateTicketRequest;
    
    // Validate input
    if (!input?.description) {
      return res.status(400).json({ error: 'Description is required' });
    }
    
    const provider = getProvider(providerName);
    const ticket = await ticketService.generateTicket(input, provider);
    
    res.json({
      success: true,
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Refine an existing ticket
 */
app.post('/api/tickets/refine', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { currentTicket, style, provider: providerName } = req.body as RefineTicketRequest;
    
    // Validate input
    if (!currentTicket) {
      return res.status(400).json({ error: 'Current ticket content is required' });
    }
    
    const validStyles: RefinementStyle[] = [
      'concise', 'detailed', 'technical', 'business', 'user-story', 'acceptance'
    ];
    if (!validStyles.includes(style)) {
      return res.status(400).json({ error: `Invalid style. Must be one of: ${validStyles.join(', ')}` });
    }
    
    const provider = getProvider(providerName);
    const refined = await ticketService.refineTicket(currentTicket, style, provider);
    
    res.json({
      success: true,
      data: { content: refined },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Regenerate a ticket (after edits)
 */
app.post('/api/tickets/regenerate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { currentTicket, provider: providerName } = req.body;
    
    if (!currentTicket) {
      return res.status(400).json({ error: 'Current ticket content is required' });
    }
    
    const provider = getProvider(providerName);
    const regenerated = await ticketService.regenerateTicket(currentTicket, provider);
    
    res.json({
      success: true,
      data: { content: regenerated },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Generate a title from description
 */
app.post('/api/tickets/title', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { description, provider: providerName } = req.body as GenerateTitleRequest;
    
    if (!description) {
      return res.status(400).json({ error: 'Description is required' });
    }
    
    const provider = getProvider(providerName);
    const title = await ticketService.generateTitle(description, provider);
    
    res.json({
      success: true,
      data: { title },
    });
  } catch (error) {
    next(error);
  }
});

// --- Error Handling ---

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('API Error:', err);
  
  // Don't leak error details in production
  const isDev = process.env.NODE_ENV === 'development';
  
  res.status(500).json({
    error: isDev ? err.message : 'Internal server error',
    ...(isDev && { stack: err.stack }),
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 JIRA Ticket Creator API running on port ${PORT}`);
  console.log(`📦 Available providers: ${LLMFactory.getAvailableProviders().join(', ') || 'None configured'}`);
});

export default app;
