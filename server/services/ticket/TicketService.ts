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

import { LLMProvider, LLMCompletionResult } from "../llm/LLMProvider.js";
import {
  TicketInput,
  TicketType,
  TicketPriority,
  GeneratedTicket,
  RefinementStyle,
} from "../../../src/types/ticket.js";
import {
  SYSTEM_PROMPT,
  buildTicketPrompt,
  buildTitlePrompt,
  buildRefinementPrompt,
  getTypeGuidance,
} from "../../prompts/ticketPrompts.js";

const VALID_TYPES: TicketType[] = ["Task", "Story", "Bug", "Spike", "Epic"];
const VALID_PRIORITIES: TicketPriority[] = [
  "Low",
  "Medium",
  "High",
  "Critical",
];

export interface TicketServiceConfig {
  defaultMaxTokens?: number;
  defaultTemperature?: number;
}

export class TicketService {
  private readonly config: Required<TicketServiceConfig>;

  constructor(config: TicketServiceConfig = {}) {
    this.config = {
      defaultMaxTokens: config.defaultMaxTokens || 4000,
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
    provider: LLMProvider,
  ): Promise<GeneratedTicket> {
    const needsAutoDetect =
      !input.type || !input.priority || input.labels.length === 0;
    const prompt = buildTicketPrompt(input);

    const result = await provider.complete(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      {
        maxTokens: this.config.defaultMaxTokens,
        temperature: this.config.defaultTemperature,
      },
    );

    if (needsAutoDetect) {
      const ticket = this.parseStructuredResponse(result, input);
      ticket.content = this.cleanLLMOutput(ticket.content);
      return ticket;
    }

    return {
      content: this.cleanLLMOutput(result.content),
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
    provider: LLMProvider,
  ): Promise<string> {
    if (!description?.trim()) {
      return "";
    }

    const prompt = buildTitlePrompt(description);

    const result = await provider.generate(prompt, {
      maxTokens: 50,
      temperature: 0.5,
    });

    return result
      .trim()
      .replace(/^["']|["']$/g, "")
      .replace(/\.$/, "");
  }

  /**
   * Refine an existing ticket with a specific style
   */
  async refineTicket(
    currentTicket: string,
    style: RefinementStyle,
    provider: LLMProvider,
  ): Promise<string> {
    if (!currentTicket?.trim()) {
      throw new Error("No ticket content to refine");
    }

    const prompt = buildRefinementPrompt(currentTicket, style);

    const result = await provider.complete(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      {
        maxTokens: this.config.defaultMaxTokens,
        temperature: 0.6,
      },
    );

    return this.cleanLLMOutput(result.content);
  }

  /**
   * Regenerate a ticket (useful after manual edits).
   * Accepts optional metadata so the LLM can tailor output to the ticket type/priority.
   */
  async regenerateTicket(
    editedTicket: string,
    provider: LLMProvider,
    metadata?: { title?: string; type?: string; priority?: string; labels?: string[] },
  ): Promise<string> {
    const metaEntries: [string, string][] = [
      ['Title', metadata?.title],
      ['Type', metadata?.type],
      ['Priority', metadata?.priority],
      ['Labels', metadata?.labels?.length ? metadata.labels.join(', ') : undefined],
    ].filter((entry): entry is [string, string] => !!entry[1]);

    const metaSection = metaEntries.length > 0
      ? `\n**Ticket Metadata (use this to guide tone, structure, and content):**\n${metaEntries.map(([k, v]) => `**${k}:** ${v}`).join('\n')}\n\n`
      : '';

    const typeGuidance = metadata?.type
      ? `\n${getTypeGuidance(metadata.type as TicketType)}\n`
      : '';

    const prompt = `Improve and refine this JIRA ticket while maintaining its core information and structure:
${metaSection}**Current Ticket Content:**
${editedTicket}
${typeGuidance}
Instructions:
- Improve clarity and formatting
- Ensure acceptance criteria are actionable with checkboxes (- [ ])
- Fix any grammatical issues
- Maintain the existing information
- Tailor the content to match the ticket type and priority above
- Use markdown formatting (###, -, **bold**) throughout
- Do NOT start with a title heading (## or #) — go straight into ### Context
- Do NOT wrap output in code fences (\`\`\`markdown or \`\`\`)
- Do NOT include the ticket type in the output

Return only the improved ticket content as raw markdown, no wrapping.`;

    const result = await provider.complete(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      {
        maxTokens: this.config.defaultMaxTokens,
        temperature: 0.5,
      },
    );

    return this.cleanLLMOutput(result.content);
  }

  /**
   * Parse a structured JSON response from the LLM when auto-detection is used.
   * Falls back gracefully if JSON parsing fails.
   */
  private parseStructuredResponse(
    result: LLMCompletionResult,
    input: TicketInput,
  ): GeneratedTicket {
    try {
      // Try to extract JSON from response (handle markdown code fences)
      const jsonMatch =
        result.content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) ||
        result.content.match(/(\{[\s\S]*\})/);

      if (!jsonMatch) throw new Error("No JSON found in response");

      const jsonStr = jsonMatch[1] || jsonMatch[0];
      const parsed = this.safeParseJSON(jsonStr) as {
        content?: string;
        title?: string;
        type?: string;
        priority?: string;
        labels?: unknown[];
      };

      const detectedType = this.validateType(parsed.type);
      const detectedPriority = this.validatePriority(parsed.priority);
      const detectedLabels = Array.isArray(parsed.labels)
        ? parsed.labels
            .filter((l: unknown): l is string => typeof l === "string")
            .slice(0, 10)
        : [];

      return {
        content: (parsed.content || result.content).trim(),
        title:
          parsed.title ||
          input.title ||
          this.extractTitleFromContent(parsed.content || result.content),
        metadata: {
          type: detectedType || input.type || "Task",
          priority: detectedPriority || input.priority || "Medium",
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
      console.error("Failed to parse structured response:", err);
      return {
        content: result.content.trim(),
        title: input.title || this.extractTitleFromContent(result.content),
        metadata: {
          type: input.type || "Task",
          priority: input.priority || "Medium",
          labels: input.labels,
          generatedAt: new Date().toISOString(),
          model: result.model,
        },
      };
    }
  }

  /**
   * Parse JSON that may contain literal newlines inside string values.
   * LLMs frequently return multiline content in JSON strings without
   * escaping the newlines, which breaks JSON.parse.
   */
  private safeParseJSON(str: string): Record<string, unknown> {
    try {
      return JSON.parse(str);
    } catch {
      // Escape literal newlines/tabs inside JSON string values
      const fixed = str.replace(
        /"((?:[^"\\]|\\.)*)"/gs,
        (_match, inner: string) =>
          '"' +
          inner
            .replace(/\n/g, "\\n")
            .replace(/\r/g, "\\r")
            .replace(/\t/g, "\\t") +
          '"',
      );
      return JSON.parse(fixed);
    }
  }

  /**
   * Clean raw LLM output by stripping code fences and leading title headings.
   * LLMs frequently wrap output in ```markdown ... ``` and prepend ## Title
   * even when instructed not to.
   */
  private cleanLLMOutput(raw: string): string {
    let content = raw.trim();
    // Strip wrapping code fences (```markdown, ```md, or bare ```)
    content = content.replace(/^```(?:markdown|md)?\s*\n?([\s\S]*?)\n?\s*```$/s, '$1').trim();
    // Strip leading title heading
    content = this.stripLeadingTitle(content);
    return content;
  }

  /**
   * Remove a leading ## title heading from content.
   * The title is displayed separately in the UI, so duplicating it
   * inside the content body looks wrong.
   */
  private stripLeadingTitle(content: string): string {
    // Match a leading H2 (## Something) optionally followed by a blank line
    return content.replace(/^##\s+[^\n]+\n?\n?/, "").trim();
  }

  private validateType(type: unknown): TicketType | null {
    if (typeof type === "string" && VALID_TYPES.includes(type as TicketType)) {
      return type as TicketType;
    }
    return null;
  }

  private validatePriority(priority: unknown): TicketPriority | null {
    if (
      typeof priority === "string" &&
      VALID_PRIORITIES.includes(priority as TicketPriority)
    ) {
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

    const firstLine = content.split("\n")[0];
    return firstLine
      .replace(/^#+\s*/, "")
      .trim()
      .slice(0, 100);
  }
}

// Export singleton instance with default config
export const ticketService = new TicketService();
