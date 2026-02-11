import { describe, it, expect, beforeEach } from 'vitest';
import { LLMFactory } from '../src/services/llm/LLMFactory';
import { ClaudeProvider } from '../src/services/llm/providers/ClaudeProvider';
import { OpenAIProvider } from '../src/services/llm/providers/OpenAIProvider';
import { OllamaProvider } from '../src/services/llm/providers/OllamaProvider';

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
