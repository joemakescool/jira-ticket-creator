/**
 * useDraft Hook
 * Handles localStorage draft persistence with debouncing
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { TicketFormData } from '../types';
import { DRAFT_SAVE_DELAY } from '../constants';

const STORAGE_KEY = 'ticketDraft';

export function useDraft(ticketData: TicketFormData) {
  const [draftSaved, setDraftSaved] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Auto-save draft with debounce
  useEffect(() => {
    if (!ticketData.title && !ticketData.description) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ticketData));
        setDraftSaved(true);
        setTimeout(() => setDraftSaved(false), 2000);
      } catch (e) {
        console.error('Failed to save draft:', e);
      }
    }, DRAFT_SAVE_DELAY);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [ticketData]);

  const loadDraft = useCallback((): TicketFormData | null => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          title: parsed.title || '',
          description: parsed.description || '',
          type: parsed.type || 'Task',
          priority: parsed.priority || 'Medium',
          template: parsed.template || 'Basic',
          labels: parsed.labels || [],
          writingStyle: parsed.writingStyle || undefined
        };
      }
    } catch (error) {
      console.error('Failed to load draft:', error);
    }
    return null;
  }, []);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('Failed to clear draft:', e);
    }
  }, []);

  const saveDraftNow = useCallback((data: TicketFormData) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 2000);
    } catch (e) {
      console.error('Failed to save draft:', e);
    }
  }, []);

  return {
    draftSaved,
    loadDraft,
    clearDraft,
    saveDraftNow
  };
}
