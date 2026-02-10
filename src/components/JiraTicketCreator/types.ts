/**
 * Type definitions for JiraTicketCreator components
 */

import type { TicketInput } from '../../types/ticket';
import { DEFAULT_TICKET_INPUT } from '../../types/ticket';

/**
 * TicketFormData is the UI form version of TicketInput where title is always
 * present (even if empty string), since the form always renders a title field.
 */
export type TicketFormData = TicketInput & { title: string };

export const DEFAULT_TICKET_DATA: TicketFormData = {
  ...DEFAULT_TICKET_INPUT,
  title: DEFAULT_TICKET_INPUT.title ?? '',
};

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
