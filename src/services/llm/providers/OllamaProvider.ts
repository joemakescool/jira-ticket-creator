import {
  LLMProvider,
  LLMMessage,
  LLMCompletionOptions,
  LLMCompletionResult,
  LLMProviderConfig,
} from '../LLMProvider';

/**
 * Ollama Provider Implementation
 *
 * Connects to a local Ollama instance for LLM inference.
 * No API key required - runs entirely on your machine.
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

  constructor(config: LLMProviderConfig) {
    this.model = config.model || 'llama3';
    this.baseUrl = config.baseUrl || 'http://localhost:11434';
  }

  async complete(
    messages: LLMMessage[],
    options: LLMCompletionOptions = {}
  ): Promise<LLMCompletionResult> {
    // Ollama uses OpenAI-compatible chat format
    const requestBody: Record<string, unknown> = {
      model: this.model,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      stream: false,
      options: {
        num_predict: options.maxTokens || 2048,
      },
    };

    if (options.temperature !== undefined) {
      (requestBody.options as Record<string, unknown>).temperature = options.temperature;
    }

    if (options.stopSequences) {
      requestBody.stop = options.stopSequences;
    }

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.text().catch(() => 'Unknown error');
      throw new Error(`Ollama API error: ${response.status} - ${error}`);
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

  async generate(
    prompt: string,
    options?: LLMCompletionOptions
  ): Promise<string> {
    const result = await this.complete(
      [{ role: 'user', content: prompt }],
      options
    );
    return result.content;
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Check if Ollama is running
      const response = await fetch(`${this.baseUrl}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * List available models on the local Ollama instance
   */
  async listModels(): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/api/tags`);
    if (!response.ok) {
      throw new Error('Failed to list Ollama models');
    }
    const data = await response.json();
    return data.models?.map((m: { name: string }) => m.name) || [];
  }
}
