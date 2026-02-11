/**
 * Environment Validation
 *
 * Validates required environment variables on server startup.
 * Fails fast with clear messages instead of crashing on the first API request.
 */

import { LLM_PROVIDERS, LLMProviderName } from '../../src/services/llm/LLMProvider.js';
import { serverLogger as logger } from './logger.js';

const VALID_PROVIDERS = Object.values(LLM_PROVIDERS) as string[];

/** Map of provider name to required env var(s) */
const PROVIDER_KEY_MAP: Record<string, string[]> = {
  [LLM_PROVIDERS.CLAUDE]: ['ANTHROPIC_API_KEY'],
  [LLM_PROVIDERS.OPENAI]: ['OPENAI_API_KEY'],
  [LLM_PROVIDERS.GEMINI]: ['GOOGLE_AI_API_KEY'],
  [LLM_PROVIDERS.OLLAMA]: [], // no key required
};

/**
 * Validate environment and fail fast on critical misconfigurations.
 * Warns on non-critical issues so the server can still start.
 */
export function validateEnv(): void {
  const defaultProvider = process.env.DEFAULT_LLM_PROVIDER;

  // 1. Validate DEFAULT_LLM_PROVIDER is a known value (if set)
  if (defaultProvider && !VALID_PROVIDERS.includes(defaultProvider)) {
    throw new Error(
      `Invalid DEFAULT_LLM_PROVIDER="${defaultProvider}". ` +
        `Must be one of: ${VALID_PROVIDERS.join(', ')}`
    );
  }

  // 2. Validate the default provider has its required key
  const provider = (defaultProvider || 'ollama') as LLMProviderName;
  const requiredKeys = PROVIDER_KEY_MAP[provider] ?? [];

  for (const key of requiredKeys) {
    if (!process.env[key]) {
      throw new Error(
        `Missing ${key} for default provider "${provider}". ` +
          `Set it in your .env file or change DEFAULT_LLM_PROVIDER.`
      );
    }
  }

  // 3. Warn about providers whose keys are missing (non-fatal)
  for (const [name, keys] of Object.entries(PROVIDER_KEY_MAP)) {
    if (name === provider) continue; // already validated above
    for (const key of keys) {
      if (!process.env[key]) {
        logger.warn(`${key} not set — "${name}" provider will be unavailable`);
      }
    }
  }
}
