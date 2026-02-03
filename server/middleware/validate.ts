/**
 * Validation Middleware
 *
 * Validates request bodies against Zod schemas.
 * Returns structured error responses for invalid requests.
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError, ZodIssue } from 'zod';
import { logger } from '../lib/logger.js';

/**
 * Creates validation middleware for a given Zod schema
 */
export function validate<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Parse and validate the request body
      const validated = schema.parse(req.body);

      // Replace body with validated/transformed data
      req.body = validated;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.issues.map((issue: ZodIssue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }));

        logger.warn({ errors, body: req.body }, 'Validation failed');

        return res.status(400).json({
          error: 'Validation failed',
          details: errors,
        });
      }

      // Unexpected error
      logger.error({ error }, 'Unexpected validation error');
      next(error);
    }
  };
}
