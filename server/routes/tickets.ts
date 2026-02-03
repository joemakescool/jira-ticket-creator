/**
 * Ticket Routes
 *
 * All /api/tickets/* endpoints
 * Now with Zod validation middleware
 */

import { Router, Request, Response, NextFunction } from 'express';
import { TicketService } from '../../src/services/ticket/TicketService.js';
import { getProvider } from '../helpers/provider.js';
import { validate } from '../middleware/validate.js';
import { ticketLogger as logger } from '../lib/logger.js';
import {
  generateTicketSchema,
  refineTicketSchema,
  regenerateTicketSchema,
  generateTitleSchema,
  GenerateTicketInput,
  RefineTicketInput,
  RegenerateTicketInput,
  GenerateTitleInput,
} from '../validation/schemas.js';

const router = Router();
const ticketService = new TicketService();

/**
 * Generate a ticket
 */
router.post(
  '/generate',
  validate(generateTicketSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    try {
      const { input, provider: providerName } = req.body as GenerateTicketInput;

      logger.info({ provider: providerName, type: input.type }, 'Generating ticket');

      const provider = getProvider(providerName);
      const ticket = await ticketService.generateTicket(input, provider);

      const duration = Date.now() - startTime;
      logger.info({ provider: providerName, duration }, 'Ticket generated successfully');

      res.json({
        success: true,
        data: ticket,
      });
    } catch (error) {
      logger.error({ error, duration: Date.now() - startTime }, 'Ticket generation failed');
      next(error);
    }
  }
);

/**
 * Refine an existing ticket
 */
router.post(
  '/refine',
  validate(refineTicketSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    try {
      const { currentTicket, style, provider: providerName } = req.body as RefineTicketInput;

      logger.info({ provider: providerName, style }, 'Refining ticket');

      const provider = getProvider(providerName);
      const refined = await ticketService.refineTicket(currentTicket, style, provider);

      const duration = Date.now() - startTime;
      logger.info({ provider: providerName, style, duration }, 'Ticket refined successfully');

      res.json({
        success: true,
        data: { content: refined },
      });
    } catch (error) {
      logger.error({ error, duration: Date.now() - startTime }, 'Ticket refinement failed');
      next(error);
    }
  }
);

/**
 * Regenerate a ticket (after edits)
 */
router.post(
  '/regenerate',
  validate(regenerateTicketSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    try {
      const { currentTicket, provider: providerName } = req.body as RegenerateTicketInput;

      logger.info({ provider: providerName }, 'Regenerating ticket');

      const provider = getProvider(providerName);
      const regenerated = await ticketService.regenerateTicket(currentTicket, provider);

      const duration = Date.now() - startTime;
      logger.info({ provider: providerName, duration }, 'Ticket regenerated successfully');

      res.json({
        success: true,
        data: { content: regenerated },
      });
    } catch (error) {
      logger.error({ error, duration: Date.now() - startTime }, 'Ticket regeneration failed');
      next(error);
    }
  }
);

/**
 * Generate a title from description
 */
router.post(
  '/title',
  validate(generateTitleSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    try {
      const { description, provider: providerName } = req.body as GenerateTitleInput;

      logger.debug({ provider: providerName }, 'Generating title');

      const provider = getProvider(providerName);
      const title = await ticketService.generateTitle(description, provider);

      const duration = Date.now() - startTime;
      logger.debug({ provider: providerName, duration }, 'Title generated');

      res.json({
        success: true,
        data: { title },
      });
    } catch (error) {
      logger.error({ error, duration: Date.now() - startTime }, 'Title generation failed');
      next(error);
    }
  }
);

export default router;
