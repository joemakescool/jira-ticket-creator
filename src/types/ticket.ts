/**
 * Ticket Domain Types
 * 
 * Single source of truth for ticket-related types.
 * Used across components, services, and API routes.
 */

export type TicketType = 'Task' | 'Story' | 'Bug' | 'Spike' | 'Epic';

export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export type TemplateStyle = 'Basic' | 'Detailed';

export type RefinementStyle = 
  | 'concise' 
  | 'detailed' 
  | 'technical' 
  | 'business' 
  | 'user-story' 
  | 'acceptance';

/**
 * Input for creating/generating a ticket
 */
export interface TicketInput {
  title?: string;
  description: string;
  type: TicketType;
  priority: TicketPriority;
  template: TemplateStyle;
  labels: string[];
}

/**
 * Generated ticket output
 */
export interface GeneratedTicket {
  content: string;
  title: string;
  metadata: {
    type: TicketType;
    priority: TicketPriority;
    labels: string[];
    generatedAt: string;
    model: string;
  };
}

/**
 * Ticket generation request (API)
 */
export interface GenerateTicketRequest {
  input: TicketInput;
  provider?: string;
}

/**
 * Ticket refinement request (API)
 */
export interface RefineTicketRequest {
  currentTicket: string;
  style: RefinementStyle;
  provider?: string;
}

/**
 * Title generation request (API)
 */
export interface GenerateTitleRequest {
  description: string;
  provider?: string;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Ticket type metadata for UI
 */
export interface TicketTypeConfig {
  value: TicketType;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
}

/**
 * Priority metadata for UI
 */
export interface PriorityConfig {
  value: TicketPriority;
  icon: string;
  color: string;
  description: string;
}

/**
 * Quick template preset
 */
export interface QuickTemplate {
  name: string;
  type: TicketType;
  template: string;
  labels: string[];
  description?: string;
}

/**
 * Form state for the ticket creator
 */
export interface TicketFormState extends TicketInput {
  // Additional UI state
  isGenerating: boolean;
  isRefining: boolean;
  generatedContent: string;
  editedContent: string;
  isEditMode: boolean;
  error: string | null;
}

/**
 * Default values for ticket input
 */
export const DEFAULT_TICKET_INPUT: TicketInput = {
  title: '',
  description: '',
  type: 'Task',
  priority: 'Medium',
  template: 'Basic',
  labels: [],
};
