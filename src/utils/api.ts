/**
 * API client helpers
 *
 * Shared by useTicket and useComment so both unwrap the server's response
 * envelope — and surface its error message and code — the same way.
 */

// Use relative URL to go through Vite's proxy in development
export const API_BASE = '/api';

/** An API error carrying the server's stable `code` alongside its message. */
export class ApiRequestError extends Error {
  constructor(message: string, readonly code: string | null) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

/**
 * POST JSON to the API and return the response's `data` payload. Throws
 * ApiRequestError with the server's message and code on a non-2xx response, and
 * lets AbortError propagate so callers can tell a cancel from a failure.
 */
export async function postApi<T>(
  endpoint: string,
  body: unknown,
  options: { signal?: AbortSignal; fallbackError: string },
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: options.signal,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiRequestError(data.error || options.fallbackError, data.code ?? null);
  }

  return data.data as T;
}
