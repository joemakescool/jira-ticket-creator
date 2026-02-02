import {
  LLMProvider,
  LLMMessage,
  LLMCompletionOptions,
  LLMCompletionResult,
  LLMProviderConfig,
} from '../LLMProvider';

/**
 * OpenAI Provider Implementation
 * 
 * Demonstrates how the Strategy pattern enables easy provider swapping.
 * Same interface as Claude, completely different implementation details.
 */
export class OpenAIProvider implements LLMProvider {
  readonly name = 'openai';
  readonly model: string;
  
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: LLMProviderConfig) {
    if (!config.apiKey) {
      throw new Error('OpenAI API key is required');
    }
    
    this.apiKey = config.apiKey;
    this.model = config.model || 'gpt-4o';
    this.baseUrl = config.baseUrl || 'https://api.openai.com';
  }

  async complete(
    messages: LLMMessage[],
    options: LLMCompletionOptions = {}
  ): Promise<LLMCompletionResult> {
    const requestBody: Record<string, unknown> = {
      model: this.model,
      max_tokens: options.maxTokens || 2048,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    };

    if (options.temperature !== undefined) {
      requestBody.temperature = options.temperature;
    }
    if (options.stopSequences) {
      requestBody.stop = options.stopSequences;
    }

    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `OpenAI API error: ${response.status} - ${error.error?.message || 'Unknown error'}`
      );
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
      await this.generate('Say "ok"', { maxTokens: 10 });
      return true;
    } catch {
      return false;
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
