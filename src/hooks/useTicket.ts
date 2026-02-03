/**
 * useTicket Hook
 * 
 * Provides a clean interface for ticket operations in React components.
 * Handles loading states, errors, and API communication.
 * 
 * Why a hook?
 * - Encapsulates all ticket-related state and logic
 * - Reusable across components
 * - Testable in isolation
 * - Keeps components focused on UI
 */

import { useState, useCallback } from 'react';
import {
  TicketInput,
  GeneratedTicket,
  RefinementStyle,
  DEFAULT_TICKET_INPUT,
} from '../types/ticket';

// Use relative URL to go through Vite's proxy in development
const API_BASE = '/api';

interface UseTicketOptions {
  provider?: string;
  autoCopy?: boolean;
}

interface UseTicketReturn {
  // State
  input: TicketInput;
  generatedTicket: GeneratedTicket | null;
  editedContent: string;
  isGenerating: boolean;
  isRefining: boolean;
  error: string | null;
  
  // Actions
  setInput: (input: Partial<TicketInput>) => void;
  setEditedContent: (content: string) => void;
  generateTicket: () => Promise<void>;
  refineTicket: (style: RefinementStyle) => Promise<void>;
  regenerateTicket: () => Promise<void>;
  generateTitle: () => Promise<void>;
  copyToClipboard: () => Promise<boolean>;
  reset: () => void;
}

export function useTicket(options: UseTicketOptions = {}): UseTicketReturn {
  const { provider, autoCopy = false } = options;
  
  // Form state
  const [input, setInputState] = useState<TicketInput>(DEFAULT_TICKET_INPUT);
  
  // Generation state
  const [generatedTicket, setGeneratedTicket] = useState<GeneratedTicket | null>(null);
  const [editedContent, setEditedContent] = useState('');
  
  // Loading states
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  
  // Error state
  const [error, setError] = useState<string | null>(null);

  // Update input (partial update)
  const setInput = useCallback((updates: Partial<TicketInput>) => {
    setInputState(prev => ({ ...prev, ...updates }));
    setError(null); // Clear errors on input change
  }, []);

  // Copy to clipboard
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

  // Generate ticket
  const generateTicket = useCallback(async () => {
    if (!input.description?.trim()) {
      setError('Description is required');
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/tickets/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input, provider }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Generation failed');
      }
      
      setGeneratedTicket(data.data);
      setEditedContent(data.data.content);
      
      if (autoCopy) {
        setTimeout(() => {
          navigator.clipboard.writeText(data.data.content).catch(() => {});
        }, 100);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  }, [input, provider, autoCopy]);

  // Refine ticket
  const refineTicket = useCallback(async (style: RefinementStyle) => {
    const content = editedContent || generatedTicket?.content;
    if (!content) {
      setError('No ticket to refine');
      return;
    }
    
    setIsRefining(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/tickets/refine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentTicket: content, style, provider }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Refinement failed');
      }
      
      setEditedContent(data.data.content);
      
      if (autoCopy) {
        setTimeout(() => {
          navigator.clipboard.writeText(data.data.content).catch(() => {});
        }, 100);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refinement failed');
    } finally {
      setIsRefining(false);
    }
  }, [editedContent, generatedTicket, provider, autoCopy]);

  // Regenerate after edits
  const regenerateTicket = useCallback(async () => {
    if (!editedContent?.trim()) {
      setError('No ticket to regenerate');
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/tickets/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentTicket: editedContent, provider }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Regeneration failed');
      }
      
      setEditedContent(data.data.content);
      
      if (autoCopy) {
        setTimeout(() => {
          navigator.clipboard.writeText(data.data.content).catch(() => {});
        }, 100);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Regeneration failed');
    } finally {
      setIsGenerating(false);
    }
  }, [editedContent, provider, autoCopy]);

  // Generate title from description
  const generateTitle = useCallback(async () => {
    if (!input.description?.trim() || input.description.length < 20) {
      return; // Need enough content to generate a meaningful title
    }
    
    try {
      const response = await fetch(`${API_BASE}/tickets/title`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: input.description, provider }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.data?.title) {
        setInputState(prev => ({ ...prev, title: data.data.title }));
      }
    } catch (err) {
      // Silently fail - title generation is optional
      console.error('Title generation failed:', err);
    }
  }, [input.description, provider]);

  // Reset everything
  const reset = useCallback(() => {
    setInputState(DEFAULT_TICKET_INPUT);
    setGeneratedTicket(null);
    setEditedContent('');
    setError(null);
  }, []);

  return {
    // State
    input,
    generatedTicket,
    editedContent,
    isGenerating,
    isRefining,
    error,
    
    // Actions
    setInput,
    setEditedContent,
    generateTicket,
    refineTicket,
    regenerateTicket,
    generateTitle,
    copyToClipboard,
    reset,
  };
}
