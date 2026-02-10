/**
 * Request Validation Schemas
 *
 * Uses Zod for runtime type checking and validation.
 * Prevents invalid data from reaching the LLM providers.
 */

import { z } from 'zod';
import { LLM_PROVIDERS } from '../../src/services/llm/LLMProvider.js';

// Constants for validation
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_TITLE_LENGTH = 100;
const MAX_LABEL_LENGTH = 50;
const MAX_LABELS = 10;

// Valid provider names (derived from LLM_PROVIDERS source of truth)
const providerValues = Object.values(LLM_PROVIDERS) as [string, ...string[]];
export const providerSchema = z.enum(providerValues);

// Valid ticket types
export const ticketTypeSchema = z.enum(['Task', 'Story', 'Bug', 'Spike', 'Epic']);

// Valid priorities
export const prioritySchema = z.enum(['Low', 'Medium', 'High', 'Critical']);

// Valid refinement styles
export const refinementStyleSchema = z.enum([
  'concise',
  'detailed',
  'technical',
  'business',
  'user-story',
  'acceptance',
]);

// Ticket input schema
export const ticketInputSchema = z.object({
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(MAX_DESCRIPTION_LENGTH, `Description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters`)
    .transform(s => s.trim()),
  title: z
    .string()
    .max(MAX_TITLE_LENGTH, `Title cannot exceed ${MAX_TITLE_LENGTH} characters`)
    .optional()
    .transform(s => s?.trim()),
  type: ticketTypeSchema.optional(),
  priority: prioritySchema.optional(),
  labels: z
    .array(z.string().max(MAX_LABEL_LENGTH))
    .max(MAX_LABELS, `Cannot have more than ${MAX_LABELS} labels`)
    .optional()
    .default([]),
  template: z.enum(['Basic', 'Detailed']).optional().default('Basic'),
  writingStyle: refinementStyleSchema.optional(),
});

// Generate ticket request
export const generateTicketSchema = z.object({
  input: ticketInputSchema,
  provider: providerSchema.optional(),
});

// Refine ticket request
export const refineTicketSchema = z.object({
  currentTicket: z
    .string()
    .min(1, 'Current ticket content is required')
    .max(10000, 'Ticket content too long'),
  style: refinementStyleSchema,
  provider: providerSchema.optional(),
});

// Regenerate ticket request
export const regenerateTicketSchema = z.object({
  currentTicket: z
    .string()
    .min(1, 'Current ticket content is required')
    .max(10000, 'Ticket content too long'),
  provider: providerSchema.optional(),
});

// Generate title request
export const generateTitleSchema = z.object({
  description: z
    .string()
    .min(20, 'Description must be at least 20 characters for title generation')
    .max(MAX_DESCRIPTION_LENGTH),
  provider: providerSchema.optional(),
});

// Export types inferred from schemas
export type GenerateTicketInput = z.infer<typeof generateTicketSchema>;
export type RefineTicketInput = z.infer<typeof refineTicketSchema>;
export type RegenerateTicketInput = z.infer<typeof regenerateTicketSchema>;
export type GenerateTitleInput = z.infer<typeof generateTitleSchema>;
