/**
 * Fetch with Timeout
 *
 * Wraps fetch with AbortController for timeout handling.
 * Prevents hanging requests to LLM APIs.
 */

export interface FetchWithTimeoutOptions extends RequestInit {
  timeout?: number;
}

const DEFAULT_TIMEOUT = 60000; // 60 seconds

export async function fetchWithTimeout(
  url: string,
  options: FetchWithTimeoutOptions = {}
): Promise<Response> {
  const { timeout = DEFAULT_TIMEOUT, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Provider-specific error class
 */
export class LLMApiError extends Error {
  constructor(
    public provider: string,
    public statusCode: number,
    message: string,
    public originalError?: unknown
  ) {
    super(`${provider} API error (${statusCode}): ${message}`);
    this.name = 'LLMApiError';
  }
}
