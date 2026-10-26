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

import {
  LLMProvider,
  LLMMessage,
  LLMContentPart,
  LLMCompletionResult,
  LLMJsonSchema,
} from "../llm/LLMProvider.js";
import { ticketLogger as logger } from "../../lib/logger.js";
import { ApiError } from "../../lib/errors.js";
import {
  TicketInput,
  TicketType,
  TicketPriority,
  GeneratedTicket,
  RefinementStyle,
  CommentInput,
  GeneratedComment,
} from "../../../src/types/ticket.js";
import {
  SYSTEM_PROMPT,
  COMMENT_SYSTEM_PROMPT,
  buildTicketPrompt,
  buildTitlePrompt,
  buildRefinementPrompt,
  buildCommentPrompt,
  getTypeGuidance,
} from "../../prompts/ticketPrompts.js";

/**
 * Schema for the generated-ticket JSON, used by providers that enforce
 * structured output. Every object needs `additionalProperties: false` and a
 * `required` list, and free-form maps aren't expressible — which is why
 * `imageCaptions` is an array of name/caption pairs rather than an object.
 */
const TICKET_JSON_SCHEMA: LLMJsonSchema = {
  name: "generated_ticket",
  schema: {
    type: "object",
    properties: {
      title: { type: "string" },
      type: { type: "string", enum: ["Task", "Story", "Bug", "Spike", "Epic"] },
      priority: { type: "string", enum: ["Low", "Medium", "High", "Critical"] },
      labels: { type: "array", items: { type: "string" } },
      content: { type: "string" },
      imageCaptions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            caption: { type: "string" },
          },
          required: ["name", "caption"],
          additionalProperties: false,
        },
      },
    },
    required: ["title", "type", "priority", "labels", "content"],
    additionalProperties: false,
  },
};

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
    const prompt = buildTicketPrompt(input);

    const userMessage = this.buildUserMessage(prompt, input.attachments);

    const result = await provider.complete(
      [
        { role: "system", content: SYSTEM_PROMPT },
        userMessage,
      ],
      {
        maxTokens: this.config.defaultMaxTokens,
        temperature: this.config.defaultTemperature,
        jsonSchema: TICKET_JSON_SCHEMA,
      },
    );

    // The prompt always requests JSON; providers advertising structured output
    // additionally guarantee it, so the lenient repair path is only reachable
    // for the others.
    const ticket = this.parseStructuredResponse(result, input);
    ticket.content = this.cleanLLMOutput(ticket.content);
    return ticket;
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
      // An eight-word title needs no deliberation; this is the cheapest and
      // fastest path through the provider.
      effort: 'low',
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
   * Generate a comment on an existing ticket from the user's notes.
   */
  async generateComment(
    input: CommentInput,
    provider: LLMProvider,
  ): Promise<GeneratedComment> {
    const result = await provider.complete(
      [
        { role: "system", content: COMMENT_SYSTEM_PROMPT },
        { role: "user", content: buildCommentPrompt(input) },
      ],
      {
        // A comment is a paragraph or two; this also bounds a runaway reply.
        maxTokens: 1000,
        temperature: 0.5,
        // Rewording notes needs little deliberation, and the user is waiting.
        effort: "low",
      },
    );

    // Not cleanLLMOutput: its leading-## strip removes a ticket's duplicated
    // title, but a comment has no separate title — if the model ignores the
    // no-headings rule, that line is real content and must survive.
    const content = this.stripCodeFences(result.content);

    if (!content) {
      // A distinct, client-safe failure rather than a generic 500 — the usual
      // cause is a model spending its whole budget thinking.
      throw new ApiError(
        "The AI returned an empty comment. Try again, or switch providers.",
        502,
        "provider_empty_response",
      );
    }

    return {
      content,
      model: result.model,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Build a user message, optionally with image attachments for multimodal input.
   */
  private buildUserMessage(
    prompt: string,
    attachments?: { mediaType: string; data: string; name: string }[],
  ): LLMMessage {
    if (!attachments || attachments.length === 0) {
      return { role: "user", content: prompt };
    }

    const images = attachments.filter((a) => a.mediaType.startsWith("image/"));
    const nonImages = attachments.filter((a) => !a.mediaType.startsWith("image/"));

    // If no images to send via vision, just mention the files in text
    if (images.length === 0) {
      const fileList = nonImages.map((a) => a.name).join(", ");
      return {
        role: "user",
        content: `${prompt}\n\nThe user has also attached these files for reference: ${fileList}. Mention them in the ticket where relevant.`,
      };
    }

    const content: LLMContentPart[] = [
      { type: "text", text: prompt },
    ];

    // Mention non-image files by name
    if (nonImages.length > 0) {
      const fileList = nonImages.map((a) => a.name).join(", ");
      content.push({
        type: "text",
        text: `\n\nThe user has also attached these files for reference: ${fileList}. Mention them in the ticket where relevant.`,
      });
    }

    content.push({
      type: "text",
      text: `\n\nThe user has attached ${images.length} image(s) for additional context. Examine them carefully and incorporate relevant details into the ticket.\n\nAlso include an "imageCaptions" field in your JSON response — an array of objects, each with "name" (the image filename) and "caption" (a brief one-sentence description of what it shows). Image filenames: ${images.map((a) => a.name).join(", ")}`,
    });

    content.push(
      ...images.map(
        (att): LLMContentPart => ({
          type: "image" as const,
          mediaType: att.mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
          data: att.data,
        }),
      ),
    );

    return { role: "user", content };
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
        imageCaptions?: unknown;
      };

      const imageCaptions = this.normaliseImageCaptions(parsed.imageCaptions);

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
          ...(imageCaptions && { imageCaptions }),
        },
      };
    } catch (err) {
      // Fallback: treat entire response as content with defaults.
      // Reaching here means the prompt and the parser disagreed, or the model
      // ignored the JSON contract — the ticket still renders, but the
      // LLM-authored title and aiSuggested metadata are lost.
      logger.warn(
        {
          err,
          model: result.model,
          contentPreview: result.content.slice(0, 200),
        },
        "Failed to parse structured response — recovering fields individually",
      );

      // Salvage the fields directly. Without this, a response containing a code
      // sample with quotes would surface the JSON envelope as the ticket body
      // and a title of "{".
      const salvagedContent = this.extractJsonString(result.content, "content");
      const salvagedTitle = this.extractJsonString(result.content, "title");

      const body = salvagedContent
        ?? (this.looksLikeJsonEnvelope(result.content)
          // Recognisable envelope we still can't read: better to say so than to
          // paste JSON into the user's ticket.
          ? ""
          : result.content.trim());

      return {
        content: body.trim(),
        title:
          salvagedTitle?.trim() ||
          input.title ||
          (body ? this.extractTitleFromContent(body) : "Untitled Ticket"),
        metadata: {
          type: this.validateType(this.extractJsonString(result.content, "type"))
            ?? input.type
            ?? "Task",
          priority:
            this.validatePriority(this.extractJsonString(result.content, "priority"))
            ?? input.priority
            ?? "Medium",
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
  /**
   * Extract one string field from a loosely-formed JSON object.
   *
   * Whole-document repair can't survive a fenced code sample inside `content`:
   * quotes in the sample break the repair regex's idea of where strings end, so
   * JSON.parse throws and the caller would otherwise surface the raw envelope.
   * This scans for the key and walks its value, honouring backslash escapes and
   * tolerating literal newlines. A quote only closes the value if the next
   * non-whitespace character is `,` or `}` — which is what lets `const x = "y";`
   * inside a code block pass through untouched.
   */
  private extractJsonString(src: string, key: string): string | null {
    const keyIndex = src.indexOf(`"${key}"`);
    if (keyIndex === -1) return null;

    const colon = src.indexOf(':', keyIndex + key.length + 2);
    if (colon === -1) return null;

    let i = colon + 1;
    while (i < src.length && /\s/.test(src[i])) i++;
    if (src[i] !== '"') return null;

    i++; // step past the opening quote
    let out = '';
    while (i < src.length) {
      const ch = src[i];

      if (ch === '\\') {
        const next = src[i + 1];
        // Preserve valid escapes; drop a stray backslash rather than corrupting.
        if (next === 'n') out += '\n';
        else if (next === 't') out += '\t';
        else if (next === 'r') out += '\r';
        else if (next === '"' || next === '\\' || next === '/') out += next;
        else out += next ?? '';
        i += 2;
        continue;
      }

      if (ch === '"') {
        let j = i + 1;
        while (j < src.length && /\s/.test(src[j])) j++;
        if (src[j] === ',' || src[j] === '}' || j >= src.length) {
          return out;
        }
        // An interior quote (e.g. inside a code sample) — keep it.
        out += ch;
        i++;
        continue;
      }

      out += ch;
      i++;
    }

    // Ran out of input: the response was truncated mid-string. Return what we
    // have rather than nothing — a partial ticket beats a raw JSON dump.
    return out.length > 0 ? out : null;
  }

  /**
   * Accept either shape of image captions.
   *
   * Structured-output providers return `[{name, caption}]` because Anthropic's
   * schema subset can't express a free-form map; unconstrained providers tend to
   * return `{name: caption}`. Both normalise to the record the UI consumes.
   */
  private normaliseImageCaptions(raw: unknown): Record<string, string> | null {
    if (!raw) return null;

    if (Array.isArray(raw)) {
      const entries = raw
        .filter(
          (item): item is { name: string; caption: string } =>
            typeof item === "object" &&
            item !== null &&
            typeof (item as { name?: unknown }).name === "string" &&
            typeof (item as { caption?: unknown }).caption === "string",
        )
        .map(item => [item.name, item.caption] as const);

      return entries.length > 0 ? Object.fromEntries(entries) : null;
    }

    if (typeof raw === "object") {
      const entries = Object.entries(raw as Record<string, unknown>).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      );
      return entries.length > 0 ? Object.fromEntries(entries) : null;
    }

    return null;
  }

  /** True when a response is an unparsed JSON envelope rather than markdown. */
  private looksLikeJsonEnvelope(raw: string): boolean {
    const trimmed = raw.trimStart();
    return trimmed.startsWith('{') && /"content"\s*:/.test(trimmed);
  }

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
    return this.stripLeadingTitle(this.stripCodeFences(raw));
  }

  /** Strip wrapping code fences (```markdown, ```md, or bare ```). */
  private stripCodeFences(raw: string): string {
    return raw
      .trim()
      .replace(/^```(?:markdown|md)?\s*\n?([\s\S]*?)\n?\s*```$/s, '$1')
      .trim();
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
    // Skip common section headings that aren't real titles
    const sectionHeadings = new Set([
      "context", "expected outcome", "acceptance criteria",
      "description", "summary", "details", "background",
      "requirements", "notes", "steps", "overview",
    ]);

    // Look for a ## heading that isn't a generic section heading
    const h2Matches = content.matchAll(/^##\s+(.+)$/gm);
    for (const match of h2Matches) {
      const heading = match[1].trim();
      if (!sectionHeadings.has(heading.toLowerCase())) {
        return heading.slice(0, 100);
      }
    }

    // Fall back to first non-empty, non-heading line
    const lines = content.split("\n");
    for (const line of lines) {
      const trimmed = line.replace(/^#+\s*/, "").trim();
      if (trimmed && !sectionHeadings.has(trimmed.toLowerCase())) {
        return trimmed.slice(0, 100);
      }
    }

    return "Untitled Ticket";
  }
}

// Export singleton instance with default config
export const ticketService = new TicketService();
