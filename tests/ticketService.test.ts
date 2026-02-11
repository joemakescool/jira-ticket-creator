import { describe, it, expect, vi } from 'vitest';
import { TicketService } from '../server/services/ticket/TicketService';
import type { LLMProvider, LLMCompletionResult } from '../server/services/llm/LLMProvider';
import type { TicketInput } from '../src/types/ticket';

/** Create a mock provider that returns a fixed response */
function mockProvider(content: string): LLMProvider {
  return {
    name: 'mock',
    model: 'mock-model',
    complete: vi.fn().mockResolvedValue({
      content,
      model: 'mock-model',
      usage: { inputTokens: 10, outputTokens: 20 },
    } satisfies LLMCompletionResult),
    generate: vi.fn().mockResolvedValue(content),
    healthCheck: vi.fn(),
  };
}

const autoDetectInput: TicketInput = {
  description: 'Investigate Bruno API client',
  template: 'Basic',
  labels: [],
  // type, priority omitted to trigger auto-detect
};

describe('TicketService.generateTicket — JSON parsing', () => {
  const service = new TicketService();

  it('parses well-formed JSON with escaped newlines and strips leading title', async () => {
    const provider = mockProvider(
      '```json\n{"title":"Investigate Bruno","type":"Task","priority":"Medium","labels":["api"],"content":"## Investigate Bruno\\n\\n### Context\\nExplore the Bruno API."}\n```'
    );

    const ticket = await service.generateTicket(autoDetectInput, provider);
    expect(ticket.title).toBe('Investigate Bruno');
    expect(ticket.metadata.type).toBe('Task');
    // Leading ## title is stripped — content starts at ### Context
    expect(ticket.content).not.toMatch(/^##\s/);
    expect(ticket.content).toContain('### Context');
  });

  it('parses JSON with literal (unescaped) newlines in content field', async () => {
    // This is the exact pattern that was breaking — LLMs put literal newlines
    // inside the "content" string value instead of \\n
    const raw = '```json\n{"title":"Investigate Bruno","type":"Task","priority":"Medium","labels":["api"],"content":"## Investigate Bruno\n\n### Context\nExplore the Bruno API.\n\n### Acceptance Criteria\n- [ ] Document findings"}\n```';

    const provider = mockProvider(raw);
    const ticket = await service.generateTicket(autoDetectInput, provider);

    expect(ticket.title).toBe('Investigate Bruno');
    expect(ticket.metadata.type).toBe('Task');
    expect(ticket.metadata.priority).toBe('Medium');
    expect(ticket.metadata.labels).toEqual(['api']);
    // Leading ## title stripped, body content preserved
    expect(ticket.content).not.toMatch(/^##\s/);
    expect(ticket.content).toContain('Acceptance Criteria');
  });

  it('falls back gracefully when response is not JSON at all', async () => {
    const provider = mockProvider('## Some Ticket\n\nJust plain markdown content.');

    const ticket = await service.generateTicket(autoDetectInput, provider);
    // Should use fallback defaults, not crash
    expect(ticket.metadata.type).toBe('Task');
    expect(ticket.metadata.priority).toBe('Medium');
    // Leading ## title stripped, body content preserved
    expect(ticket.content).toContain('Just plain markdown content.');
  });
});
