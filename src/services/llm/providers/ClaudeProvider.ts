import {
  LLMProvider,
  LLMMessage,
  LLMCompletionOptions,
  LLMCompletionResult,
  LLMProviderConfig,
  HealthCheckResult,
} from '../LLMProvider.js';
import { fetchWithTimeout, LLMApiError } from '../utils/fetchWithTimeout.js';

/** Claude API response types */
interface ClaudeResponse {
  content: Array<{ type: string; text: string }>;
  model: string;
  stop_reason: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

interface ClaudeErrorResponse {
  error?: { message: string };
}

/**
 * Claude Provider Implementation
 *
 * Concrete implementation of LLMProvider for Anthropic's Claude.
 *
 * Features:
 * - Request timeout handling (60s default)
 * - Structured error handling
 * - Health check with detailed status
 */
export class ClaudeProvider implements LLMProvider {
  readonly name = 'claude';
  readonly model: string;

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;

  constructor(config: LLMProviderConfig) {
    if (!config.apiKey) {
      throw new Error('Claude API key is required');
    }

    this.apiKey = config.apiKey;
    this.model = config.model || 'claude-sonnet-4-20250514';
    this.baseUrl = config.baseUrl || 'https://api.anthropic.com';
    this.timeout = config.timeout || 60000;
  }

  async complete(
    messages: LLMMessage[],
    options: LLMCompletionOptions = {}
  ): Promise<LLMCompletionResult> {
    // Separate system message (Claude API handles it differently)
    const systemMessage = messages.find(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');

    const requestBody = {
      model: this.model,
      max_tokens: options.maxTokens || 2048,
      messages: conversationMessages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      ...(systemMessage && { system: systemMessage.content }),
      ...(options.temperature !== undefined && { temperature: options.temperature }),
      ...(options.stopSequences && { stop_sequences: options.stopSequences }),
    };

    let response: Response;
    try {
      response = await fetchWithTimeout(`${this.baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(requestBody),
        timeout: this.timeout,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('timeout')) {
        throw new LLMApiError(this.name, 408, 'Request timed out', error);
      }
      throw new LLMApiError(this.name, 0, 'Network error', error);
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({})) as ClaudeErrorResponse;
      // Sanitize error message to avoid leaking sensitive info
      const errorMessage = errorBody.error?.message || `HTTP ${response.status}`;
      throw new LLMApiError(this.name, response.status, errorMessage);
    }

    const data = await response.json() as ClaudeResponse;

    return {
      content: data.content[0]?.text || '',
      model: data.model,
      usage: {
        inputTokens: data.usage?.input_tokens || 0,
        outputTokens: data.usage?.output_tokens || 0,
      },
      finishReason: this.mapStopReason(data.stop_reason),
    };
  }

  async generate(prompt: string, options?: LLMCompletionOptions): Promise<string> {
    const result = await this.complete([{ role: 'user', content: prompt }], options);
    return result.content;
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    try {
      await this.generate('Say "ok"', { maxTokens: 10 });
      return {
        healthy: true,
        latency: Date.now() - startTime,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        healthy: false,
        latency: Date.now() - startTime,
        error: message,
      };
    }
  }

  private mapStopReason(reason: string): LLMCompletionResult['finishReason'] {
    switch (reason) {
      case 'end_turn':
      case 'stop_sequence':
        return 'stop';
      case 'max_tokens':
        return 'length';
      default:
        return 'stop';
    }
  }
}
