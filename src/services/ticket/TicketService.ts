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

import { LLMProvider } from '../llm/LLMProvider';
import {
  TicketInput,
  GeneratedTicket,
  RefinementStyle,
} from '../../types/ticket';
import {
  SYSTEM_PROMPT,
  buildTicketPrompt,
  buildTitlePrompt,
  buildRefinementPrompt,
} from '../../prompts/ticketPrompts';

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
   * Generate a full ticket from input
   * 
   * @param input - Ticket input data
   * @param provider - LLM provider to use
   * @returns Generated ticket with content and metadata
   */
  async generateTicket(
    input: TicketInput,
    provider: LLMProvider
  ): Promise<GeneratedTicket> {
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

    return {
      content: result.content.trim(),
      title: input.title || this.extractTitleFromContent(result.content),
      metadata: {
        type: input.type,
        priority: input.priority,
        labels: input.labels,
        generatedAt: new Date().toISOString(),
        model: result.model,
      },
    };
  }

  /**
   * Generate a concise title from description
   * 
   * @param description - The ticket description
   * @param provider - LLM provider to use
   * @returns Generated title
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
      temperature: 0.5, // Lower temperature for more consistent titles
    });

    // Clean up the title
    return result
      .trim()
      .replace(/^["']|["']$/g, '') // Remove quotes
      .replace(/\.$/, ''); // Remove trailing period
  }

  /**
   * Refine an existing ticket with a specific style
   * 
   * @param currentTicket - The current ticket content
   * @param style - Refinement style to apply
   * @param provider - LLM provider to use
   * @returns Refined ticket content
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
        temperature: 0.6, // Slightly lower for refinement
      }
    );

    return result.content.trim();
  }

  /**
   * Regenerate a ticket (useful after manual edits)
   * 
   * @param editedTicket - The edited ticket content
   * @param provider - LLM provider to use
   * @returns Improved ticket content
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
   * Extract title from generated content (fallback)
   */
  private extractTitleFromContent(content: string): string {
    // Try to find H2 header
    const h2Match = content.match(/^##\s+(.+)$/m);
    if (h2Match) {
      return h2Match[1].trim();
    }

    // Try first line
    const firstLine = content.split('\n')[0];
    return firstLine.replace(/^#+\s*/, '').trim().slice(0, 100);
  }
}

// Export singleton instance with default config
export const ticketService = new TicketService();
