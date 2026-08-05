/**
 * Fetch with Timeout
 *
 * Wraps fetch with AbortController for timeout handling.
 * Prevents hanging requests to LLM APIs.
 */

import { ApiError } from '../../../lib/errors.js';
import { llmLogger as logger } from '../../../lib/logger.js';

export interface FetchWithTimeoutOptions extends RequestInit {
  timeout?: number;
  /**
   * Retry attempts after the first, for transient upstream failures only.
   * Defaults to 2. Generation requests are effectively idempotent (a retry just
   * produces another completion), so this is safe for the POSTs we make.
   */
  retries?: number;
}

const DEFAULT_TIMEOUT = 60000; // 60 seconds
const DEFAULT_RETRIES = 2;
const BASE_BACKOFF_MS = 500;
const MAX_BACKOFF_MS = 8000;

/** Statuses worth retrying: rate limits, gateway hiccups, and overload. */
const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504, 529]);

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Honour `Retry-After` when the provider sends one (seconds or HTTP date),
 * otherwise fall back to exponential backoff with jitter. Jitter matters when
 * several requests get rate limited together — without it they all retry on the
 * same beat and trip the limit again.
 */
function backoffFor(attempt: number, response?: Response): number {
  const header = response?.headers.get('retry-after');
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return Math.min(seconds * 1000, MAX_BACKOFF_MS);
    }
    const asDate = Date.parse(header);
    if (!Number.isNaN(asDate)) {
      return Math.min(Math.max(asDate - Date.now(), 0), MAX_BACKOFF_MS);
    }
  }

  const exponential = Math.min(BASE_BACKOFF_MS * 2 ** attempt, MAX_BACKOFF_MS);
  return exponential / 2 + Math.random() * (exponential / 2);
}

async function fetchOnce(
  url: string,
  fetchOptions: RequestInit,
  timeout: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    return await fetch(url, { ...fetchOptions, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchWithTimeout(
  url: string,
  options: FetchWithTimeoutOptions = {}
): Promise<Response> {
  const {
    timeout = DEFAULT_TIMEOUT,
    retries = DEFAULT_RETRIES,
    ...fetchOptions
  } = options;

  let lastNetworkError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    let response: Response | undefined;

    try {
      response = await fetchOnce(url, fetchOptions, timeout);
    } catch (error) {
      lastNetworkError = error;
      // A timeout is the caller's ceiling, not a transient blip — don't spend
      // another full timeout window on it.
      const isTimeout = error instanceof Error && error.message.startsWith('Request timeout');
      if (isTimeout || attempt === retries) throw error;

      const delay = backoffFor(attempt);
      logger.warn({ url, attempt: attempt + 1, delay }, 'Request failed, retrying');
      await sleep(delay);
      continue;
    }

    if (!RETRYABLE_STATUSES.has(response.status) || attempt === retries) {
      return response;
    }

    const delay = backoffFor(attempt, response);
    logger.warn(
      { url, status: response.status, attempt: attempt + 1, delay },
      'Upstream returned a retryable status, retrying',
    );
    await sleep(delay);
  }

  // Unreachable: the loop either returns or throws on its final attempt.
  throw lastNetworkError ?? new Error('Request failed');
}

/**
 * Translate an upstream provider status into one that means the right thing to
 * our own client, plus a stable code it can branch on.
 *
 * The upstream status can't be forwarded verbatim: a 401 from Anthropic means
 * *our* server's key is wrong, not that the browser is unauthenticated, and
 * echoing it would invite the client to start an auth flow.
 */
function mapProviderStatus(
  provider: string,
  upstream: number,
): { statusCode: number; code: string; clientMessage: string } {
  if (upstream === 401 || upstream === 403) {
    return {
      statusCode: 502,
      code: 'provider_auth_failed',
      clientMessage: `The ${provider} API key is missing, invalid, or lacks access to the configured model.`,
    };
  }
  if (upstream === 404) {
    return {
      statusCode: 502,
      code: 'provider_model_not_found',
      clientMessage: `The configured ${provider} model was not found. Check the model name in your .env.`,
    };
  }
  if (upstream === 429) {
    return {
      statusCode: 429,
      code: 'provider_rate_limited',
      clientMessage: `${provider} is rate limiting requests. Wait a moment and try again.`,
    };
  }
  if (upstream === 408) {
    return {
      statusCode: 504,
      code: 'provider_timeout',
      clientMessage: `${provider} took too long to respond. Try again, or switch providers.`,
    };
  }
  if (upstream === 413) {
    return {
      statusCode: 413,
      code: 'provider_payload_too_large',
      clientMessage: `The request was too large for ${provider}. Remove an attachment or shorten the description.`,
    };
  }
  if (upstream === 0) {
    return {
      statusCode: 503,
      code: 'provider_unreachable',
      clientMessage: `Could not reach ${provider}. Check your network or the provider's status.`,
    };
  }
  if (upstream >= 500) {
    return {
      statusCode: 502,
      code: 'provider_unavailable',
      clientMessage: `${provider} returned a server error. This is usually transient — try again.`,
    };
  }
  return {
    statusCode: 502,
    code: 'provider_error',
    clientMessage: `${provider} rejected the request.`,
  };
}

/**
 * Provider-specific error.
 *
 * Extends ApiError so the global handler's existing `instanceof ApiError` branch
 * returns a meaningful status and code instead of burying every provider failure
 * in a generic 500. `message` is client-safe; `upstreamMessage` keeps the raw
 * provider text for the logs.
 */
export class LLMApiError extends ApiError {
  readonly provider: string;
  /** The provider's own status, preserved for logging and diagnosis. */
  readonly upstreamStatus: number;
  readonly upstreamMessage: string;
  readonly originalError?: unknown;

  constructor(
    provider: string,
    upstreamStatus: number,
    message: string,
    originalError?: unknown,
  ) {
    const { statusCode, code, clientMessage } = mapProviderStatus(provider, upstreamStatus);
    super(clientMessage, statusCode, code);
    this.name = 'LLMApiError';
    this.provider = provider;
    this.upstreamStatus = upstreamStatus;
    this.upstreamMessage = message;
    this.originalError = originalError;
  }

  /** Whether retrying the same request could plausibly succeed. */
  get isRetryable(): boolean {
    return (
      this.upstreamStatus === 429 ||
      this.upstreamStatus === 408 ||
      this.upstreamStatus === 0 ||
      this.upstreamStatus >= 500
    );
  }
}
