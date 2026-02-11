import { describe, it, expect } from 'vitest';
import {
  buildTicketPrompt,
  buildTitlePrompt,
  buildRefinementPrompt,
  SYSTEM_PROMPT,
} from '../src/prompts/ticketPrompts';
import type { TicketInput } from '../src/types/ticket';

const baseInput: TicketInput = {
  description: 'Users cannot log in after password reset',
  type: 'Bug',
  priority: 'High',
  labels: ['auth', 'backend'],
  template: 'Basic',
};

describe('SYSTEM_PROMPT', () => {
  it('defines the LLM persona', () => {
    expect(SYSTEM_PROMPT).toContain('JIRA tickets');
    expect(SYSTEM_PROMPT).toContain('markdown');
  });
});

describe('buildTicketPrompt', () => {
  it('includes title, type, priority, and labels when all provided', () => {
    const prompt = buildTicketPrompt({ ...baseInput, title: 'Fix login' });
    expect(prompt).toContain('Fix login');
    expect(prompt).toContain('Bug');
    expect(prompt).toContain('High');
    expect(prompt).toContain('auth, backend');
  });

  it('uses auto-detect JSON format when type is missing', () => {
    const prompt = buildTicketPrompt({ ...baseInput, type: undefined });
    expect(prompt).toContain('JSON');
    expect(prompt).toContain('"type"');
  });

  it('uses auto-detect JSON format when priority is missing', () => {
    const prompt = buildTicketPrompt({ ...baseInput, priority: undefined });
    expect(prompt).toContain('JSON');
    expect(prompt).toContain('"priority"');
  });

  it('uses auto-detect JSON format when labels are empty', () => {
    const prompt = buildTicketPrompt({ ...baseInput, labels: [] });
    expect(prompt).toContain('JSON');
    expect(prompt).toContain('"labels"');
  });

  it('includes template guidance', () => {
    const basic = buildTicketPrompt(baseInput);
    expect(basic).toContain('Basic');

    const detailed = buildTicketPrompt({ ...baseInput, template: 'Detailed' });
    expect(detailed).toContain('Detailed');
    expect(detailed).toContain('Out of Scope');
  });

  it('includes writing style guidance when set', () => {
    const prompt = buildTicketPrompt({ ...baseInput, writingStyle: 'technical' });
    expect(prompt).toContain('Technical');
  });

  it('includes description text', () => {
    const prompt = buildTicketPrompt(baseInput);
    expect(prompt).toContain('Users cannot log in after password reset');
  });
});

describe('buildTitlePrompt', () => {
  it('includes the description', () => {
    const prompt = buildTitlePrompt('Payment processing fails intermittently');
    expect(prompt).toContain('Payment processing fails intermittently');
  });

  it('asks for a concise title', () => {
    const prompt = buildTitlePrompt('some description');
    expect(prompt).toContain('maximum 8 words');
    expect(prompt).toContain('action verb');
  });
});

describe('buildRefinementPrompt', () => {
  const ticket = '## Fix Login\nSome content here';

  it('includes current ticket content', () => {
    const prompt = buildRefinementPrompt(ticket, 'concise');
    expect(prompt).toContain('## Fix Login');
  });

  it('includes style-specific instructions', () => {
    expect(buildRefinementPrompt(ticket, 'concise')).toContain('Remove redundant');
    expect(buildRefinementPrompt(ticket, 'detailed')).toContain('comprehensive');
    expect(buildRefinementPrompt(ticket, 'technical')).toContain('implementation');
    expect(buildRefinementPrompt(ticket, 'business')).toContain('business value');
    expect(buildRefinementPrompt(ticket, 'user-story')).toContain('As a [user');
    expect(buildRefinementPrompt(ticket, 'acceptance')).toContain('edge cases');
  });
});
