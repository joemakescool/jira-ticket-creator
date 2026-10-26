/**
 * useComment Hook
 *
 * Owns the generated comment and its request lifecycle. Separate from useTicket
 * on purpose: useTicket aborts any in-flight request when a new one starts, so
 * sharing it would let a comment request cancel a ticket generation still
 * running in the other mode.
 *
 * Like useTicket, it does not own the form — the input is passed in at call time.
 */

import { useState, useCallback, useRef } from 'react';
import type { CommentInput, GeneratedComment } from '../types/ticket';
import { ApiRequestError, postApi } from '../utils/api';

interface UseCommentOptions {
  provider?: string;
}

interface UseCommentReturn {
  generatedComment: GeneratedComment | null;
  /** The comment as the user will copy it — starts as the generated text. */
  editedContent: string;
  isGenerating: boolean;
  error: string | null;
  errorCode: string | null;

  setEditedContent: (content: string) => void;
  generateComment: (input: CommentInput) => Promise<GeneratedComment | null>;
  cancelGeneration: () => void;
  reset: () => void;
}

export function useComment(options: UseCommentOptions = {}): UseCommentReturn {
  const { provider } = options;

  const [generatedComment, setGeneratedComment] = useState<GeneratedComment | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const cancelGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsGenerating(false);
  }, []);

  const generateComment = useCallback(
    async (input: CommentInput): Promise<GeneratedComment | null> => {
      if (!input.notes?.trim()) {
        setError('Add some notes first');
        return null;
      }

      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsGenerating(true);
      setError(null);
      setErrorCode(null);

      // Only the latest request may touch state. A superseded or cancelled one
      // still settles, and without this check its catch/finally would clear the
      // busy flag — or post an error — on behalf of the request that replaced it.
      const isCurrent = () => abortControllerRef.current === controller;

      try {
        const comment = await postApi<GeneratedComment>(
          '/tickets/comment',
          { input, provider },
          { signal: controller.signal, fallbackError: 'Comment generation failed' },
        );

        if (!isCurrent()) return null;

        setGeneratedComment(comment);
        setEditedContent(comment.content);
        return comment;
      } catch (err) {
        if (!isCurrent()) return null;
        if (err instanceof DOMException && err.name === 'AbortError') return null;

        setError(err instanceof Error ? err.message : 'Comment generation failed');
        setErrorCode(err instanceof ApiRequestError ? err.code : null);
        return null;
      } finally {
        if (isCurrent()) {
          setIsGenerating(false);
          abortControllerRef.current = null;
        }
      }
    },
    [provider],
  );

  const reset = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setGeneratedComment(null);
    setEditedContent('');
    setIsGenerating(false);
    setError(null);
    setErrorCode(null);
  }, []);

  return {
    generatedComment,
    editedContent,
    isGenerating,
    error,
    errorCode,

    setEditedContent,
    generateComment,
    cancelGeneration,
    reset,
  };
}
