import {
  LLMProvider,
  LLMProviderConfig,
  LLMProviderName,
  LLM_PROVIDERS,
} from './LLMProvider.js';
import { ClaudeProvider } from './providers/ClaudeProvider.js';
import { OpenAIProvider } from './providers/OpenAIProvider.js';
import { OllamaProvider } from './providers/OllamaProvider.js';

/**
 * LLM Factory
 * 
 * Design Pattern: Factory Pattern
 * 
 * Why a Factory?
 * - Encapsulates the creation logic for providers
 * - Client code doesn't need to know about concrete classes
 * - Easy to add new providers without changing client code
 * - Centralizes provider configuration and validation
 * 
 * Usage:
 *   const provider = LLMFactory.create('claude', { apiKey: '...' });
 *   const ticket = await provider.generate(prompt);
 */
export class LLMFactory {
  private static providers: Map<string, LLMProvider> = new Map();

  /**
   * Create or retrieve a provider instance
   * 
   * @param name - Provider name ('claude', 'openai', etc.)
   * @param config - Provider configuration
   * @returns Configured LLM provider
   */
  static create(
    name: LLMProviderName,
    config: LLMProviderConfig
  ): LLMProvider {
    // Create a cache key based on provider + model
    const cacheKey = `${name}:${config.model || 'default'}`;
    
    // Return cached instance if available (singleton per config)
    if (this.providers.has(cacheKey)) {
      return this.providers.get(cacheKey)!;
    }

    // Create new provider instance
    const provider = this.createProvider(name, config);
    
    // Cache and return
    this.providers.set(cacheKey, provider);
    return provider;
  }

  /**
   * Create provider from environment variables
   * Useful for server-side where keys come from env
   */
  static createFromEnv(name: LLMProviderName): LLMProvider {
    const config = this.getConfigFromEnv(name);
    return this.create(name, config);
  }

  /**
   * Get the default provider based on environment
   */
  static getDefault(): LLMProvider {
    const defaultProvider = (process.env.DEFAULT_LLM_PROVIDER || 'ollama') as LLMProviderName;
    return this.createFromEnv(defaultProvider);
  }

  /**
   * Check which providers are available (have API keys configured)
   */
  static getAvailableProviders(): LLMProviderName[] {
    const available: LLMProviderName[] = [];
    
    if (process.env.ANTHROPIC_API_KEY) {
      available.push(LLM_PROVIDERS.CLAUDE);
    }
    if (process.env.OPENAI_API_KEY) {
      available.push(LLM_PROVIDERS.OPENAI);
    }
    if (process.env.GOOGLE_AI_API_KEY) {
      available.push(LLM_PROVIDERS.GEMINI);
    }
    // Ollama doesn't need an API key
    if (process.env.OLLAMA_HOST) {
      available.push(LLM_PROVIDERS.OLLAMA);
    }

    return available;
  }

  /**
   * Clear the provider cache (useful for testing)
   */
  static clearCache(): void {
    this.providers.clear();
  }

  private static createProvider(
    name: LLMProviderName,
    config: LLMProviderConfig
  ): LLMProvider {
    switch (name) {
      case LLM_PROVIDERS.CLAUDE:
        return new ClaudeProvider(config);
      
      case LLM_PROVIDERS.OPENAI:
        return new OpenAIProvider(config);
      
      case LLM_PROVIDERS.GEMINI:
        throw new Error('Gemini provider not yet implemented');
      
      case LLM_PROVIDERS.OLLAMA:
        return new OllamaProvider(config);
      
      default:
        throw new Error(`Unknown LLM provider: ${name}`);
    }
  }

  private static getConfigFromEnv(name: LLMProviderName): LLMProviderConfig {
    switch (name) {
      case LLM_PROVIDERS.CLAUDE:
        return {
          apiKey: process.env.ANTHROPIC_API_KEY || '',
          model: process.env.CLAUDE_MODEL,
        };
      
      case LLM_PROVIDERS.OPENAI:
        return {
          apiKey: process.env.OPENAI_API_KEY || '',
          model: process.env.OPENAI_MODEL,
        };
      
      case LLM_PROVIDERS.GEMINI:
        return {
          apiKey: process.env.GOOGLE_AI_API_KEY || '',
          model: process.env.GEMINI_MODEL,
        };
      
      case LLM_PROVIDERS.OLLAMA:
        return {
          apiKey: '', // Ollama doesn't need a key
          baseUrl: process.env.OLLAMA_HOST || 'http://localhost:11434',
          model: process.env.OLLAMA_MODEL,
        };
      
      default:
        throw new Error(`Unknown LLM provider: ${name}`);
    }
  }
}
