import {
  LLMProvider,
  LLMMessage,
  LLMCompletionOptions,
  LLMCompletionResult,
  LLMProviderConfig,
} from '../LLMProvider';

/**
 * Claude Provider Implementation
 * 
 * Concrete implementation of LLMProvider for Anthropic's Claude.
 * 
 * Why this design?
 * - Encapsulates all Claude-specific logic (API format, headers, etc.)
 * - Easy to update when Anthropic changes their API
 * - Testable in isolation with mock responses
 */
export class ClaudeProvider implements LLMProvider {
  readonly name = 'claude';
  readonly model: string;
  
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: LLMProviderConfig) {
    if (!config.apiKey) {
      throw new Error('Claude API key is required');
    }
    
    this.apiKey = config.apiKey;
    this.model = config.model || 'claude-sonnet-4-20250514';
    this.baseUrl = config.baseUrl || 'https://api.anthropic.com';
  }

  async complete(
    messages: LLMMessage[],
    options: LLMCompletionOptions = {}
  ): Promise<LLMCompletionResult> {
    // Separate system message (Claude API handles it differently)
    const systemMessage = messages.find(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');

    const requestBody: Record<string, unknown> = {
      model: this.model,
      max_tokens: options.maxTokens || 2048,
      messages: conversationMessages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    };

    // Add system message if present
    if (systemMessage) {
      requestBody.system = systemMessage.content;
    }

    // Add optional parameters
    if (options.temperature !== undefined) {
      requestBody.temperature = options.temperature;
    }
    if (options.stopSequences) {
      requestBody.stop_sequences = options.stopSequences;
    }

    const response = await fetch(`${this.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `Claude API error: ${response.status} - ${error.error?.message || 'Unknown error'}`
      );
    }

    const data = await response.json();
    
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
      // Simple check - try to generate a tiny response
      await this.generate('Say "ok"', { maxTokens: 10 });
      return true;
    } catch {
      return false;
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
