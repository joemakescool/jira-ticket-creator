/**
 * TicketWorkspace Component
 * Owns ticket mode: the form, the Describe → Review steps, drafts, and copy.
 *
 * Split out of JiraTicketCreator, which had grown to hold both modes' state.
 * It stays mounted while hidden, so switching to comment mode never discards a
 * ticket or cancels a generation in flight.
 */

import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { useTicket } from '../../hooks/useTicket';
import type { RefinementStyle, Attachment, TicketInput } from '../../types/ticket';
import type { TicketFormData, AppStep } from './types';
import { DEFAULT_TICKET_DATA } from './types';
import {
  buildTicketMarkdown,
  buildTicketHtml,
  type TicketExportData,
} from '../../utils/ticketExport';
import type { CopyTarget } from './ReviewView';
import { InputView } from './InputView';
import { ReviewView } from './ReviewView';
import { ImagePreviewModal } from './ImagePreviewModal';
import { StepIndicator } from './StepIndicator';
import { ModePanel } from './ModePanel';
import { useDraft } from './hooks/useDraft';

interface TicketWorkspaceProps {
  provider: string;
  providerLoading: boolean;
  /** Whether this mode's tab is selected. Hidden workspaces stay mounted. */
  isActive: boolean;
  /** The shared tab strip; this workspace supplies the step indicator. */
  tabs: (trailing?: ReactNode) => ReactNode;
  onCopyFailure: () => void;
}

export function TicketWorkspace({
  provider,
  providerLoading,
  isActive,
  tabs,
  onCopyFailure,
}: TicketWorkspaceProps) {
  const {
    generatedTicket,
    editedContent,
    isGenerating,
    isRefining,
    error,
    setEditedContent,
    generateTicket,
    refineTicket,
    regenerateTicket,
    reset,
    cancelGeneration,
    undo,
    canUndo,
    lastActionLabel,
  } = useTicket({ provider, autoCopy: false });

  const [ticketData, setTicketData] = useState<TicketFormData>(DEFAULT_TICKET_DATA);
  const [currentStep, setCurrentStep] = useState<AppStep>('describe');
  // Which copy button last succeeded, so the confirmation renders on the button
  // that was actually pressed rather than on its neighbour.
  const [copiedTarget, setCopiedTarget] = useState<CopyTarget>(null);
  // The full ticket as last copied — lets "New ticket" skip its confirmation
  // when nothing would be lost.
  const lastCopiedMarkdown = useRef<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  // Advanced Options disclosure state lives here, not in InputView — InputView
  // is keyed on currentStep and so remounts whenever the step changes.
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [showMoreStyles, setShowMoreStyles] = useState(false);

  // Draft management
  const { draftSaved, loadDraft, clearDraft, saveDraftNow, getDraftInfo } = useDraft(ticketData);
  // Read once at mount via lazy initialisers — getDraftInfo is a synchronous
  // localStorage read, so an effect just added a render with the banner hidden.
  const [initialDraft] = useState(getDraftInfo);
  const [showDraftBanner, setShowDraftBanner] = useState(initialDraft.exists);
  const draftTimestamp = initialDraft.timestamp;
  const prevDescriptionEmpty = useRef(true);

  // Derived during render rather than mirrored into state by an effect.
  const wordCount = ticketData.description.trim().split(/\s+/).filter(Boolean).length;

  // Ctrl+S saves the draft. Only while this tab is active — drafts are
  // ticket-only, so in comment mode it does nothing here. Ctrl+Enter/G live in
  // InputView, which routes them through validation.
  useEffect(() => {
    if (!isActive) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveDraftNow(ticketData);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, ticketData, saveDraftNow]);

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

  // --- Form handlers ---

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

  // --- Generation ---

  const handleGenerateAndTransition = useCallback(async () => {
    const result = await generateTicket(toTicketInput());
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
  }, [generateTicket, toTicketInput]);

  const handleRegenerateTicket = useCallback(async () => {
    await regenerateTicket({
      title: ticketData.title,
      type: ticketData.type,
      priority: ticketData.priority,
      labels: ticketData.labels,
    });
  }, [regenerateTicket, ticketData.title, ticketData.type, ticketData.priority, ticketData.labels]);

  const handleRefineTicket = useCallback(async (style: string) => {
    if (!editedContent && !generatedTicket) return;
    const apiStyle = (style as RefinementStyle) || 'concise';
    await refineTicket(apiStyle);
  }, [editedContent, generatedTicket, refineTicket]);

  // --- Copy ---

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
        onCopyFailure();
      }
    }
  }, [exportData, confirmCopy, onCopyFailure]);

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
      onCopyFailure();
    }
  }, [exportData, confirmCopy, onCopyFailure]);

  // --- Drafts ---

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

  // --- Navigation ---

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

  // "New ticket" sits on Review rather than after a copy, so it confirms
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
    reset();
    setTicketData(DEFAULT_TICKET_DATA);
    setCurrentStep('describe');
  }, [reset, exportData]);

  const attachments = ticketData.attachments || [];

  return (
    <>
      <ModePanel
        mode="ticket"
        isActive={isActive}
        animationKey={currentStep}
        tabs={tabs(
          <StepIndicator
            currentStep={currentStep}
            onStepClick={handleStepClick}
            canNavigateForwardTo={step => step === 'review' && !!generatedTicket}
          />,
        )}
      >
        {currentStep === 'describe' && (
          <InputView
            ticketData={ticketData}
            isGenerating={isGenerating}
            selectedProvider={provider}
            wordCount={wordCount}
            draftSaved={draftSaved}
            providerLoading={providerLoading}
            error={error}
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
            error={error}
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
            attachments={attachments}
            onPreviewAttachment={setPreviewIndex}
          />
        )}
      </ModePanel>

      {isActive && previewIndex !== null && attachments.length > 0 && (
        <ImagePreviewModal
          attachments={attachments}
          currentIndex={previewIndex}
          onClose={() => setPreviewIndex(null)}
          onNavigate={setPreviewIndex}
        />
      )}
    </>
  );
}
