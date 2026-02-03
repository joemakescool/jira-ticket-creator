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
 * Ollama Provider Implementation
 *
 * Connects to a local Ollama instance for LLM inference.
 * No API key required - runs entirely on your machine.
 *
 * Features:
 * - Request timeout handling (120s default - local models can be slow)
 * - Structured error handling
 * - Health check with model listing
 *
 * Setup:
 * 1. Install Ollama: https://ollama.ai
 * 2. Pull a model: `ollama pull llama3` or `ollama pull mistral`
 * 3. Ollama runs automatically on http://localhost:11434
 */
export class OllamaProvider implements LLMProvider {
  readonly name = 'ollama';
  readonly model: string;

  private readonly baseUrl: string;
  private readonly timeout: number;

  constructor(config: LLMProviderConfig) {
    this.model = config.model || 'llama3';
    this.baseUrl = config.baseUrl || 'http://localhost:11434';
    // Longer timeout for local models (they can be slower)
    this.timeout = config.timeout || 120000;
  }

  async complete(
    messages: LLMMessage[],
    options: LLMCompletionOptions = {}
  ): Promise<LLMCompletionResult> {
    const requestBody = {
      model: this.model,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      stream: false,
      options: {
        num_predict: options.maxTokens || 2048,
        ...(options.temperature !== undefined && { temperature: options.temperature }),
      },
      ...(options.stopSequences && { stop: options.stopSequences }),
    };

    let response: Response;
    try {
      response = await fetchWithTimeout(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        timeout: this.timeout,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('timeout')) {
        throw new LLMApiError(this.name, 408, 'Request timed out', error);
      }
      // Common error: Ollama not running
      if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
        throw new LLMApiError(
          this.name,
          503,
          'Ollama is not running. Start it with: ollama serve',
          error
        );
      }
      throw new LLMApiError(this.name, 0, 'Network error', error);
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new LLMApiError(this.name, response.status, errorText);
    }

    const data = await response.json();

    return {
      content: data.message?.content || '',
      model: data.model || this.model,
      usage: {
        inputTokens: data.prompt_eval_count || 0,
        outputTokens: data.eval_count || 0,
      },
      finishReason: data.done ? 'stop' : 'length',
    };
  }

  async generate(prompt: string, options?: LLMCompletionOptions): Promise<string> {
    const result = await this.complete([{ role: 'user', content: prompt }], options);
    return result.content;
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    try {
      // Check if Ollama is running by listing models
      const response = await fetchWithTimeout(`${this.baseUrl}/api/tags`, {
        timeout: 5000, // Short timeout for health check
      });

      if (!response.ok) {
        return {
          healthy: false,
          latency: Date.now() - startTime,
          error: `HTTP ${response.status}`,
        };
      }

      const data = await response.json();
      const models = data.models?.map((m: { name: string }) => m.name) || [];

      return {
        healthy: true,
        latency: Date.now() - startTime,
        models,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        healthy: false,
        latency: Date.now() - startTime,
        error: message.includes('ECONNREFUSED')
          ? 'Ollama is not running'
          : message,
      };
    }
  }

  /**
   * List available models on the local Ollama instance
   */
  async listModels(): Promise<string[]> {
    const response = await fetchWithTimeout(`${this.baseUrl}/api/tags`, {
      timeout: 5000,
    });

    if (!response.ok) {
      throw new LLMApiError(this.name, response.status, 'Failed to list models');
    }

    const data = await response.json();
    return data.models?.map((m: { name: string }) => m.name) || [];
  }
}
