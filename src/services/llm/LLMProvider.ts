/**
 * LLM Provider Interface
 *
 * This is the core abstraction that enables swappable LLM providers.
 * All providers (Claude, OpenAI, Gemini, etc.) implement this interface.
 *
 * Design Pattern: Strategy Pattern
 * - The interface defines WHAT can be done
 * - Concrete providers define HOW it's done
 * - Client code depends only on the interface, not implementations
 */

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMCompletionOptions {
  maxTokens?: number;
  temperature?: number;
  stopSequences?: string[];
}

export interface LLMCompletionResult {
  content: string;
  model: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  finishReason?: 'stop' | 'length' | 'content_filter';
}

export interface LLMProviderConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  /** Request timeout in milliseconds (default: 60000 for cloud, 120000 for local) */
  timeout?: number;
}

/**
 * Health check result with detailed status information
 */
export interface HealthCheckResult {
  healthy: boolean;
  latency?: number;
  error?: string;
  /** Available models (for providers like Ollama) */
  models?: string[];
}

/**
 * The Strategy interface - all LLM providers must implement this
 */
export interface LLMProvider {
  /** Unique identifier for this provider */
  readonly name: string;

  /** The model being used */
  readonly model: string;

  /**
   * Generate a completion from the LLM
   * This is the core method that all providers must implement
   */
  complete(
    messages: LLMMessage[],
    options?: LLMCompletionOptions
  ): Promise<LLMCompletionResult>;

  /**
   * Simple text completion (convenience method)
   * Wraps the prompt in a user message
   */
  generate(prompt: string, options?: LLMCompletionOptions): Promise<string>;

  /**
   * Check if the provider is properly configured and reachable
   * Returns detailed status for monitoring and debugging
   */
  healthCheck(): Promise<HealthCheckResult>;
}

/**
 * Provider names as a const for type safety
 */
export const LLM_PROVIDERS = {
  CLAUDE: 'claude',
  OPENAI: 'openai',
  GEMINI: 'gemini',
  OLLAMA: 'ollama',
} as const;

export type LLMProviderName = (typeof LLM_PROVIDERS)[keyof typeof LLM_PROVIDERS];
