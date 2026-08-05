/**
 * Type definitions for JiraTicketCreator components
 */

import type { TicketInput, TicketType, TicketPriority } from '../../types/ticket';
import { DEFAULT_TICKET_INPUT } from '../../types/ticket';

/**
 * TicketFormData is the UI form version of TicketInput where title, type, and
 * priority are always present (the UI always has concrete selected values).
 *
 * Note: because type and priority are always sent, the prompt's auto-detect
 * branch never fires for them, so `metadata.aiSuggested.type` / `.priority` stay
 * false. Labels are still detected when left empty.
 */
export type TicketFormData = TicketInput & {
  title: string;
  type: TicketType;
  priority: TicketPriority;
};

export const DEFAULT_TICKET_DATA: TicketFormData = {
  ...DEFAULT_TICKET_INPUT,
  title: DEFAULT_TICKET_INPUT.title ?? '',
  type: DEFAULT_TICKET_INPUT.type ?? 'Task',
  priority: DEFAULT_TICKET_INPUT.priority ?? 'Medium',
};

export type AppStep = 'describe' | 'review' | 'done';

export type MarkdownAction =
  | 'bold'
  | 'italic'
  | 'code'
  | 'codeblock'
  | 'link'
  | 'ul'
  | 'ol'
  | 'quote'
  | 'h3'
  | 'checkbox'
  | 'table';
