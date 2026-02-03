import {
  LLMProvider,
  LLMMessage,
  LLMCompletionOptions,
  LLMCompletionResult,
  LLMProviderConfig,
  HealthCheckResult,
} from '../LLMProvider';
import { fetchWithTimeout, LLMApiError } from '../utils/fetchWithTimeout';

/**
 * OpenAI Provider Implementation
 *
 * Features:
 * - Request timeout handling (60s default)
 * - Structured error handling
 * - Health check with detailed status
 */
export class OpenAIProvider implements LLMProvider {
  readonly name = 'openai';
  readonly model: string;

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;

  constructor(config: LLMProviderConfig) {
    if (!config.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    this.apiKey = config.apiKey;
    this.model = config.model || 'gpt-4o';
    this.baseUrl = config.baseUrl || 'https://api.openai.com';
    this.timeout = config.timeout || 60000;
  }

  async complete(
    messages: LLMMessage[],
    options: LLMCompletionOptions = {}
  ): Promise<LLMCompletionResult> {
    const requestBody = {
      model: this.model,
      max_tokens: options.maxTokens || 2048,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      ...(options.temperature !== undefined && { temperature: options.temperature }),
      ...(options.stopSequences && { stop: options.stopSequences }),
    };

    let response: Response;
    try {
      response = await fetchWithTimeout(`${this.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
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
      const errorBody = await response.json().catch(() => ({}));
      const errorMessage = errorBody.error?.message || `HTTP ${response.status}`;
      throw new LLMApiError(this.name, response.status, errorMessage);
    }

    const data = await response.json();
    const choice = data.choices[0];

    return {
      content: choice?.message?.content || '',
      model: data.model,
      usage: {
        inputTokens: data.usage?.prompt_tokens || 0,
        outputTokens: data.usage?.completion_tokens || 0,
      },
      finishReason: this.mapFinishReason(choice?.finish_reason),
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

  private mapFinishReason(reason: string): LLMCompletionResult['finishReason'] {
    switch (reason) {
      case 'stop':
        return 'stop';
      case 'length':
        return 'length';
      case 'content_filter':
        return 'content_filter';
      default:
        return 'stop';
    }
  }
}
