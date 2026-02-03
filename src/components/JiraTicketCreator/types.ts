/**
 * Type definitions for JiraTicketCreator components
 */

export interface TicketFormData {
  title: string;
  description: string;
  type: 'Task' | 'Story' | 'Bug' | 'Spike' | 'Epic';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  template: 'Basic' | 'Detailed';
  labels: string[];
}

export const DEFAULT_TICKET_DATA: TicketFormData = {
  title: '',
  description: '',
  type: 'Task',
  priority: 'Medium',
  template: 'Basic',
  labels: []
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
