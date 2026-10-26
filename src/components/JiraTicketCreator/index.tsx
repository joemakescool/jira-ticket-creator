/**
 * JiraTicketCreator Component
 * Main component for creating JIRA tickets with AI assistance
 * Ticket mode — two-step flow: Describe → Review & Edit
 * Comment mode — single screen: notes → comment on an existing ticket
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Sun, Moon, AlertCircle, RefreshCw } from 'lucide-react';
import { JiraLogo } from './ProviderIcons';
import { useTicket } from '../../hooks/useTicket';
import { useComment } from '../../hooks/useComment';
import { useTheme } from '../../contexts/themeContextValue';
import type {
  RefinementStyle,
  Attachment,
  TicketInput,
  CommentInput,
  CommentType,
} from '../../types/ticket';
import { DEFAULT_COMMENT_INPUT } from '../../types/ticket';
import type { TicketFormData, AppStep, AppMode } from './types';
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
import { CommentView } from './CommentView';
import { ModeToggle, MODE_PANEL_ID } from './ModeToggle';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';
import { ImagePreviewModal } from './ImagePreviewModal';
import { ProviderSelector } from './ProviderSelector';
import { StepIndicator } from './StepIndicator';
import { Toast, type ToastType } from '../ui/Toast';
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

  // Comment mode. Its state lives here alongside the ticket's, so switching
  // modes never discards work in the other one.
  const [mode, setMode] = useState<AppMode>('ticket');
  const [commentData, setCommentData] = useState<CommentInput>(DEFAULT_COMMENT_INPUT);
  const [commentContextOpen, setCommentContextOpen] = useState(false);
  const [commentCopied, setCommentCopied] = useState(false);
  const {
    generatedComment,
    editedContent: editedComment,
    isGenerating: isGeneratingComment,
    error: commentError,
    setEditedContent: setEditedComment,
    generateComment: hookGenerateComment,
    cancelGeneration: cancelCommentGeneration,
    reset: resetComment,
  } = useComment({ provider: selectedProvider });

  // Form state
  const [ticketData, setTicketData] = useState<TicketFormData>(DEFAULT_TICKET_DATA);
  // Which copy button last succeeded, so the confirmation renders on the button
  // that was actually pressed rather than on its neighbour.
  const [copiedTarget, setCopiedTarget] = useState<CopyTarget>(null);
  // The full ticket as last copied — lets "New ticket" skip its confirmation
  // when nothing would be lost.
  const lastCopiedMarkdown = useRef<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    setToast({ message, type });
  }, []);
  // Stable so the Toast's auto-dismiss timer isn't restarted on every render.
  const dismissToast = useCallback(() => setToast(null), []);
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
            // Drafts are ticket-only; in comment mode this just suppresses the
            // browser's "save page" dialog.
            if (mode === 'ticket') saveDraftNow(ticketData);
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
  }, [ticketData, saveDraftNow, mode]);

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

  // The button's own "Copied!" state is the confirmation — no toast on top.
  const confirmCopy = useCallback((target: Exclude<CopyTarget, null>) => {
    setCopiedTarget(target);
    setTimeout(() => setCopiedTarget(null), 2000);
  }, []);

  const reportCopyFailure = useCallback(() => {
    showToast('Copy failed — your browser blocked clipboard access', 'error');
  }, [showToast]);

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
      confirmCopy('plain');
    } catch (err) {
      console.error('Copy failed:', err);
      try {
        await navigator.clipboard.writeText(data.content);
        confirmCopy('plain');
      } catch {
        reportCopyFailure();
      }
    }
  }, [exportData, confirmCopy, reportCopyFailure]);

  /**
   * Copy the full markdown document — title, metadata header and body. Stays on
   * Review: it used to jump to a separate "done" screen, which meant navigating
   * back to fix a typo or copy again.
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
      confirmCopy('markdown');
      lastCopiedMarkdown.current = markdown;
    } catch (err) {
      console.error('Copy failed:', err);
      reportCopyFailure();
    }
  }, [exportData, confirmCopy, reportCopyFailure]);

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
    const stepIndex: Record<AppStep, number> = { describe: 0, review: 1 };
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

  // "New ticket" now sits on Review rather than after a copy, so it confirms
  // unless the ticket as it stands right now is what was last copied.
  const handleNewTicket = useCallback(() => {
    const isCopied = lastCopiedMarkdown.current === buildTicketMarkdown(exportData());
    if (
      !isCopied &&
      !window.confirm('Start a new ticket? This one hasn’t been copied and will be cleared.')
    ) {
      return;
    }
    lastCopiedMarkdown.current = null;
    hookReset();
    setTicketData(DEFAULT_TICKET_DATA);
    setCurrentStep('describe');
  }, [hookReset, exportData]);

  // --- Comment mode handlers ---

  const handleCommentNotesChange = useCallback((notes: string) => {
    setCommentData(prev => ({ ...prev, notes }));
  }, []);

  const handleCommentTypeChange = useCallback((type: CommentType) => {
    setCommentData(prev => ({ ...prev, type }));
  }, []);

  const handleCommentContextChange = useCallback((ticketContext: string) => {
    setCommentData(prev => ({ ...prev, ticketContext }));
  }, []);

  const handleGenerateComment = useCallback(() => {
    hookGenerateComment(commentData);
  }, [hookGenerateComment, commentData]);

  /** Copies the markdown as plain text, as the ticket flow's copy does. */
  const handleCopyComment = useCallback(async () => {
    const content = editedComment || generatedComment?.content;
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCommentCopied(true);
      setTimeout(() => setCommentCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
      reportCopyFailure();
    }
  }, [editedComment, generatedComment, reportCopyFailure]);

  const handleClearComment = useCallback(() => {
    resetComment();
    setCommentData(DEFAULT_COMMENT_INPUT);
  }, [resetComment]);

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
        {/* Header */}
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

        {/* Tab strip on the card's top edge, with the step indicator on the
            same row. The row is the same height in both modes, so the card
            never moves when switching — the step row used to exist only in
            ticket mode and shifted everything below it by 48px. */}
        <div>
          {/* items-center so the step labels line up with the tab labels;
              the strip sits flush on the card below (no gap). */}
          <div className="relative z-10 flex items-center justify-between gap-3 px-2 -mb-px">
            <ModeToggle value={mode} onChange={setMode} />
            {mode === 'ticket' && (
              <div>
                <StepIndicator
                  currentStep={currentStep}
                  onStepClick={handleStepClick}
                  canNavigateForwardTo={step => step === 'review' && !!generatedTicket}
                />
              </div>
            )}
          </div>

        {mode === 'comment' && (
          <div
            className="step-enter"
            id={MODE_PANEL_ID}
            role="tabpanel"
            aria-labelledby="mode-tab-comment"
          >
            <CommentView
              commentData={commentData}
              generatedComment={generatedComment}
              editedContent={editedComment}
              isGenerating={isGeneratingComment}
              providerLoading={providerLoading}
              error={commentError}
              copied={commentCopied}
              contextOpen={commentContextOpen}
              onContextOpenChange={setCommentContextOpen}
              onNotesChange={handleCommentNotesChange}
              onTypeChange={handleCommentTypeChange}
              onContextChange={handleCommentContextChange}
              onContentChange={setEditedComment}
              onGenerate={handleGenerateComment}
              onCancel={cancelCommentGeneration}
              onCopy={handleCopyComment}
              onClear={handleClearComment}
            />
          </div>
        )}

        {/* Step views — key forces remount for enter animation */}
        {mode === 'ticket' && (
          <div
            key={currentStep}
            className="step-enter"
            id={MODE_PANEL_ID}
            role="tabpanel"
            aria-labelledby="mode-tab-ticket"
          >
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
                onNewTicket={handleNewTicket}
                copiedTarget={copiedTarget}
                attachments={ticketData.attachments || []}
                onPreviewAttachment={setPreviewIndex}
              />
            )}
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
