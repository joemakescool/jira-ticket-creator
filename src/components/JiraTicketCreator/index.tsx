/**
 * JiraTicketCreator Component
 * Main component for creating JIRA tickets with AI assistance
 * Two-step flow: Describe → Review & Edit
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Sun, Moon, CheckCircle, Plus } from 'lucide-react';
import { JiraLogo } from './ProviderIcons';
import { useTicket } from '../../hooks/useTicket';
import { useTheme } from '../../contexts/ThemeContext';
import type { RefinementStyle, Attachment } from '../../types/ticket';
import type { TicketFormData, AppStep } from './types';
import { DEFAULT_TICKET_DATA } from './types';

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
    setInput,
    setEditedContent,
    generateTicket: hookGenerateTicket,
    refineTicket: hookRefineTicket,
    regenerateTicket: hookRegenerateTicket,
    reset: hookReset,
    cancelGeneration,
  } = useTicket({ provider: selectedProvider, autoCopy: false });

  // Form state
  const [ticketData, setTicketData] = useState<TicketFormData>(DEFAULT_TICKET_DATA);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [currentStep, setCurrentStep] = useState<AppStep>('describe');

  // Image preview modal
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

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
        if (data.default && !selectedProvider) {
          setSelectedProvider(data.default);
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
      if (!selectedProvider) {
        setSelectedProvider('ollama');
      }
    } finally {
      clearTimeout(timeout);
      setProviderLoading(false);
    }
  }, [selectedProvider]);

  useEffect(() => { fetchProviders(); }, []);

  // Check for saved draft on mount
  useEffect(() => {
    const info = getDraftInfo();
    if (info.exists) {
      setShowDraftBanner(true);
      setDraftTimestamp(info.timestamp);
    }
  }, [getDraftInfo]);

  // Sync ticketData with hook input
  useEffect(() => {
    setInput({
      description: ticketData.description,
      title: ticketData.title,
      type: ticketData.type as 'Task' | 'Story' | 'Bug' | 'Spike' | 'Epic',
      priority: ticketData.priority as 'Low' | 'Medium' | 'High' | 'Critical',
      labels: ticketData.labels,
      writingStyle: ticketData.writingStyle,
      attachments: ticketData.attachments,
    });
  }, [ticketData, setInput]);

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
    const result = await hookGenerateTicket();
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
  }, [hookGenerateTicket]);

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

  const handleCopyToClipboard = useCallback(async () => {
    const content = editedContent || generatedTicket?.content || '';
    if (!content) return;

    const attachments = ticketData.attachments || [];

    try {
      if (attachments.length > 0 && typeof ClipboardItem !== 'undefined') {
        // Rich copy: HTML with embedded images
        const imagesHtml = attachments
          .map(att => `<p><img src="${att.previewUrl}" alt="${att.name}" style="max-width:600px;" /></p>`)
          .join('\n');
        const html = `<div>${content.replace(/\n/g, '<br />')}\n${imagesHtml}</div>`;
        const blob = new Blob([html], { type: 'text/html' });
        const textBlob = new Blob([content], { type: 'text/plain' });
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': blob,
            'text/plain': textBlob,
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(content);
      }
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
      // Fallback to plain text
      try {
        await navigator.clipboard.writeText(content);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch { /* ignore */ }
    }
  }, [editedContent, generatedTicket, ticketData.attachments]);

  const handleCopyAsMarkdown = useCallback(async () => {
    const ticketContent = editedContent || generatedTicket?.content || '';
    const attachments = ticketData.attachments || [];
    const imagesMarkdown = attachments.length > 0
      ? '\n\n---\n' + attachments.map(att => `![${att.name}](${att.previewUrl})`).join('\n')
      : '';
    const markdown = `# ${ticketData.title || 'Untitled Ticket'}\n\n**Type:** ${ticketData.type}\n**Priority:** ${ticketData.priority}\n**Labels:** ${ticketData.labels.length > 0 ? ticketData.labels.join(', ') : 'None'}\n\n${ticketContent || ticketData.description}${imagesMarkdown}`;

    try {
      if (attachments.length > 0 && typeof ClipboardItem !== 'undefined') {
        const imagesHtml = attachments
          .map(att => `<p><img src="${att.previewUrl}" alt="${att.name}" style="max-width:600px;" /></p>`)
          .join('\n');
        const html = `<h1>${ticketData.title || 'Untitled Ticket'}</h1>
<p><strong>Type:</strong> ${ticketData.type}<br /><strong>Priority:</strong> ${ticketData.priority}<br /><strong>Labels:</strong> ${ticketData.labels.length > 0 ? ticketData.labels.join(', ') : 'None'}</p>
<div>${(ticketContent || ticketData.description).replace(/\n/g, '<br />')}</div>
${imagesHtml}`;
        const blob = new Blob([html], { type: 'text/html' });
        const textBlob = new Blob([markdown], { type: 'text/plain' });
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': blob,
            'text/plain': textBlob,
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(markdown);
      }
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  }, [editedContent, generatedTicket, ticketData]);

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

  // Step navigation handler (Feature 7)
  const handleStepClick = useCallback((step: AppStep) => {
    const stepIndex: Record<AppStep, number> = { describe: 0, review: 1, done: 2 };
    if (stepIndex[step] < stepIndex[currentStep]) {
      setCurrentStep(step);
    }
  }, [currentStep]);

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
                error={providerError}
                onRetry={fetchProviders}
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

        {/* Toast notification */}
        {copySuccess && (
          <Toast
            message="Copied to clipboard!"
            type="success"
            onClose={() => setCopySuccess(false)}
          />
        )}

        {/* Persistent step indicator */}
        <div className="flex justify-center">
          <StepIndicator currentStep={currentStep} onStepClick={handleStepClick} />
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
              onBackToEdit={() => {
                setTicketData(prev => ({ ...prev, title: '' }));
                setCurrentStep('describe');
              }}
              copySuccess={copySuccess}
              attachments={ticketData.attachments || []}
              onPreviewAttachment={setPreviewIndex}
            />
          )}

          {currentStep === 'done' && (
            <div className="bg-white/20 backdrop-blur-xl border-white/30 dark:bg-slate-800/20 dark:border-slate-700/50 rounded-2xl shadow-2xl border p-8 text-center">
              <CheckCircle className="w-16 h-16 mx-auto mb-4 text-emerald-500" aria-hidden="true" />
              <h2 className="text-xl font-bold mb-2 text-slate-800 dark:text-white">
                Ticket Copied!
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Your ticket has been copied to the clipboard.
              </p>
              <button
                onClick={handleNewTicket}
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-2.5 px-6 rounded-xl flex items-center justify-center gap-2 font-semibold mx-auto shadow-xl hover:shadow-2xl transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                type="button"
              >
                <Plus className="w-5 h-5" aria-hidden="true" />
                Create Another
              </button>
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
