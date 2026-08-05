/**
 * Request size limits — single source of truth.
 *
 * These were previously split between the Zod schemas and the Express body
 * parser and contradicted each other: the schema permitted 10 attachments of
 * 10 MB each (100 MB) while the parser capped the body at 50 MB, so a large
 * upload died in the parser with an opaque error before Zod's friendly message
 * could run. The parser limit is now derived from the schema's own arithmetic.
 */

// Attachment limits live in src/types/ticket.ts so the browser enforces exactly
// what the API does — the client previously allowed 10 MB files that this
// schema then rejected.
export {
  MAX_ATTACHMENT_BASE64 as MAX_ATTACHMENT_SIZE,
  MAX_ATTACHMENTS,
  SUPPORTED_IMAGE_MEDIA_TYPES,
} from '../../src/types/ticket.js';

import {
  MAX_ATTACHMENT_BASE64,
  MAX_ATTACHMENTS as MAX_ATTACHMENTS_VALUE,
} from '../../src/types/ticket.js';

export const MAX_DESCRIPTION_LENGTH = 5000;
export const MAX_TITLE_LENGTH = 100;
export const MAX_LABEL_LENGTH = 50;
export const MAX_LABELS = 10;
export const MAX_TICKET_CONTENT_LENGTH = 10000;

/** Headroom for JSON envelope, field names, and the non-attachment fields. */
const BODY_OVERHEAD_BYTES = 2 * 1024 * 1024;

/** Express body-parser limit, derived so it can't drift from the schema. */
export const MAX_REQUEST_BODY_BYTES =
  MAX_ATTACHMENT_BASE64 * MAX_ATTACHMENTS_VALUE + BODY_OVERHEAD_BYTES;

/** The same figure formatted for `express.json({ limit })`. */
export const MAX_REQUEST_BODY_LIMIT = `${Math.ceil(MAX_REQUEST_BODY_BYTES / (1024 * 1024))}mb`;

