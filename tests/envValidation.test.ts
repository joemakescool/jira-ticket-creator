import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock the logger to prevent output during tests
vi.mock('../server/lib/logger', () => ({
  serverLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('validateEnv', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset modules so validateEnv re-reads process.env
    vi.resetModules();
    // Clean slate
    delete process.env.DEFAULT_LLM_PROVIDER;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.GOOGLE_AI_API_KEY;
    delete process.env.OLLAMA_HOST;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  async function loadValidateEnv() {
    const mod = await import('../server/lib/env');
    return mod.validateEnv;
  }

  it('passes when no DEFAULT_LLM_PROVIDER is set (defaults to ollama)', async () => {
    const validateEnv = await loadValidateEnv();
    expect(() => validateEnv()).not.toThrow();
  });

  it('passes when DEFAULT_LLM_PROVIDER=claude and ANTHROPIC_API_KEY is set', async () => {
    process.env.DEFAULT_LLM_PROVIDER = 'claude';
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    const validateEnv = await loadValidateEnv();
    expect(() => validateEnv()).not.toThrow();
  });

  it('throws when DEFAULT_LLM_PROVIDER is an unknown value', async () => {
    process.env.DEFAULT_LLM_PROVIDER = 'gpt5';
    const validateEnv = await loadValidateEnv();
    expect(() => validateEnv()).toThrow('Invalid DEFAULT_LLM_PROVIDER');
  });

  it('throws when DEFAULT_LLM_PROVIDER=claude but ANTHROPIC_API_KEY is missing', async () => {
    process.env.DEFAULT_LLM_PROVIDER = 'claude';
    const validateEnv = await loadValidateEnv();
    expect(() => validateEnv()).toThrow('Missing ANTHROPIC_API_KEY');
  });

  it('throws when DEFAULT_LLM_PROVIDER=openai but OPENAI_API_KEY is missing', async () => {
    process.env.DEFAULT_LLM_PROVIDER = 'openai';
    const validateEnv = await loadValidateEnv();
    expect(() => validateEnv()).toThrow('Missing OPENAI_API_KEY');
  });

  it('passes when DEFAULT_LLM_PROVIDER=ollama (no key required)', async () => {
    process.env.DEFAULT_LLM_PROVIDER = 'ollama';
    const validateEnv = await loadValidateEnv();
    expect(() => validateEnv()).not.toThrow();
  });
});
