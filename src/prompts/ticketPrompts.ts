/**
 * Prompt Templates for JIRA Ticket Generation
 *
 * Why separate prompts into their own module?
 * 1. Version control - track prompt changes over time
 * 2. Testability - test prompts in isolation
 * 3. A/B testing - easily swap prompt versions
 * 4. Documentation - prompts are self-documenting
 * 5. Reusability - share prompts across different features
 */

import { TicketInput, TicketType, RefinementStyle } from '../types/ticket';

/**
 * System prompt that sets Claude's context and behavior
 */
export const SYSTEM_PROMPT = `You are an expert technical writer specializing in JIRA tickets and agile documentation.

Your tickets are:
- Clear and actionable
- Well-structured with proper sections
- Focused on outcomes, not implementation details (unless technical)
- Written for the intended audience (devs, PMs, stakeholders)

You use markdown formatting effectively:
- Headers for sections (##, ###)
- Checkboxes for acceptance criteria (- [ ])
- Code blocks for technical details
- Bold for emphasis on key points

You never include the ticket type in the output (it's metadata, not content).`;

/**
 * Generate the main ticket content.
 * When type/priority/labels are not provided, requests structured JSON
 * so the service can parse out AI-detected metadata.
 */
export function buildTicketPrompt(input: TicketInput): string {
  const { title, description, type, priority, labels, template, writingStyle } = input;
  const needsAutoDetect = !type || !priority || labels.length === 0;

  const templateGuidance = getTemplateGuidance(template);
  const styleGuidance = writingStyle ? getWritingStyleGuidance(writingStyle) : '';

  if (needsAutoDetect) {
    return buildAutoDetectPrompt(input, templateGuidance, styleGuidance);
  }

  const typeGuidance = getTypeGuidance(type);

  return `Generate a JIRA ticket with the following information:

**Title:** ${title || 'Generate an appropriate title'}
**Type:** ${type}
**Priority:** ${priority}
**Labels:** ${labels.length > 0 ? labels.join(', ') : 'None specified'}

**Description/Context:**
${description || 'No description provided'}

---

**Instructions:**
${typeGuidance}

${templateGuidance}

${styleGuidance}

**Format Requirements:**
- Do NOT start with a title heading — go straight into the Context section
- Include a "Context" or "Description" section (### Context)
- Include "Acceptance Criteria" with checkboxes (- [ ])
- Do NOT include the ticket type in the output
- Use markdown formatting throughout

Return only the formatted ticket content, no explanations.`;
}

/**
 * Build a prompt that asks the LLM to auto-detect type, priority, and labels
 * and return structured JSON.
 */
function buildAutoDetectPrompt(
  input: TicketInput,
  templateGuidance: string,
  styleGuidance: string,
): string {
  const { description, type, priority, labels } = input;

  const detectInstructions: string[] = [];
  if (!type) {
    detectInstructions.push(
      '- **type**: The most appropriate ticket type. Choose from: Task, Story, Bug, Spike, Epic. '
      + 'Use Bug for issues/crashes/broken behavior, Story for user-facing features, '
      + 'Spike for research/investigation, Epic for large initiatives, Task for everything else.'
    );
  }
  if (!priority) {
    detectInstructions.push(
      '- **priority**: The appropriate priority. Choose from: Low, Medium, High, Critical. '
      + 'Use Critical for data loss/security/production crashes, High for significant impact, '
      + 'Low for nice-to-haves/minor improvements, Medium as default.'
    );
  }
  if (labels.length === 0) {
    detectInstructions.push(
      '- **labels**: 2-5 relevant lowercase labels based on the content '
      + '(e.g., "frontend", "backend", "api", "security", "performance", "ui", "database", "mobile", "testing").'
    );
  }

  return `Analyze the following description and generate a JIRA ticket.

**Description/Context:**
${description}

**Auto-detect the following from the description:**
${detectInstructions.join('\n')}

${type ? `**Type (user-specified):** ${type}` : ''}
${priority ? `**Priority (user-specified):** ${priority}` : ''}
${labels.length > 0 ? `**Labels (user-specified):** ${labels.join(', ')}` : ''}

${templateGuidance}

${styleGuidance}

**CRITICAL: Respond with ONLY valid JSON in this exact format (no other text):**
\`\`\`json
{
  "title": "Concise ticket title (max 8 words, start with action verb)",
  "type": "${type || '<detected>'}",
  "priority": "${priority || '<detected>'}",
  "labels": ${labels.length > 0 ? JSON.stringify(labels) : '["label1", "label2"]'},
  "content": "Full markdown ticket content. Do NOT start with a title heading — go straight into ### Context. Include Context/Description section and Acceptance Criteria with checkboxes (- [ ]). Use markdown formatting. Do NOT include the ticket type in the content."
}
\`\`\``;
}

/**
 * Generate a concise title from description
 */
export function buildTitlePrompt(description: string): string {
  return `Generate a concise JIRA ticket title (maximum 8 words) for this description:

"${description}"

Requirements:
- Start with an action verb (Fix, Add, Update, Implement, Remove, Refactor)
- Be specific but brief
- No periods or special characters at the end
- Focus on the outcome, not the implementation

Return only the title, nothing else.`;
}

/**
 * Refine an existing ticket with a specific style
 */
export function buildRefinementPrompt(
  currentTicket: string,
  style: RefinementStyle
): string {
  const styleInstructions = getRefinementInstructions(style);

  return `Refine this JIRA ticket with the following adjustment:

**Current Ticket:**
${currentTicket}

**Refinement Request:**
${styleInstructions}

**Instructions:**
- Maintain the overall structure and format
- Keep all existing information that's still relevant
- Apply the refinement while preserving clarity
- Ensure acceptance criteria remain actionable

Return only the refined ticket content.`;
}

// --- Helper Functions ---

function getTypeGuidance(type: TicketType): string {
  const guidance: Record<TicketType, string> = {
    Task: `This is a Task - focus on:
- Clear definition of work to be done
- Specific deliverables
- Dependencies or blockers`,

    Story: `This is a User Story - focus on:
- User perspective and benefits
- Include "As a [user], I want [feature], so that [benefit]" format
- Business value and user outcomes`,

    Bug: `This is a Bug Report - focus on:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Impact and severity`,

    Spike: `This is a Spike/Research task - focus on:
- Questions to be answered
- Research goals and scope
- Time-boxed deliverables
- Expected outputs (document, POC, recommendation)`,

    Epic: `This is an Epic - focus on:
- High-level business objective
- Success metrics
- Key milestones or phases
- Related features or stories`,
  };

  return guidance[type] || guidance.Task;
}

function getTemplateGuidance(template: 'Basic' | 'Detailed'): string {
  if (template === 'Detailed') {
    return `**Template Style: Detailed**
Include these sections:
- Context / Background
- Problem Statement
- Proposed Solution
- Technical Approach (if applicable)
- Acceptance Criteria (comprehensive)
- Out of Scope
- Dependencies
- Risks / Considerations`;
  }

  return `**Template Style: Basic**
Include these sections:
- Context
- Expected Outcome
- Acceptance Criteria`;
}

function getRefinementInstructions(style: RefinementStyle): string {
  const instructions: Record<RefinementStyle, string> = {
    concise: `Make this ticket more concise:
- Remove redundant information
- Tighten language without losing meaning
- Focus on essential details only
- Keep acceptance criteria clear but brief`,

    detailed: `Add more comprehensive details:
- Expand context and background
- Add technical considerations
- Include more specific acceptance criteria
- Add potential edge cases or considerations`,

    technical: `Make this more technical:
- Add implementation details
- Include technical requirements and constraints
- Reference specific technologies or systems
- Add technical acceptance criteria`,

    business: `Focus more on business value:
- Emphasize user/customer impact
- Include ROI or business metrics if applicable
- Frame in terms of business outcomes
- Add success criteria from business perspective`,

    'user-story': `Convert to user story format:
- Lead with "As a [user type]..."
- Focus on user benefits and outcomes
- Frame acceptance criteria from user perspective
- Include user journey context`,

    acceptance: `Expand the acceptance criteria:
- Add more specific test cases
- Include edge cases and error scenarios
- Add performance or quality criteria
- Make each criterion independently verifiable`,
  };

  return instructions[style] || instructions.detailed;
}

function getWritingStyleGuidance(style: RefinementStyle): string {
  const guidance: Record<RefinementStyle, string> = {
    concise: '**Writing Style: Concise** - Keep the ticket brief and focused. Minimize filler, use direct language.',
    detailed: '**Writing Style: Detailed** - Be thorough. Include background, edge cases, and comprehensive acceptance criteria.',
    technical: '**Writing Style: Technical** - Focus on implementation details, technical requirements, and system-level concerns.',
    business: '**Writing Style: Business-Focused** - Emphasize user/customer impact, business metrics, and ROI.',
    'user-story': '**Writing Style: User Story** - Frame everything from the user perspective. Use "As a [user]..." format.',
    acceptance: '**Writing Style: Criteria-Heavy** - Emphasize detailed, verifiable acceptance criteria with edge cases.',
  };
  return guidance[style] || '';
}
