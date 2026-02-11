import { describe, it, expect } from 'vitest';
import {
  generateTicketSchema,
  refineTicketSchema,
  regenerateTicketSchema,
  generateTitleSchema,
  ticketInputSchema,
} from '../server/validation/schemas';

describe('ticketInputSchema', () => {
  it('accepts a valid minimal input', () => {
    const result = ticketInputSchema.safeParse({
      description: 'A valid description that is long enough',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.template).toBe('Basic');
      expect(result.data.labels).toEqual([]);
    }
  });

  it('rejects description shorter than 10 chars', () => {
    const result = ticketInputSchema.safeParse({ description: 'short' });
    expect(result.success).toBe(false);
  });

  it('rejects description exceeding max length', () => {
    const result = ticketInputSchema.safeParse({
      description: 'a'.repeat(5001),
    });
    expect(result.success).toBe(false);
  });

  it('trims description whitespace', () => {
    const result = ticketInputSchema.safeParse({
      description: '  A valid description with whitespace  ',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBe('A valid description with whitespace');
    }
  });

  it('accepts valid ticket type', () => {
    const result = ticketInputSchema.safeParse({
      description: 'A valid description here',
      type: 'Bug',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid ticket type', () => {
    const result = ticketInputSchema.safeParse({
      description: 'A valid description here',
      type: 'InvalidType',
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid priority', () => {
    const result = ticketInputSchema.safeParse({
      description: 'A valid description here',
      priority: 'Critical',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid priority', () => {
    const result = ticketInputSchema.safeParse({
      description: 'A valid description here',
      priority: 'Urgent',
    });
    expect(result.success).toBe(false);
  });

  it('rejects too many labels', () => {
    const result = ticketInputSchema.safeParse({
      description: 'A valid description here',
      labels: Array.from({ length: 11 }, (_, i) => `label-${i}`),
    });
    expect(result.success).toBe(false);
  });
});

describe('generateTicketSchema', () => {
  it('accepts valid payload', () => {
    const result = generateTicketSchema.safeParse({
      input: {
        description: 'Users report intermittent 500 errors',
        type: 'Bug',
        priority: 'High',
        labels: ['backend'],
      },
      provider: 'claude',
    });
    expect(result.success).toBe(true);
  });

  it('accepts payload without optional provider', () => {
    const result = generateTicketSchema.safeParse({
      input: { description: 'Add dark mode toggle to settings' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid provider', () => {
    const result = generateTicketSchema.safeParse({
      input: { description: 'A valid description here' },
      provider: 'invalid-provider',
    });
    expect(result.success).toBe(false);
  });
});

describe('refineTicketSchema', () => {
  it('accepts valid payload', () => {
    const result = refineTicketSchema.safeParse({
      currentTicket: '## Some Ticket\nContent here',
      style: 'concise',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty currentTicket', () => {
    const result = refineTicketSchema.safeParse({
      currentTicket: '',
      style: 'concise',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid style', () => {
    const result = refineTicketSchema.safeParse({
      currentTicket: '## Ticket',
      style: 'invalid-style',
    });
    expect(result.success).toBe(false);
  });
});

describe('regenerateTicketSchema', () => {
  it('accepts valid payload', () => {
    const result = regenerateTicketSchema.safeParse({
      currentTicket: '## Existing ticket content',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty currentTicket', () => {
    const result = regenerateTicketSchema.safeParse({
      currentTicket: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('generateTitleSchema', () => {
  it('accepts a valid description', () => {
    const result = generateTitleSchema.safeParse({
      description: 'Users are experiencing slow page loads on the dashboard when more than 100 items are displayed',
    });
    expect(result.success).toBe(true);
  });

  it('rejects description shorter than 20 chars', () => {
    const result = generateTitleSchema.safeParse({
      description: 'Too short',
    });
    expect(result.success).toBe(false);
  });
});
