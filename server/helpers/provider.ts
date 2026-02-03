/**
 * Provider Helper
 *
 * Resolves LLM provider from request or environment
 */

import { LLMFactory, LLM_PROVIDERS, LLMProviderName } from '../../src/services/llm';

export function getProvider(providerName?: string) {
  const name = (providerName || process.env.DEFAULT_LLM_PROVIDER || 'ollama') as LLMProviderName;

  // Validate provider name
  if (!Object.values(LLM_PROVIDERS).includes(name)) {
    throw new Error(`Invalid provider: ${name}`);
  }

  return LLMFactory.createFromEnv(name);
}
