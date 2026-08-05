/**
 * JiraTicketCreator Component
 * Main component for creating JIRA tickets with AI assistance
 * Two-step flow: Describe → Review & Edit
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Sun, Moon, CheckCircle, Plus, AlertCircle, RefreshCw } from 'lucide-react';
import { JiraLogo } from './ProviderIcons';
import { useTicket } from '../../hooks/useTicket';
import { useTheme } from '../../contexts/themeContextValue';
import type { RefinementStyle, Attachment, TicketInput } from '../../types/ticket';
import type { TicketFormData, AppStep } from './types';
import { DEFAULT_TICKET_DATA } from './types';
import {
  buildTicketMarkdown,
  buildTicketHtml,
  type TicketExportData,
} from '../../utils/ticketExport';
import type { CopyTarget } from './ReviewView';

// Sub-components
import { InputView } from './InputView';
import { ReviewView } from './ReviewView';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';
import { ImagePreviewModal } from './ImagePreviewModal';
import { ProviderSelector } from './ProviderSelector';
import { StepIndicator } from './StepIndicator';
import { Toast } from '../ui/Toast';
import { useDraft } from './hooks/useDraft';

export function JiraTicketCreator() {
  const { isDarkMode, toggleTheme } = useTheme();

  // Provider selection
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);

  // Ticket hook
  const {
    generatedTicket,
    editedContent,
    isGenerating,
    isRefining,
    error: ticketError,
    setEditedContent,
    generateTicket: hookGenerateTicket,
    refineTicket: hookRefineTicket,
    regenerateTicket: hookRegenerateTicket,
    reset: hookReset,
    cancelGeneration,
    undo,
    canUndo,
    lastActionLabel,
  } = useTicket({ provider: selectedProvider, autoCopy: false });

  // Form state
  const [ticketData, setTicketData] = useState<TicketFormData>(DEFAULT_TICKET_DATA);
  // Which copy button last succeeded, so the confirmation renders on the button
  // that was actually pressed rather than on its neighbour.
  const [copiedTarget, setCopiedTarget] = useState<CopyTarget>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [currentStep, setCurrentStep] = useState<AppStep>('describe');

  // Image preview modal
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  // Advanced Options disclosure state lives here, not in InputView — InputView
  // is keyed on currentStep and so remounts whenever the step changes.
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [showMoreStyles, setShowMoreStyles] = useState(false);

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

  // Provider loading state
  const [providerLoading, setProviderLoading] = useState(true);
  const [providerError, setProviderError] = useState<string | null>(null);

  // Draft management
  const { draftSaved, loadDraft, clearDraft, saveDraftNow, getDraftInfo } = useDraft(ticketData);

  // Draft auto-restore banner
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [draftTimestamp, setDraftTimestamp] = useState<number | null>(null);
  const prevDescriptionEmpty = useRef(true);

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

  // Check for saved draft on mount
  useEffect(() => {
    const info = getDraftInfo();
    if (info.exists) {
      setShowDraftBanner(true);
      setDraftTimestamp(info.timestamp);
    }
  }, [getDraftInfo]);

  /**
   * Translate the form into the API's input shape. Built at request time rather
   * than mirrored into the hook via an effect — the old sync silently omitted
   * `template`, so the Basic/Detailed choice never reached the server.
   */
  const toTicketInput = useCallback((): TicketInput => ({
    description: ticketData.description,
    title: ticketData.title,
    type: ticketData.type,
    priority: ticketData.priority,
    template: ticketData.template,
    labels: ticketData.labels,
    writingStyle: ticketData.writingStyle,
    attachments: ticketData.attachments,
  }), [ticketData]);

  // Calculate word count
  useEffect(() => {
    const text = ticketData.description.trim();
    const words = text.split(/\s+/).filter(word => word.length > 0);
    setWordCount(words.length);
  }, [ticketData.description]);

  // Keyboard shortcuts (Ctrl+Enter/G moved to InputView for validation)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowShortcuts(false);
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's':
            e.preventDefault();
            saveDraftNow(ticketData);
            break;
          case 'k':
            e.preventDefault();
            setShowShortcuts(prev => !prev);
            break;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [ticketData, saveDraftNow]);

  // --- Handlers ---

  const handleDescriptionChange = useCallback((value: string) => {
    // Auto-dismiss draft banner when user starts typing in an empty form
    if (showDraftBanner && prevDescriptionEmpty.current && value.length > 0) {
      setShowDraftBanner(false);
    }
    prevDescriptionEmpty.current = value.length === 0;
    setTicketData(prev => ({ ...prev, description: value }));
  }, [showDraftBanner]);

  const handleTypeChange = useCallback((type: string) => {
    setTicketData(prev => ({ ...prev, type: type as TicketFormData['type'] }));
  }, []);

  const handlePriorityChange = useCallback((priority: string) => {
    setTicketData(prev => ({ ...prev, priority: priority as TicketFormData['priority'] }));
  }, []);

  const handleTemplateChange = useCallback((template: string) => {
    setTicketData(prev => ({ ...prev, template: template as TicketFormData['template'] }));
  }, []);

  const handleWritingStyleChange = useCallback((style: RefinementStyle | undefined) => {
    setTicketData(prev => ({ ...prev, writingStyle: style }));
  }, []);

  const handleTitleChange = useCallback((value: string) => {
    setTicketData(prev => ({ ...prev, title: value }));
  }, []);

  const handleAddLabel = useCallback((label: string) => {
    const trimmedLabel = label.trim().toLowerCase();
    if (trimmedLabel && !ticketData.labels.includes(trimmedLabel)) {
      setTicketData(prev => ({
        ...prev,
        labels: [...prev.labels, trimmedLabel]
      }));
    }
  }, [ticketData.labels]);

  const handleRemoveLabel = useCallback((label: string) => {
    setTicketData(prev => ({
      ...prev,
      labels: prev.labels.filter(l => l !== label)
    }));
  }, []);

  const handleAddAttachments = useCallback((newAttachments: Attachment[]) => {
    setTicketData(prev => ({
      ...prev,
      attachments: [...(prev.attachments || []), ...newAttachments],
    }));
  }, []);

  const handleRemoveAttachment = useCallback((id: string) => {
    setTicketData(prev => ({
      ...prev,
      attachments: (prev.attachments || []).filter(a => a.id !== id),
    }));
  }, []);

  const handleReorderAttachments = useCallback((reordered: Attachment[]) => {
    setTicketData(prev => ({ ...prev, attachments: reordered }));
  }, []);

  const handleGenerateAndTransition = useCallback(async () => {
    const result = await hookGenerateTicket(toTicketInput());
    if (result) {
      setTicketData(prev => ({
        ...prev,
        title: result.title,
        type: result.metadata.type,
        priority: result.metadata.priority,
        labels: result.metadata.labels.length > 0 ? result.metadata.labels : prev.labels,
      }));
      setCurrentStep('review');
    }
  }, [hookGenerateTicket, toTicketInput]);

  const handleRegenerateTicket = useCallback(async () => {
    await hookRegenerateTicket({
      title: ticketData.title,
      type: ticketData.type,
      priority: ticketData.priority,
      labels: ticketData.labels,
    });
  }, [hookRegenerateTicket, ticketData.title, ticketData.type, ticketData.priority, ticketData.labels]);

  const handleRefineTicket = useCallback(async (style: string) => {
    if (!editedContent && !generatedTicket) return;
    const apiStyle = (style as RefinementStyle) || 'concise';
    await hookRefineTicket(apiStyle);
  }, [editedContent, generatedTicket, hookRefineTicket]);

  /** Everything the export helpers need, derived from current form + output. */
  const exportData = useCallback((): TicketExportData => ({
    title: ticketData.title,
    type: ticketData.type,
    priority: ticketData.priority,
    labels: ticketData.labels,
    content: editedContent || generatedTicket?.content || ticketData.description,
    attachments: ticketData.attachments,
  }), [ticketData, editedContent, generatedTicket]);

  const confirmCopy = useCallback((target: Exclude<CopyTarget, null>, message: string) => {
    setCopiedTarget(target);
    setToastMessage(message);
    setTimeout(() => setCopiedTarget(null), 2000);
  }, []);

  /** Copy the ticket body only (plain text, with rich HTML when images exist). */
  const handleCopyToClipboard = useCallback(async () => {
    const data = exportData();
    if (!data.content) return;

    const attachments = data.attachments || [];

    try {
      if (attachments.length > 0 && typeof ClipboardItem !== 'undefined') {
        const html = buildTicketHtml(data, { includeHeader: false });
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': new Blob([html], { type: 'text/html' }),
            'text/plain': new Blob([data.content], { type: 'text/plain' }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(data.content);
      }
      confirmCopy('plain', 'Ticket copied to clipboard');
    } catch (err) {
      console.error('Copy failed:', err);
      try {
        await navigator.clipboard.writeText(data.content);
        confirmCopy('plain', 'Ticket copied to clipboard');
      } catch {
        setToastMessage('Copy failed — your browser blocked clipboard access');
      }
    }
  }, [exportData, confirmCopy]);

  /**
   * Terminal action: copy the full markdown document — title, metadata header
   * and body — then complete the flow.
   */
  const handleCopyAsMarkdown = useCallback(async () => {
    const data = exportData();
    const markdown = buildTicketMarkdown(data);
    const attachments = data.attachments || [];

    try {
      if (attachments.length > 0 && typeof ClipboardItem !== 'undefined') {
        const html = buildTicketHtml(data, { includeHeader: true });
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': new Blob([html], { type: 'text/html' }),
            'text/plain': new Blob([markdown], { type: 'text/plain' }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(markdown);
      }
      confirmCopy('markdown', 'Ticket copied — ready to paste into JIRA');
      setCurrentStep('done');
    } catch (err) {
      console.error('Copy failed:', err);
      setToastMessage('Copy failed — your browser blocked clipboard access');
    }
  }, [exportData, confirmCopy]);

  const handleClearDraft = useCallback(() => {
    clearDraft();
    setTicketData(DEFAULT_TICKET_DATA);
  }, [clearDraft]);

  const handleRestoreDraft = useCallback(async () => {
    const draft = await loadDraft();
    if (draft) {
      setTicketData(draft);
    }
    setShowDraftBanner(false);
  }, [loadDraft]);

  const handleDiscardDraft = useCallback(() => {
    clearDraft();
    setShowDraftBanner(false);
  }, [clearDraft]);

  // Step navigation. Backwards is always allowed; forwards is allowed only when
  // there's already a generated ticket to return to — otherwise the generated
  // output was unreachable from Describe and users had to pay for a second
  // generation to get back to it.
  const handleStepClick = useCallback((step: AppStep) => {
    const stepIndex: Record<AppStep, number> = { describe: 0, review: 1, done: 2 };
    const target = stepIndex[step];
    const current = stepIndex[currentStep];

    if (target < current) {
      setCurrentStep(step);
      return;
    }
    if (target > current && step === 'review' && generatedTicket) {
      setCurrentStep('review');
    }
  }, [currentStep, generatedTicket]);

  const handleNewTicket = useCallback(() => {
    hookReset();
    setTicketData(DEFAULT_TICKET_DATA);
    setCurrentStep('describe');
  }, [hookReset]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-100 dark:from-slate-900 dark:via-blue-900 dark:to-slate-900 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-blue-600 to-blue-700 opacity-10 rounded-full blur-3xl transform rotate-12" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-blue-500 to-cyan-600 opacity-10 rounded-full blur-3xl transform -rotate-12" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto p-4 space-y-4">
        {/* Header */}
        <header className="relative z-20">
          <div className="bg-white/20 backdrop-blur-xl border-white/30 dark:bg-slate-800/20 dark:border-slate-700/50 rounded-xl p-4 shadow-lg border">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <JiraLogo className="w-7 h-7" />
                <h1 className="text-xl font-bold text-slate-800 dark:text-white">JIRA Ticket Creator</h1>
              </div>

              <div className="flex-1" />

              <ProviderSelector
                value={selectedProvider}
                onChange={setSelectedProvider}
                availableProviders={availableProviders}
                isLoading={providerLoading}
              />

              <button
                onClick={toggleTheme}
                className={`p-1.5 rounded-lg border transition-all bg-white/20 border-white/30 text-slate-600 hover:bg-white/30 dark:bg-slate-800/20 dark:border-slate-700/50 dark:text-slate-300 dark:hover:bg-slate-700/30 flex items-center gap-1.5 ${showThemePulse ? 'animate-theme-pulse' : ''}`}
                aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                type="button"
              >
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                <span className="text-xs font-medium hidden sm:inline">
                  {isDarkMode ? 'Light' : 'Dark'}
                </span>
              </button>
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

        {/* Toast notification */}
        {toastMessage && (
          <Toast
            message={toastMessage}
            type="success"
            onClose={() => setToastMessage(null)}
          />
        )}

        {/* Persistent step indicator */}
        <div className="flex justify-center">
          <StepIndicator
            currentStep={currentStep}
            onStepClick={handleStepClick}
            canNavigateForwardTo={step => step === 'review' && !!generatedTicket}
          />
        </div>

        {/* Step views — key forces remount for enter animation */}
        <div key={currentStep} className="step-enter">
          {currentStep === 'describe' && (
            <InputView
              ticketData={ticketData}
              isGenerating={isGenerating}
              selectedProvider={selectedProvider}
              wordCount={wordCount}
              draftSaved={draftSaved}
              providerLoading={providerLoading}
              error={ticketError}
              showDraftBanner={showDraftBanner}
              draftTimestamp={draftTimestamp}
              advancedOpen={advancedOpen}
              onAdvancedOpenChange={setAdvancedOpen}
              showMoreStyles={showMoreStyles}
              onShowMoreStylesChange={setShowMoreStyles}
              onDescriptionChange={handleDescriptionChange}
              onTypeChange={handleTypeChange}
              onPriorityChange={handlePriorityChange}
              onTemplateChange={handleTemplateChange}
              onWritingStyleChange={handleWritingStyleChange}
              onGenerate={handleGenerateAndTransition}
              onClearDraft={handleClearDraft}
              onCancel={cancelGeneration}
              onRestoreDraft={handleRestoreDraft}
              onDiscardDraft={handleDiscardDraft}
              onAddAttachments={handleAddAttachments}
              onRemoveAttachment={handleRemoveAttachment}
              onReorderAttachments={handleReorderAttachments}
              onPreviewAttachment={setPreviewIndex}
            />
          )}

          {currentStep === 'review' && generatedTicket && (
            <ReviewView
              generatedTicket={generatedTicket}
              editedContent={editedContent}
              ticketData={ticketData}
              isGenerating={isGenerating}
              isRefining={isRefining}
              error={ticketError}
              onTitleChange={handleTitleChange}
              onTypeChange={handleTypeChange}
              onPriorityChange={handlePriorityChange}
              onAddLabel={handleAddLabel}
              onRemoveLabel={handleRemoveLabel}
              onContentChange={setEditedContent}
              onRegenerate={handleRegenerateTicket}
              onCopy={handleCopyToClipboard}
              onCopyMarkdown={handleCopyAsMarkdown}
              onRefine={handleRefineTicket}
              onUndo={undo}
              canUndo={canUndo}
              lastActionLabel={lastActionLabel}
              // Keep the title when going back — it was clearing the
              // LLM-authored title on every back-navigation.
              onBackToEdit={() => setCurrentStep('describe')}
              copiedTarget={copiedTarget}
              attachments={ticketData.attachments || []}
              onPreviewAttachment={setPreviewIndex}
            />
          )}

          {currentStep === 'done' && (
            <div className="bg-white/20 backdrop-blur-xl border-white/30 dark:bg-slate-800/20 dark:border-slate-700/50 rounded-2xl shadow-2xl border p-8 text-center">
              <CheckCircle className="w-16 h-16 mx-auto mb-4 text-emerald-500" aria-hidden="true" />
              <h2 className="text-xl font-bold mb-2 text-slate-800 dark:text-white">
                Ticket copied
              </h2>
              <p className="text-slate-600 dark:text-slate-300 mb-6">
                It&apos;s on your clipboard as Markdown — paste it into JIRA, or
                head back to Review to keep refining.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => setCurrentStep('review')}
                  className="py-2.5 px-5 rounded-xl border text-sm font-medium bg-white/30 text-slate-700 border-white/50 hover:bg-white/50 dark:bg-slate-800/40 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-700/50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                  type="button"
                >
                  Back to Review
                </button>
                <button
                  onClick={handleNewTicket}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white py-2.5 px-6 rounded-xl flex items-center justify-center gap-2 font-semibold shadow-xl hover:shadow-2xl transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
                  type="button"
                >
                  <Plus className="w-5 h-5" aria-hidden="true" />
                  Create Another
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Image Preview Modal */}
      {previewIndex !== null && (ticketData.attachments || []).length > 0 && (
        <ImagePreviewModal
          attachments={ticketData.attachments || []}
          currentIndex={previewIndex}
          onClose={() => setPreviewIndex(null)}
          onNavigate={setPreviewIndex}
        />
      )}

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />
    </div>
  );
}

export default JiraTicketCreator;
