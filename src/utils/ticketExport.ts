/**
 * Ticket export helpers
 *
 * Single source for turning a ticket into markdown. Copy-as-markdown and
 * download both use this so the two exports can't drift apart.
 */

import type { Attachment } from '../types/ticket';

export interface TicketExportData {
  title: string;
  type: string;
  priority: string;
  labels: string[];
  content: string;
  attachments?: Attachment[];
}

/** Escape a string for safe interpolation into an HTML attribute or text node. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * The metadata fields that ride along with the body, as label/value pairs.
 *
 * Single source for both the copied markdown header and the header preview on
 * the Review screen, so the two can't disagree about what's included.
 */
export function getTicketMetadataFields(
  data: TicketExportData,
): [string, string][] {
  return [
    ['Type', data.type],
    ['Priority', data.priority],
    ['Labels', data.labels.length > 0 ? data.labels.join(', ') : 'None'],
  ];
}

/** Full markdown document: metadata header, body, then image links. */
export function buildTicketMarkdown(data: TicketExportData): string {
  const { title, content, attachments = [] } = data;

  const header = [
    `# ${title || 'Untitled Ticket'}`,
    '',
    ...getTicketMetadataFields(data).map(([key, value]) => `**${key}:** ${value}`),
    '',
  ].join('\n');

  const images =
    attachments.length > 0
      ? '\n\n---\n' +
        attachments.map(att => `![${att.name}](${att.previewUrl})`).join('\n')
      : '';

  return `${header}\n${content}${images}`;
}

/**
 * HTML flavour for rich clipboard payloads. Every interpolated value is escaped
 * — filenames and ticket bodies are user/model supplied, and an unescaped quote
 * used to break the surrounding markup.
 */
export function buildTicketHtml(
  data: TicketExportData,
  options: { includeHeader: boolean },
): string {
  const { title, content, attachments = [] } = data;

  const imagesHtml = attachments
    .map(
      att =>
        `<p><img src="${escapeHtml(att.previewUrl)}" alt="${escapeHtml(att.name)}" style="max-width:600px;" /></p>`,
    )
    .join('\n');

  const bodyHtml = `<div>${escapeHtml(content).replace(/\n/g, '<br />')}</div>`;

  if (!options.includeHeader) {
    return `<div>${bodyHtml}\n${imagesHtml}</div>`;
  }

  const headerHtml = getTicketMetadataFields(data)
    .map(([key, value]) => `<strong>${escapeHtml(key)}:</strong> ${escapeHtml(value)}`)
    .join('<br />');

  return [
    `<h1>${escapeHtml(title || 'Untitled Ticket')}</h1>`,
    `<p>${headerHtml}</p>`,
    bodyHtml,
    imagesHtml,
  ].join('\n');
}
