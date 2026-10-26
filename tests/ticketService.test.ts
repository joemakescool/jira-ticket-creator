import { describe, it, expect, vi } from 'vitest';
import { TicketService } from '../server/services/ticket/TicketService';
import type { LLMProvider, LLMCompletionResult } from '../server/services/llm/LLMProvider';
import type { TicketInput, CommentInput } from '../src/types/ticket';
import { COMMENT_SYSTEM_PROMPT } from '../server/prompts/ticketPrompts';

/** Create a mock provider that returns a fixed response */
function mockProvider(content: string): LLMProvider {
  return {
    name: 'mock',
    model: 'mock-model',
    // Exercises the lenient parse path, which is what these tests are about.
    supportsStructuredOutput: false,
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

/**
 * The shape the UI actually produces once a user adds a label: type and
 * priority are always populated from the form defaults, so this bypasses the
 * auto-detect branch entirely. This is the case the original fixtures missed.
 */
const fullySpecifiedInput: TicketInput = {
  description: 'Investigate Bruno API client',
  type: 'Task',
  priority: 'Medium',
  labels: ['api'],
  template: 'Basic',
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

/**
 * The Auto type/priority option sends `undefined`, which is what makes the
 * prompt's auto-detect branch fire. These assert the `aiSuggested` flags the
 * Review screen badges depend on — they were unreachable while the form always
 * sent a concrete Task/Medium.
 */
describe('TicketService.generateTicket — AI attribution flags', () => {
  const service = new TicketService();

  const jsonResponse = JSON.stringify({
    title: 'Fix CSV export truncation',
    type: 'Bug',
    priority: 'High',
    labels: ['export', 'backend'],
    content: '### Context\n\nExport stops at 1000 rows.',
  });

  it('flags type, priority and labels as AI-suggested when none were provided', async () => {
    const ticket = await service.generateTicket(
      autoDetectInput,
      mockProvider(jsonResponse),
    );

    expect(ticket.metadata.type).toBe('Bug');
    expect(ticket.metadata.priority).toBe('High');
    expect(ticket.metadata.labels).toEqual(['export', 'backend']);
    expect(ticket.metadata.aiSuggested).toEqual({
      type: true,
      priority: true,
      labels: true,
    });
  });

  it('does not flag fields the user chose explicitly', async () => {
    const ticket = await service.generateTicket(
      { ...autoDetectInput, type: 'Task', priority: 'Low' },
      mockProvider(jsonResponse),
    );

    expect(ticket.metadata.aiSuggested).toEqual({
      type: false,
      priority: false,
      labels: true,
    });
    // A user-chosen value wins over the model's suggestion.
    expect(ticket.metadata.type).toBe('Bug');
  });

  it('reports labels as not AI-suggested when the model returns none', async () => {
    const ticket = await service.generateTicket(
      autoDetectInput,
      mockProvider(JSON.stringify({
        title: 'T',
        type: 'Bug',
        priority: 'High',
        labels: [],
        content: '### Context\n\nBody.',
      })),
    );

    expect(ticket.metadata.aiSuggested?.labels).toBe(false);
    expect(ticket.metadata.labels).toEqual([]);
  });
});

/**
 * Regression: a ticket body containing a fenced code sample with quotes breaks
 * whole-document JSON repair. Before field-level salvage, the envelope itself
 * was surfaced as the ticket body with a title of "{".
 */
describe('TicketService.generateTicket — malformed JSON envelopes', () => {
  const service = new TicketService();

  // Literal newlines *and* unescaped inner quotes — the shape Opus 5 actually
  // returned for a Bug ticket that included a code sample.
  const codeFenceResponse = [
    '{',
    '  "title": "Fix unresponsive Export button on Reports page",',
    '  "type": "Bug",',
    '  "priority": "High",',
    '  "labels": ["frontend"],',
    '  "content": "### Context',
    '',
    'The click handler never fires.',
    '',
    '```js',
    'const label = "Export";',
    'console.log("clicked");',
    '```',
    '',
    '### Acceptance Criteria',
    '- [ ] Button triggers a download"',
    '}',
  ].join('\n');

  it('never surfaces the JSON envelope as the ticket body', async () => {
    const ticket = await service.generateTicket(
      fullySpecifiedInput,
      mockProvider(codeFenceResponse),
    );

    expect(ticket.content.trimStart().startsWith('{')).toBe(false);
    expect(ticket.content).not.toContain('"labels"');
    expect(ticket.title).not.toBe('{');
  });

  it('salvages the markdown body including the code sample', async () => {
    const ticket = await service.generateTicket(
      fullySpecifiedInput,
      mockProvider(codeFenceResponse),
    );

    expect(ticket.content).toContain('### Context');
    expect(ticket.content).toContain('### Acceptance Criteria');
    expect(ticket.content).toContain('- [ ] Button triggers a download');
    // Quotes inside the fenced sample must survive untouched.
    expect(ticket.content).toContain('const label = "Export";');
  });

  it('salvages the title and metadata from the envelope', async () => {
    const ticket = await service.generateTicket(
      fullySpecifiedInput,
      mockProvider(codeFenceResponse),
    );

    expect(ticket.title).toBe('Fix unresponsive Export button on Reports page');
    expect(ticket.metadata.type).toBe('Bug');
    expect(ticket.metadata.priority).toBe('High');
  });

  it('recovers a partial body when the response is truncated mid-string', async () => {
    const truncated = [
      '{',
      '  "title": "Add rate limiting to the login endpoint",',
      '  "content": "### Context',
      '',
      'Login is unthrottled and brute-forceable. We should',
    ].join('\n');

    const ticket = await service.generateTicket(
      fullySpecifiedInput,
      mockProvider(truncated),
    );

    expect(ticket.title).toBe('Add rate limiting to the login endpoint');
    expect(ticket.content).toContain('### Context');
    expect(ticket.content.trimStart().startsWith('{')).toBe(false);
  });

  it('leaves a plain markdown response untouched', async () => {
    const ticket = await service.generateTicket(
      fullySpecifiedInput,
      mockProvider('### Context\n\nPlain markdown, no JSON at all.'),
    );

    expect(ticket.content).toContain('Plain markdown, no JSON at all.');
  });
});

describe('TicketService.generateTicket — fully specified input', () => {
  const service = new TicketService();

  it('uses the LLM-authored title instead of scraping it from content', async () => {
    const provider = mockProvider(
      '```json\n{"title":"Evaluate Bruno as Postman replacement","type":"Task","priority":"Medium","labels":["api"],"content":"### Context\\nWe need an API client."}\n```'
    );

    const ticket = await service.generateTicket(fullySpecifiedInput, provider);

    expect(ticket.title).toBe('Evaluate Bruno as Postman replacement');
    expect(ticket.content).toBe('### Context\nWe need an API client.');
    expect(ticket.metadata.labels).toEqual(['api']);
  });

  it('does not mangle content when the ticket body contains braces', async () => {
    // The fallback brace regex is greedy — if the parser ever reaches it with a
    // markdown body containing JSON examples, it can swallow the whole ticket.
    const body =
      '### Context\\nThe endpoint returns {\\"status\\": \\"error\\"} on failure.\\n\\n### Acceptance Criteria\\n- [ ] Handle it';
    const provider = mockProvider(
      `\`\`\`json\n{"title":"Handle error payload","type":"Task","priority":"Medium","labels":["api"],"content":"${body}"}\n\`\`\``
    );

    const ticket = await service.generateTicket(fullySpecifiedInput, provider);

    expect(ticket.title).toBe('Handle error payload');
    expect(ticket.content).toContain('### Acceptance Criteria');
    expect(ticket.content).toContain('{"status": "error"}');
  });
});

describe('TicketService.generateComment', () => {
  const service = new TicketService();
  const input: CommentInput = {
    notes: 'fixed token expiry, PR #412 up, need QA on staging',
    type: 'status-update',
  };

  it('sends the comment system prompt and notes, with a small low-effort budget', async () => {
    const provider = mockProvider('**Done:** Fixed token expiry.');

    await service.generateComment(input, provider);

    const [messages, options] = vi.mocked(provider.complete).mock.calls[0];
    expect(messages[0]).toEqual({ role: 'system', content: COMMENT_SYSTEM_PROMPT });
    expect(messages[1].content).toContain(input.notes);
    expect(options).toMatchObject({ maxTokens: 1000, effort: 'low' });
    // Comments are free-form markdown — no schema to constrain them.
    expect(options?.jsonSchema).toBeUndefined();
  });

  it('returns the content with model attribution and a timestamp', async () => {
    const provider = mockProvider('**Done:** Fixed token expiry.');

    const comment = await service.generateComment(input, provider);

    expect(comment.content).toBe('**Done:** Fixed token expiry.');
    expect(comment.model).toBe('mock-model');
    expect(Number.isNaN(Date.parse(comment.generatedAt))).toBe(false);
  });

  it('strips wrapping code fences', async () => {
    const provider = mockProvider('```markdown\n**Done:** Fixed token expiry.\n```');

    const comment = await service.generateComment(input, provider);

    expect(comment.content).toBe('**Done:** Fixed token expiry.');
  });

  it('keeps a leading ## line — unlike tickets, a comment has no separate title', async () => {
    const provider = mockProvider('## Fixed token expiry\nPR is up.');

    const comment = await service.generateComment(input, provider);

    expect(comment.content).toContain('Fixed token expiry');
  });

  it('throws a client-safe ApiError when the model returns nothing', async () => {
    const provider = mockProvider('   \n ');

    await expect(service.generateComment(input, provider)).rejects.toMatchObject({
      statusCode: 502,
      code: 'provider_empty_response',
    });
  });
});
