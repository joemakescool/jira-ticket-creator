/**
 * useDraft Hook
 * Handles draft persistence: text fields in localStorage, attachments in IndexedDB
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { TicketFormData } from '../types';
import type { Attachment } from '../../../types/ticket';
import { DRAFT_SAVE_DELAY } from '../constants';

const STORAGE_KEY = 'ticketDraft';
const TIMESTAMP_KEY = 'ticketDraftTimestamp';
const IDB_NAME = 'ticketDrafts';
const IDB_STORE = 'attachments';
const IDB_KEY = 'draftAttachments';

// --- IndexedDB helpers ---

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveAttachmentsToIDB(attachments: Attachment[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(attachments, IDB_KEY);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (e) {
    console.error('Failed to save attachments to IndexedDB:', e);
  }
}

async function loadAttachmentsFromIDB(): Promise<Attachment[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
    const result = await new Promise<Attachment[]>((resolve, reject) => {
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return result;
  } catch (e) {
    console.error('Failed to load attachments from IndexedDB:', e);
    return [];
  }
}

async function clearAttachmentsFromIDB(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).delete(IDB_KEY);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (e) {
    console.error('Failed to clear attachments from IndexedDB:', e);
  }
}

// --- Hook ---

export function useDraft(ticketData: TicketFormData) {
  const [draftSaved, setDraftSaved] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Auto-save draft with debounce
  useEffect(() => {
    if (!ticketData.title && !ticketData.description && !(ticketData.attachments?.length)) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      try {
        // Save text fields to localStorage (exclude attachments — they go to IDB)
        const { attachments, ...textData } = ticketData;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(textData));
        localStorage.setItem(TIMESTAMP_KEY, String(Date.now()));

        // Save attachments to IndexedDB
        if (attachments && attachments.length > 0) {
          saveAttachmentsToIDB(attachments);
        } else {
          clearAttachmentsFromIDB();
        }

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

  const loadDraft = useCallback(async (): Promise<TicketFormData | null> => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const attachments = await loadAttachmentsFromIDB();
        return {
          title: parsed.title || '',
          description: parsed.description || '',
          type: parsed.type || 'Task',
          priority: parsed.priority || 'Medium',
          template: parsed.template || 'Basic',
          labels: parsed.labels || [],
          writingStyle: parsed.writingStyle || undefined,
          attachments: attachments.length > 0 ? attachments : undefined,
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
      localStorage.removeItem(TIMESTAMP_KEY);
      clearAttachmentsFromIDB();
    } catch (e) {
      console.error('Failed to clear draft:', e);
    }
  }, []);

  const saveDraftNow = useCallback((data: TicketFormData) => {
    try {
      const { attachments, ...textData } = data;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(textData));
      localStorage.setItem(TIMESTAMP_KEY, String(Date.now()));
      if (attachments && attachments.length > 0) {
        saveAttachmentsToIDB(attachments);
      }
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 2000);
    } catch (e) {
      console.error('Failed to save draft:', e);
    }
  }, []);

  const getDraftInfo = useCallback((): { exists: boolean; timestamp: number | null } => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const timestamp = localStorage.getItem(TIMESTAMP_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.description || parsed.title) {
          return {
            exists: true,
            timestamp: timestamp ? Number(timestamp) : null,
          };
        }
      }
    } catch {
      // Ignore parse errors
    }
    return { exists: false, timestamp: null };
  }, []);

  return {
    draftSaved,
    loadDraft,
    clearDraft,
    saveDraftNow,
    getDraftInfo,
  };
}
