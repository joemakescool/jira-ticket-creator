/**
 * useTicket Hook
 *
 * Owns the generated ticket, its edit history, and the request lifecycle for
 * generate / refine / regenerate.
 *
 * It deliberately does NOT own the form. It used to keep its own copy of the
 * ticket input, reconciled from the component with a useEffect, and that
 * duplication silently dropped fields — `template` never reached the API for
 * months because it was missing from the sync. The form is now passed in at call
 * time, so there is exactly one source of truth and no field can be forgotten.
 */

import { useState, useCallback, useRef } from 'react';
import {
  TicketInput,
  GeneratedTicket,
  RefinementStyle,
} from '../types/ticket';
import { API_BASE, ApiRequestError, postApi } from '../utils/api';

/** How many previous ticket bodies to keep for undo. */
const MAX_HISTORY = 10;

/** Human-readable names for undo messaging, keyed by refinement style. */
const REFINEMENT_LABELS: Record<RefinementStyle, string> = {
  concise: 'More Concise',
  detailed: 'More Details',
  technical: 'More Technical',
  business: 'Business Focus',
  'user-story': 'User Story',
  acceptance: 'More Criteria',
};

export interface RegenerateMetadata {
  title?: string;
  type?: TicketInput['type'];
  priority?: TicketInput['priority'];
  labels?: string[];
}

interface UseTicketOptions {
  provider?: string;
  autoCopy?: boolean;
}

interface UseTicketReturn {
  // State
  generatedTicket: GeneratedTicket | null;
  editedContent: string;
  isGenerating: boolean;
  isRefining: boolean;
  error: string | null;
  /** Stable code from the server (e.g. `provider_rate_limited`), when present. */
  errorCode: string | null;
  canUndo: boolean;
  lastActionLabel: string | null;

  // Actions
  setEditedContent: (content: string) => void;
  generateTicket: (input: TicketInput) => Promise<GeneratedTicket | null>;
  refineTicket: (style: RefinementStyle) => Promise<void>;
  regenerateTicket: (metadata?: RegenerateMetadata) => Promise<void>;
  generateTitle: (description: string) => Promise<string | null>;
  copyToClipboard: () => Promise<boolean>;
  cancelGeneration: () => void;
  undo: () => void;
  reset: () => void;
}

export function useTicket(options: UseTicketOptions = {}): UseTicketReturn {
  const { provider, autoCopy = false } = options;

  const [generatedTicket, setGeneratedTicket] = useState<GeneratedTicket | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  // Undo history — refine and regenerate overwrite reviewed (and possibly
  // hand-edited) content, so the previous body is pushed here first.
  const [history, setHistory] = useState<{ content: string; label: string }[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const userCancelledRef = useRef(false);

  const pushHistory = useCallback((content: string, label: string) => {
    if (!content) return;
    setHistory(prev => [...prev, { content, label }].slice(-MAX_HISTORY));
  }, []);

  const undo = useCallback(() => {
    setHistory(prev => {
      if (prev.length === 0) return prev;
      const previous = prev[prev.length - 1];
      setEditedContent(previous.content);
      setError(null);
      setErrorCode(null);
      return prev.slice(0, -1);
    });
  }, []);

  const cancelGeneration = useCallback(() => {
    userCancelledRef.current = true;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const copyToClipboard = useCallback(async (): Promise<boolean> => {
    const content = editedContent || generatedTicket?.content;
    if (!content) return false;

    try {
      await navigator.clipboard.writeText(content);
      return true;
    } catch (err) {
      console.error('Copy failed:', err);
      return false;
    }
  }, [editedContent, generatedTicket]);

  /**
   * Shared request lifecycle: cancel any in-flight call, track the busy flag,
   * normalise errors, and distinguish a user cancellation from a timeout.
   *
   * Generate, refine and regenerate were three near-identical 40-line copies of
   * this; the only differences were the endpoint, the busy flag, and the labels.
   */
  const runMutation = useCallback(
    async <T>(config: {
      endpoint: string;
      body: unknown;
      busy: 'generating' | 'refining';
      action: string;
    }): Promise<T | null> => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;
      userCancelledRef.current = false;

      const setBusy = config.busy === 'generating' ? setIsGenerating : setIsRefining;
      setBusy(true);
      setError(null);
      setErrorCode(null);

      try {
        return await postApi<T>(config.endpoint, config.body, {
          signal: controller.signal,
          fallbackError: `${config.action} failed`,
        });
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          // A user-initiated cancel isn't an error worth surfacing.
          if (!userCancelledRef.current) {
            setError(
              `${config.action} timed out. Try again, or switch to a different provider.`,
            );
            setErrorCode('client_timeout');
          }
        } else {
          setError(err instanceof Error ? err.message : `${config.action} failed`);
          setErrorCode(err instanceof ApiRequestError ? err.code : null);
        }
        return null;
      } finally {
        setBusy(false);
        abortControllerRef.current = null;
      }
    },
    [],
  );

  /** Copy silently in the background when autoCopy is enabled. */
  const maybeAutoCopy = useCallback(
    (content: string) => {
      if (!autoCopy) return;
      navigator.clipboard.writeText(content).catch(() => {});
    },
    [autoCopy],
  );

  const generateTicket = useCallback(
    async (input: TicketInput): Promise<GeneratedTicket | null> => {
      if (!input.description?.trim()) {
        setError('Description is required');
        return null;
      }

      const ticket = await runMutation<GeneratedTicket>({
        endpoint: '/tickets/generate',
        body: { input, provider },
        busy: 'generating',
        action: 'Generation',
      });

      if (!ticket) return null;

      setGeneratedTicket(ticket);
      setEditedContent(ticket.content);
      // A fresh generation starts a new history — undoing into a previous
      // ticket's body would be nonsense.
      setHistory([]);
      maybeAutoCopy(ticket.content);

      return ticket;
    },
    [provider, runMutation, maybeAutoCopy],
  );

  const refineTicket = useCallback(
    async (style: RefinementStyle) => {
      const content = editedContent || generatedTicket?.content;
      if (!content) {
        setError('No ticket to refine');
        return;
      }

      const result = await runMutation<{ content: string }>({
        endpoint: '/tickets/refine',
        body: { currentTicket: content, style, provider },
        busy: 'refining',
        action: 'Refinement',
      });

      if (!result) return;

      pushHistory(content, REFINEMENT_LABELS[style] ?? 'Refine');
      setEditedContent(result.content);
      maybeAutoCopy(result.content);
    },
    [editedContent, generatedTicket, provider, runMutation, pushHistory, maybeAutoCopy],
  );

  const regenerateTicket = useCallback(
    async (metadata?: RegenerateMetadata) => {
      if (!editedContent?.trim()) {
        setError('No ticket to regenerate');
        return;
      }

      const result = await runMutation<{ content: string }>({
        endpoint: '/tickets/regenerate',
        body: {
          currentTicket: editedContent,
          title: metadata?.title,
          type: metadata?.type,
          priority: metadata?.priority,
          labels: metadata?.labels,
          provider,
        },
        busy: 'generating',
        action: 'Regeneration',
      });

      if (!result) return;

      pushHistory(editedContent, 'Regenerate');
      setEditedContent(result.content);
      maybeAutoCopy(result.content);
    },
    [editedContent, provider, runMutation, pushHistory, maybeAutoCopy],
  );

  /**
   * Title-only generation. Returns the title rather than mutating form state,
   * since the hook no longer owns the form. Failures are silent — this is an
   * optional convenience, not part of the main flow.
   */
  const generateTitle = useCallback(
    async (description: string): Promise<string | null> => {
      if (!description?.trim() || description.length < 20) return null;

      try {
        const response = await fetch(`${API_BASE}/tickets/title`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description, provider }),
        });

        const data = await response.json().catch(() => ({}));
        return response.ok && data.data?.title ? (data.data.title as string) : null;
      } catch (err) {
        console.error('Title generation failed:', err);
        return null;
      }
    },
    [provider],
  );

  const reset = useCallback(() => {
    setGeneratedTicket(null);
    setEditedContent('');
    setError(null);
    setErrorCode(null);
    setHistory([]);
  }, []);

  return {
    generatedTicket,
    editedContent,
    isGenerating,
    isRefining,
    error,
    errorCode,
    canUndo: history.length > 0,
    lastActionLabel: history.length > 0 ? history[history.length - 1].label : null,

    setEditedContent,
    generateTicket,
    refineTicket,
    regenerateTicket,
    generateTitle,
    copyToClipboard,
    cancelGeneration,
    undo,
    reset,
  };
}
