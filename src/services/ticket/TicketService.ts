/**
 * Ticket Service
 *
 * Core business logic for ticket generation.
 * Uses the LLM abstraction layer - doesn't know or care which provider is used.
 *
 * Single Responsibility: Ticket generation and manipulation
 * Open/Closed: New generation strategies without modifying existing code
 * Dependency Inversion: Depends on LLMProvider interface, not implementations
 */

import { LLMProvider, LLMCompletionResult } from '../llm/LLMProvider.js';
import {
  TicketInput,
  TicketType,
  TicketPriority,
  GeneratedTicket,
  RefinementStyle,
} from '../../types/ticket.js';
import {
  SYSTEM_PROMPT,
  buildTicketPrompt,
  buildTitlePrompt,
  buildRefinementPrompt,
} from '../../prompts/ticketPrompts.js';

const VALID_TYPES: TicketType[] = ['Task', 'Story', 'Bug', 'Spike', 'Epic'];
const VALID_PRIORITIES: TicketPriority[] = ['Low', 'Medium', 'High', 'Critical'];

export interface TicketServiceConfig {
  defaultMaxTokens?: number;
  defaultTemperature?: number;
}

export class TicketService {
  private readonly config: Required<TicketServiceConfig>;

  constructor(config: TicketServiceConfig = {}) {
    this.config = {
      defaultMaxTokens: config.defaultMaxTokens || 2048,
      defaultTemperature: config.defaultTemperature || 0.7,
    };
  }

  /**
   * Generate a full ticket from input.
   * When type/priority are not provided, instructs the LLM to auto-detect them
   * and return structured JSON.
   */
  async generateTicket(
    input: TicketInput,
    provider: LLMProvider
  ): Promise<GeneratedTicket> {
    const needsAutoDetect = !input.type || !input.priority || input.labels.length === 0;
    const prompt = buildTicketPrompt(input);

    const result = await provider.complete(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      {
        maxTokens: this.config.defaultMaxTokens,
        temperature: this.config.defaultTemperature,
      }
    );

    if (needsAutoDetect) {
      return this.parseStructuredResponse(result, input);
    }

    return {
      content: result.content.trim(),
      title: input.title || this.extractTitleFromContent(result.content),
      metadata: {
        type: input.type!,
        priority: input.priority!,
        labels: input.labels,
        generatedAt: new Date().toISOString(),
        model: result.model,
      },
    };
  }

  /**
   * Generate a concise title from description
   */
  async generateTitle(
    description: string,
    provider: LLMProvider
  ): Promise<string> {
    if (!description?.trim()) {
      return '';
    }

    const prompt = buildTitlePrompt(description);

    const result = await provider.generate(prompt, {
      maxTokens: 50,
      temperature: 0.5,
    });

    return result
      .trim()
      .replace(/^["']|["']$/g, '')
      .replace(/\.$/, '');
  }

  /**
   * Refine an existing ticket with a specific style
   */
  async refineTicket(
    currentTicket: string,
    style: RefinementStyle,
    provider: LLMProvider
  ): Promise<string> {
    if (!currentTicket?.trim()) {
      throw new Error('No ticket content to refine');
    }

    const prompt = buildRefinementPrompt(currentTicket, style);

    const result = await provider.complete(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      {
        maxTokens: this.config.defaultMaxTokens,
        temperature: 0.6,
      }
    );

    return result.content.trim();
  }

  /**
   * Regenerate a ticket (useful after manual edits)
   */
  async regenerateTicket(
    editedTicket: string,
    provider: LLMProvider
  ): Promise<string> {
    const prompt = `Improve and refine this JIRA ticket while maintaining its core information and structure:

${editedTicket}

Instructions:
- Improve clarity and formatting
- Ensure acceptance criteria are actionable
- Fix any grammatical issues
- Maintain the existing information

Return only the improved ticket content.`;

    const result = await provider.complete(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      {
        maxTokens: this.config.defaultMaxTokens,
        temperature: 0.5,
      }
    );

    return result.content.trim();
  }

  /**
   * Parse a structured JSON response from the LLM when auto-detection is used.
   * Falls back gracefully if JSON parsing fails.
   */
  private parseStructuredResponse(
    result: LLMCompletionResult,
    input: TicketInput
  ): GeneratedTicket {
    try {
      // Try to extract JSON from response (handle markdown code fences)
      const jsonMatch = result.content.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
        || result.content.match(/(\{[\s\S]*\})/);

      if (!jsonMatch) throw new Error('No JSON found in response');

      const jsonStr = jsonMatch[1] || jsonMatch[0];
      const parsed = JSON.parse(jsonStr);

      const detectedType = this.validateType(parsed.type);
      const detectedPriority = this.validatePriority(parsed.priority);
      const detectedLabels = Array.isArray(parsed.labels)
        ? parsed.labels.filter((l: unknown): l is string => typeof l === 'string').slice(0, 10)
        : [];

      return {
        content: (parsed.content || result.content).trim(),
        title: parsed.title || input.title || this.extractTitleFromContent(parsed.content || result.content),
        metadata: {
          type: detectedType || input.type || 'Task',
          priority: detectedPriority || input.priority || 'Medium',
          labels: detectedLabels.length > 0 ? detectedLabels : input.labels,
          generatedAt: new Date().toISOString(),
          model: result.model,
          aiSuggested: {
            type: !input.type && !!detectedType,
            priority: !input.priority && !!detectedPriority,
            labels: input.labels.length === 0 && detectedLabels.length > 0,
          },
        },
      };
    } catch (err) {
      // Fallback: treat entire response as content with defaults
      console.error('Failed to parse structured response:', err);
      return {
        content: result.content.trim(),
        title: input.title || this.extractTitleFromContent(result.content),
        metadata: {
          type: input.type || 'Task',
          priority: input.priority || 'Medium',
          labels: input.labels,
          generatedAt: new Date().toISOString(),
          model: result.model,
        },
      };
    }
  }

  private validateType(type: unknown): TicketType | null {
    if (typeof type === 'string' && VALID_TYPES.includes(type as TicketType)) {
      return type as TicketType;
    }
    return null;
  }

  private validatePriority(priority: unknown): TicketPriority | null {
    if (typeof priority === 'string' && VALID_PRIORITIES.includes(priority as TicketPriority)) {
      return priority as TicketPriority;
    }
    return null;
  }

  /**
   * Extract title from generated content (fallback)
   */
  private extractTitleFromContent(content: string): string {
    const h2Match = content.match(/^##\s+(.+)$/m);
    if (h2Match) {
      return h2Match[1].trim();
    }

    const firstLine = content.split('\n')[0];
    return firstLine.replace(/^#+\s*/, '').trim().slice(0, 100);
  }
}

// Export singleton instance with default config
export const ticketService = new TicketService();
