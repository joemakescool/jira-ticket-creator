import {
  LLMProvider,
  LLMMessage,
  LLMContentPart,
  LLMCompletionOptions,
  LLMCompletionResult,
  LLMProviderConfig,
  LLMEffort,
  HealthCheckResult,
} from '../LLMProvider.js';
import { fetchWithTimeout, LLMApiError } from '../utils/fetchWithTimeout.js';

/** Claude API response types */
interface ClaudeResponse {
  // `thinking` blocks carry no `text`, so this is optional — always find the text block.
  content: Array<{ type: string; text?: string }>;
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
  /**
   * Models that reject temperature/top_p/top_k and run adaptive thinking by
   * default. Sampling params must be omitted, and max_tokens has to cover the
   * thinking budget as well as the reply.
   */
  private static readonly ADAPTIVE_THINKING_MODELS =
    /^claude-(fable-5|mythos-5|opus-5|opus-4-7|opus-4-8|sonnet-5)/;

  /** max_tokens floor when thinking shares the budget with the response. */
  private static readonly THINKING_MAX_TOKENS = 16000;

  /** Models where `output_config.format` is honoured. */
  private static readonly STRUCTURED_OUTPUT_MODELS =
    /^claude-(fable-5|mythos-5|opus-5|opus-4-8|sonnet-5|haiku-4-5)/;

  readonly name = 'claude';
  readonly model: string;
  /**
   * `output_config.format` is GA (no beta header) on Fable 5, Opus 5, Opus 4.8,
   * Sonnet 5 and Haiku 4.5. Older models silently ignore it, so gate on the
   * same family list used for the adaptive-thinking behaviour above.
   */
  readonly supportsStructuredOutput: boolean;

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  /**
   * Default effort. `medium` rather than the API's `high` default: ticket
   * generation is a bounded writing task, and `high` was costing ~40s per
   * request for little quality gain. Override with CLAUDE_EFFORT.
   */
  private readonly defaultEffort: LLMEffort;

  constructor(config: LLMProviderConfig) {
    if (!config.apiKey) {
      throw new Error('Claude API key is required');
    }

    this.apiKey = config.apiKey;
    this.model = config.model || 'claude-opus-5';
    this.baseUrl = config.baseUrl || 'https://api.anthropic.com';
    // 120s, not the 60s this used to inherit. With adaptive thinking on, a
    // Detailed ticket on Opus 5 can legitimately run past a minute, and the old
    // ceiling turned a normal-but-slow generation into a spurious timeout.
    this.timeout = config.timeout || 120000;
    this.supportsStructuredOutput =
      ClaudeProvider.STRUCTURED_OUTPUT_MODELS.test(this.model);
    this.defaultEffort = config.effort ?? 'medium';
  }

  async complete(
    messages: LLMMessage[],
    options: LLMCompletionOptions = {}
  ): Promise<LLMCompletionResult> {
    // Separate system message (Claude API handles it differently)
    const systemMessage = messages.find(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');

    const adaptiveThinking = ClaudeProvider.ADAPTIVE_THINKING_MODELS.test(this.model);
    const maxTokens = options.maxTokens || 2048;

    // `effort` and `format` are both keys of a single output_config object —
    // building them separately would mean two output_config properties, the
    // second silently overwriting the first.
    const outputConfig: Record<string, unknown> = {};
    const effort = options.effort ?? this.defaultEffort;
    if (effort && adaptiveThinking) {
      outputConfig.effort = effort;
    }
    if (options.jsonSchema && this.supportsStructuredOutput) {
      // `format` takes only `type` and `schema` — sending a `name` alongside
      // them is rejected with "Extra inputs are not permitted".
      outputConfig.format = {
        type: 'json_schema',
        schema: options.jsonSchema.schema,
      };
    }

    const requestBody = {
      model: this.model,
      max_tokens: adaptiveThinking
        ? Math.max(maxTokens, ClaudeProvider.THINKING_MAX_TOKENS)
        : maxTokens,
      messages: conversationMessages.map(m => ({
        role: m.role,
        content: this.formatContent(m.content),
      })),
      ...(systemMessage && { system: typeof systemMessage.content === 'string' ? systemMessage.content : systemMessage.content.filter(p => p.type === 'text').map(p => (p as { text: string }).text).join('\n') }),
      ...(!adaptiveThinking && options.temperature !== undefined && { temperature: options.temperature }),
      ...(options.stopSequences && { stop_sequences: options.stopSequences }),
      ...(Object.keys(outputConfig).length > 0 && { output_config: outputConfig }),
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
      content: data.content.find(block => block.type === 'text')?.text || '',
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

  private formatContent(content: string | LLMContentPart[]): string | Array<Record<string, unknown>> {
    if (typeof content === 'string') return content;
    return content.map(part => {
      if (part.type === 'text') return { type: 'text', text: part.text };
      return {
        type: 'image',
        source: { type: 'base64', media_type: part.mediaType, data: part.data },
      };
    });
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
