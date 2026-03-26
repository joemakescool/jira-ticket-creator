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
 * An image attachment for providing visual context to the LLM
 */
export type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

export interface Attachment {
  /** Unique ID for this attachment */
  id: string;
  /** Original file name */
  name: string;
  /** MIME type (any file type supported) */
  mediaType: string;
  /** Base64-encoded file data (no data URL prefix) */
  data: string;
  /** Data URL for rendering in the browser (images only, empty string for non-images) */
  previewUrl: string;
  /** File size in bytes */
  size: number;
}

/** Check if an attachment is a previewable image */
export function isImageAttachment(att: Attachment): boolean {
  return att.mediaType.startsWith('image/') && att.previewUrl !== '';
}

/**
 * Input for creating/generating a ticket
 */
export interface TicketInput {
  title?: string;
  description: string;
  type?: TicketType;
  priority?: TicketPriority;
  template: TemplateStyle;
  labels: string[];
  writingStyle?: RefinementStyle;
  attachments?: Attachment[];
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
    aiSuggested?: {
      type: boolean;
      priority: boolean;
      labels: boolean;
    };
    /** LLM-generated captions for attached images, keyed by attachment name */
    imageCaptions?: Record<string, string>;
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
