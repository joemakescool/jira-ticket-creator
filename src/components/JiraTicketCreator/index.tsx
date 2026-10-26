/**
 * JiraTicketCreator Component
 * App shell: header (provider, theme), the mode tabs, toasts, and shortcuts.
 *
 * Each mode's state and handlers live in its workspace — TicketWorkspace for
 * the Describe → Review flow, CommentWorkspace for comments. Both stay mounted
 * so switching tabs never discards work or cancels a request in flight.
 */

import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { Sun, Moon, AlertCircle, RefreshCw } from 'lucide-react';
import { JiraLogo } from './ProviderIcons';
import { useTheme } from '../../contexts/themeContextValue';
import type { AppMode } from './types';

import { TicketWorkspace } from './TicketWorkspace';
import { CommentWorkspace } from './CommentWorkspace';
import { ModeToggle } from './ModeToggle';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';
import { ProviderSelector } from './ProviderSelector';
import { Toast, type ToastType } from '../ui/Toast';

export function JiraTicketCreator() {
  const { isDarkMode, toggleTheme } = useTheme();
  const [mode, setMode] = useState<AppMode>('ticket');

  // Provider selection
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);
  const [providerLoading, setProviderLoading] = useState(true);
  const [providerError, setProviderError] = useState<string | null>(null);

  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  // Stable so the Toast's auto-dismiss timer isn't restarted on every render.
  const dismissToast = useCallback(() => setToast(null), []);
  const reportCopyFailure = useCallback(() => {
    setToast({ message: 'Copy failed — your browser blocked clipboard access', type: 'error' });
  }, []);

  const [showShortcuts, setShowShortcuts] = useState(false);

  // Theme pulse for first visit
  const [showThemePulse, setShowThemePulse] = useState(false);
  useEffect(() => {
    if (!localStorage.getItem('hasVisited')) {
      const timer = setTimeout(() => setShowThemePulse(true), 2000);
      const hideTimer = setTimeout(() => {
        setShowThemePulse(false);
        localStorage.setItem('hasVisited', 'true');
      }, 6500); // 2s delay + 4.5s animation (3x 1.5s)
      return () => { clearTimeout(timer); clearTimeout(hideTimer); };
    }
  }, []);

  // Fetch available providers with timeout
  const fetchProviders = useCallback(async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    setProviderLoading(true);
    setProviderError(null);
    try {
      const response = await fetch('/api/providers', { signal: controller.signal });
      if (response.ok) {
        const data = await response.json();
        setAvailableProviders(data.providers || []);
        // Functional update so this callback doesn't close over selectedProvider —
        // that kept it out of the effect's deps and made it a stale closure.
        if (data.default) {
          setSelectedProvider(prev => prev || data.default);
        }
      }
    } catch (err) {
      console.error('Failed to fetch providers:', err);
      if (err instanceof DOMException && err.name === 'AbortError') {
        setProviderError('Provider check timed out after 10s. Is your server running?');
      } else {
        setProviderError('Could not connect to AI providers. Check your connection.');
      }
      setAvailableProviders(['claude', 'openai', 'ollama']);
      setSelectedProvider(prev => prev || 'ollama');
    } finally {
      clearTimeout(timeout);
      setProviderLoading(false);
    }
  }, []);

  useEffect(() => { fetchProviders(); }, [fetchProviders]);

  // App-wide shortcuts. Saving the draft on Ctrl+S belongs to TicketWorkspace,
  // and Ctrl+Enter (generate) to each mode's form.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowShortcuts(false);
        return;
      }
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === 'k') {
        e.preventDefault();
        setShowShortcuts(prev => !prev);
      } else if (e.key === 's') {
        // Suppress the browser's "save page" dialog in every mode — in comment
        // mode there's no draft, so nothing else handles the key.
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  /**
   * The tab strip on the card's top edge. Each workspace renders it so it can
   * supply its own trailing content (the ticket steps). The row is the same
   * height in both modes, so the card never moves when switching.
   */
  const renderTabs = useCallback((trailing?: ReactNode) => (
    // items-center so the step labels line up with the tab labels; -mb-px
    // seats the active tab's underline on the card's top border.
    <div className="relative z-10 flex items-center justify-between gap-3 px-2 -mb-px">
      <ModeToggle value={mode} onChange={setMode} />
      {trailing}
    </div>
  ), [mode]);

  return (
    // overflow-x-clip, not overflow-hidden: `hidden` makes this a scroll
    // container, which silently breaks the Review screen's sticky action bar.
    // `clip` still stops the oversized background blobs causing sideways scroll.
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-100 dark:from-slate-900 dark:via-blue-900 dark:to-slate-900 relative overflow-x-clip">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-blue-600 to-blue-700 opacity-10 rounded-full blur-3xl transform rotate-12" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-blue-500 to-cyan-600 opacity-10 rounded-full blur-3xl transform -rotate-12" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto p-4 space-y-4">
        {/* App-wide settings only. Mode lives on the content card it changes. */}
        <header className="relative z-20">
          <div className="bg-white/20 backdrop-blur-xl border-white/30 dark:bg-slate-800/20 dark:border-slate-700/50 rounded-xl px-4 py-3 shadow-lg border">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <JiraLogo className="w-7 h-7 flex-shrink-0" />
                <h1 className="text-lg font-bold text-slate-800 dark:text-white truncate">
                  JIRA Ticket Creator
                </h1>
              </div>

              <div className="flex items-center gap-2">
                <ProviderSelector
                  value={selectedProvider}
                  onChange={setSelectedProvider}
                  availableProviders={availableProviders}
                  isLoading={providerLoading}
                />

                {/* Shows the theme you're in, like a status indicator; the tooltip
                    and accessible name describe what clicking does. */}
                <button
                  onClick={toggleTheme}
                  className={`p-1.5 rounded-lg border transition-all bg-white/20 border-white/30 text-slate-600 hover:bg-white/30 dark:bg-slate-800/20 dark:border-slate-700/50 dark:text-slate-300 dark:hover:bg-slate-700/30 flex items-center gap-1.5 ${showThemePulse ? 'animate-theme-pulse' : ''}`}
                  aria-label={isDarkMode ? 'Dark mode on. Switch to light mode' : 'Light mode on. Switch to dark mode'}
                  title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                  type="button"
                >
                  {isDarkMode ? <Moon className="w-4 h-4" aria-hidden="true" /> : <Sun className="w-4 h-4" aria-hidden="true" />}
                  <span className="text-xs font-medium hidden sm:inline" aria-hidden="true">
                    {isDarkMode ? 'Dark' : 'Light'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Provider error — in flow, not an absolute popover hanging off the
            header, which was overlaying the step indicator. */}
        {providerError && (
          <div
            className="flex flex-wrap items-center gap-2 p-3 rounded-xl border text-sm bg-red-50/80 border-red-300 text-red-800 dark:bg-red-900/25 dark:border-red-800/60 dark:text-red-200"
            role="alert"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            <span className="flex-1">{providerError}</span>
            <button
              onClick={fetchProviders}
              className="flex items-center gap-1 font-semibold text-blue-700 dark:text-blue-300 hover:underline rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              type="button"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              Retry
            </button>
          </div>
        )}

        {toast && (
          <Toast message={toast.message} type={toast.type} onClose={dismissToast} />
        )}

        <TicketWorkspace
          provider={selectedProvider}
          providerLoading={providerLoading}
          isActive={mode === 'ticket'}
          tabs={renderTabs}
          onCopyFailure={reportCopyFailure}
        />
        <CommentWorkspace
          provider={selectedProvider}
          providerLoading={providerLoading}
          isActive={mode === 'comment'}
          tabs={renderTabs}
          onCopyFailure={reportCopyFailure}
        />
      </div>

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />
    </div>
  );
}

export default JiraTicketCreator;
