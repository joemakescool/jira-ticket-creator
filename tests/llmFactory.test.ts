import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LLMFactory } from '../server/services/llm/LLMFactory';
import { ClaudeProvider } from '../server/services/llm/providers/ClaudeProvider';
import { OpenAIProvider } from '../server/services/llm/providers/OpenAIProvider';
import { OllamaProvider } from '../server/services/llm/providers/OllamaProvider';

describe('LLMFactory', () => {
  beforeEach(() => {
    LLMFactory.clearCache();
  });

  describe('create', () => {
    it('creates a ClaudeProvider for "claude"', () => {
      const provider = LLMFactory.create('claude', { apiKey: 'test-key' });
      expect(provider).toBeInstanceOf(ClaudeProvider);
      expect(provider.name).toBe('claude');
    });

    it('creates an OpenAIProvider for "openai"', () => {
      const provider = LLMFactory.create('openai', { apiKey: 'test-key' });
      expect(provider).toBeInstanceOf(OpenAIProvider);
      expect(provider.name).toBe('openai');
    });

    it('creates an OllamaProvider for "ollama"', () => {
      const provider = LLMFactory.create('ollama', { apiKey: '' });
      expect(provider).toBeInstanceOf(OllamaProvider);
      expect(provider.name).toBe('ollama');
    });

    it('throws for unknown provider', () => {
      expect(() =>
        LLMFactory.create('unknown' as any, { apiKey: '' })
      ).toThrow('Unknown LLM provider');
    });

    it('caches provider instances by name and model', () => {
      const a = LLMFactory.create('claude', { apiKey: 'k' });
      const b = LLMFactory.create('claude', { apiKey: 'k' });
      expect(a).toBe(b);
    });

    it('returns different instances for different models', () => {
      const a = LLMFactory.create('claude', { apiKey: 'k', model: 'model-a' });
      const b = LLMFactory.create('claude', { apiKey: 'k', model: 'model-b' });
      expect(a).not.toBe(b);
    });
  });

  describe('clearCache', () => {
    it('clears cached instances so new ones are created', () => {
      const a = LLMFactory.create('claude', { apiKey: 'k' });
      LLMFactory.clearCache();
      const b = LLMFactory.create('claude', { apiKey: 'k' });
      expect(a).not.toBe(b);
    });
  });
});

/**
 * A misspelled CLAUDE_EFFORT should fail loudly. Silently falling back would
 * look identical to the setting having been applied.
 */
describe('LLMFactory — CLAUDE_EFFORT validation', () => {
  const original = process.env.CLAUDE_EFFORT;

  beforeEach(() => {
    LLMFactory.clearCache();
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
  });

  afterEach(() => {
    if (original === undefined) delete process.env.CLAUDE_EFFORT;
    else process.env.CLAUDE_EFFORT = original;
    LLMFactory.clearCache();
  });

  it('accepts a valid level', () => {
    process.env.CLAUDE_EFFORT = 'medium';
    expect(() => LLMFactory.createFromEnv('claude')).not.toThrow();
  });

  it('is case- and whitespace-insensitive', () => {
    process.env.CLAUDE_EFFORT = '  HIGH  ';
    expect(() => LLMFactory.createFromEnv('claude')).not.toThrow();
  });

  it('throws on an invalid level, naming the allowed values', () => {
    process.env.CLAUDE_EFFORT = 'mediumm';
    expect(() => LLMFactory.createFromEnv('claude')).toThrow(/Invalid CLAUDE_EFFORT/);
    expect(() => LLMFactory.createFromEnv('claude')).toThrow(/low, medium, high, xhigh, max/);
  });

  it('is optional', () => {
    delete process.env.CLAUDE_EFFORT;
    expect(() => LLMFactory.createFromEnv('claude')).not.toThrow();
  });
});
