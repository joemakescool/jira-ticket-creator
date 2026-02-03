// LLM Service Module
// 
// This module provides a provider-agnostic interface for LLM operations.
// Use the Factory to create providers, then call methods on the provider.
//
// Example:
//   import { LLMFactory, LLM_PROVIDERS } from '@/services/llm';
//   
//   const claude = LLMFactory.create('claude', { apiKey: '...' });
//   const response = await claude.generate('Hello!');

export type {
  LLMProvider,
  LLMMessage,
  LLMCompletionOptions,
  LLMCompletionResult,
  LLMProviderConfig,
  LLMProviderName,
} from './LLMProvider';

export { LLM_PROVIDERS } from './LLMProvider';

export { LLMFactory } from './LLMFactory';

// Re-export providers for advanced use cases
export { ClaudeProvider } from './providers/ClaudeProvider';
export { OpenAIProvider } from './providers/OpenAIProvider';
export { OllamaProvider } from './providers/OllamaProvider';
