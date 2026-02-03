/**
 * Ticket Routes
 *
 * All /api/tickets/* endpoints
 */

import { Router, Request, Response, NextFunction } from 'express';
import { TicketService } from '../../src/services/ticket/TicketService';
import {
  GenerateTicketRequest,
  RefineTicketRequest,
  GenerateTitleRequest,
  RefinementStyle,
} from '../../src/types/ticket';
import { getProvider } from '../helpers/provider';

const router = Router();
const ticketService = new TicketService();

/**
 * Generate a ticket
 */
router.post('/generate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { input, provider: providerName } = req.body as GenerateTicketRequest;

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
router.post('/refine', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { currentTicket, style, provider: providerName } = req.body as RefineTicketRequest;

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
router.post('/regenerate', async (req: Request, res: Response, next: NextFunction) => {
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
router.post('/title', async (req: Request, res: Response, next: NextFunction) => {
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

export default router;
