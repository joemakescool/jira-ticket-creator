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

export interface LLMImageContent {
  type: 'image';
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
  /** Base64-encoded image data (no data URL prefix) */
  data: string;
}

export interface LLMTextContent {
  type: 'text';
  text: string;
}

export type LLMContentPart = LLMTextContent | LLMImageContent;

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  /** String for text-only messages, array for multimodal (text + images) */
  content: string | LLMContentPart[];
}

/**
 * A JSON Schema the response must conform to.
 *
 * Only meaningful on providers reporting `supportsStructuredOutput`. Others
 * ignore it, so callers must still tolerate non-conforming output.
 *
 * Anthropic's schema support is a subset of JSON Schema: every object needs
 * `additionalProperties: false` and a `required` list, and free-form maps
 * (`additionalProperties: {type: 'string'}`) are rejected — model those as
 * arrays of key/value objects instead.
 */
export interface LLMJsonSchema {
  name: string;
  schema: Record<string, unknown>;
}

/**
 * How much reasoning effort to spend. Higher settings think longer and cost
 * more; lower ones return sooner. Providers that have no equivalent ignore it.
 */
export const LLM_EFFORT_LEVELS = ['low', 'medium', 'high', 'xhigh', 'max'] as const;
export type LLMEffort = (typeof LLM_EFFORT_LEVELS)[number];

export function isLLMEffort(value: string): value is LLMEffort {
  return (LLM_EFFORT_LEVELS as readonly string[]).includes(value);
}

export interface LLMCompletionOptions {
  maxTokens?: number;
  temperature?: number;
  stopSequences?: string[];
  /** Constrain the response to this schema where the provider supports it. */
  jsonSchema?: LLMJsonSchema;
  /** Overrides the provider's configured default effort for this call. */
  effort?: LLMEffort;
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
  /**
   * Default reasoning effort for every call to this provider. Operator-tunable
   * so latency and cost can be adjusted without a code change.
   */
  effort?: LLMEffort;
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
   * True when the provider enforces `LLMCompletionOptions.jsonSchema` server-side,
   * so the response is guaranteed parseable JSON. Callers use this to skip
   * lenient repair/salvage parsing.
   */
  readonly supportsStructuredOutput: boolean;

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
