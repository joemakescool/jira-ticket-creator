/**
 * JiraTicketCreator Component
 * Main component for creating JIRA tickets with AI assistance
 * Refactored from monolithic component into composable sub-components
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { FileText, Wand2, Sun, Moon } from 'lucide-react';
import { useTicket } from '../../hooks/useTicket';
import { useTheme } from '../../contexts/ThemeContext';
import type { RefinementStyle } from '../../types/ticket';
import type { TicketFormData } from './types';
import { DEFAULT_TICKET_DATA } from './types';
import { TITLE_GENERATION_DELAY, MIN_DESCRIPTION_FOR_TITLE } from './constants';

// Sub-components
import { DescriptionEditor } from './DescriptionEditor';
import { TicketTypeSelector } from './TicketTypeSelector';
import { PrioritySelector } from './PrioritySelector';
import { TemplateSelector } from './TemplateSelector';
import { WritingStyleSelector } from './WritingStyleSelector';
import { LabelManager } from './LabelManager';
import { GeneratedTicketDisplay } from './GeneratedTicketDisplay';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';
import { ProviderSelector } from './ProviderSelector';
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
    generateTitle: hookGenerateTitle,
    copyToClipboard: hookCopyToClipboard,
  } = useTicket({ provider: selectedProvider, autoCopy: false });

  // Form state
  const [ticketData, setTicketData] = useState<TicketFormData>(DEFAULT_TICKET_DATA);
  const [isEditMode, setIsEditMode] = useState(false);
  const autoGenerateTitle = true;
  const autoCopy = true;
  const [copySuccess, setCopySuccess] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [wordCount, setWordCount] = useState(0);

  // Refs
  const titleGenerationTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Draft management
  const { draftSaved, loadDraft, clearDraft, saveDraftNow } = useDraft(ticketData);

  // Fetch available providers on mount
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const response = await fetch('/api/providers');
        if (response.ok) {
          const data = await response.json();
          setAvailableProviders(data.providers || []);
          if (data.default && !selectedProvider) {
            setSelectedProvider(data.default);
          }
        }
      } catch (err) {
        console.error('Failed to fetch providers:', err);
        setAvailableProviders(['claude', 'openai', 'ollama']);
        if (!selectedProvider) {
          setSelectedProvider('ollama');
        }
      }
    };
    fetchProviders();
  }, []);

  // Sync ticketData with hook input
  useEffect(() => {
    setInput({
      description: ticketData.description,
      title: ticketData.title,
      type: ticketData.type as 'Task' | 'Story' | 'Bug' | 'Spike' | 'Epic',
      priority: ticketData.priority as 'Low' | 'Medium' | 'High' | 'Critical',
      labels: ticketData.labels,
      writingStyle: ticketData.writingStyle,
    });
  }, [ticketData, setInput]);

  // Calculate word count
  useEffect(() => {
    const text = `${ticketData.description} ${ticketData.title}`.trim();
    const words = text.split(/\s+/).filter(word => word.length > 0);
    setWordCount(words.length);
  }, [ticketData.title, ticketData.description]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowShortcuts(false);
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'g':
            e.preventDefault();
            if (!isGenerating && ticketData.description) {
              handleGenerateTicket(false);
            }
            break;
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
  }, [ticketData, isGenerating, saveDraftNow]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (titleGenerationTimeoutRef.current) {
        clearTimeout(titleGenerationTimeoutRef.current);
      }
    };
  }, []);

  const calculateProgress = useCallback(() => {
    let completed = 0;
    const total = 5;

    if (ticketData.title?.trim()) completed++;
    if (ticketData.description?.trim()) completed++;
    if (ticketData.type) completed++;
    if (ticketData.priority) completed++;
    if (ticketData.labels?.length > 0) completed++;

    return Math.round((completed / total) * 100);
  }, [ticketData]);

  const handleDescriptionChange = useCallback((value: string) => {
    setTicketData(prev => ({ ...prev, description: value }));

    if (titleGenerationTimeoutRef.current) {
      clearTimeout(titleGenerationTimeoutRef.current);
    }

    if (autoGenerateTitle && value.length > MIN_DESCRIPTION_FOR_TITLE) {
      titleGenerationTimeoutRef.current = setTimeout(() => {
        hookGenerateTitle();
      }, TITLE_GENERATION_DELAY);
    }
  }, [autoGenerateTitle, hookGenerateTitle]);

  const handleTitleChange = useCallback((value: string) => {
    setTicketData(prev => ({ ...prev, title: value }));
  }, []);

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

  const handleGenerateTicket = useCallback(async (regenerate = false) => {
    if (regenerate) {
      await hookRegenerateTicket();
    } else {
      await hookGenerateTicket();
    }
    setIsEditMode(false);

    if (autoCopy && (generatedTicket || editedContent)) {
      setTimeout(() => hookCopyToClipboard(), 500);
    }
  }, [hookGenerateTicket, hookRegenerateTicket, autoCopy, generatedTicket, editedContent, hookCopyToClipboard]);

  const handleRefineTicket = useCallback(async (style: string) => {
    if (!editedContent && !generatedTicket) return;

    const apiStyle = (style as RefinementStyle) || 'concise';
    await hookRefineTicket(apiStyle);
    setIsEditMode(false);

    if (autoCopy && editedContent) {
      setTimeout(() => hookCopyToClipboard(), 500);
    }
  }, [editedContent, generatedTicket, hookRefineTicket, autoCopy, hookCopyToClipboard]);

  const handleCopyToClipboard = useCallback(async () => {
    const success = await hookCopyToClipboard();
    if (success) {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  }, [hookCopyToClipboard]);

  const handleCopyAsMarkdown = useCallback(async () => {
    const ticketContent = editedContent || generatedTicket?.content || '';
    const markdown = `# ${ticketData.title || 'Untitled Ticket'}\n\n**Type:** ${ticketData.type}\n**Priority:** ${ticketData.priority}\n**Labels:** ${ticketData.labels.length > 0 ? ticketData.labels.join(', ') : 'None'}\n\n${ticketContent || ticketData.description}`;
    try {
      await navigator.clipboard.writeText(markdown);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  }, [editedContent, generatedTicket, ticketData]);

  const handleLoadDraft = useCallback(() => {
    const draft = loadDraft();
    if (draft) {
      setTicketData(draft);
    }
  }, [loadDraft]);

  const handleClearDraft = useCallback(() => {
    clearDraft();
    setTicketData(DEFAULT_TICKET_DATA);
  }, [clearDraft]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-100 dark:from-slate-900 dark:via-blue-900 dark:to-slate-900 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-blue-600 to-blue-700 opacity-10 rounded-full blur-3xl transform rotate-12" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-blue-500 to-cyan-600 opacity-10 rounded-full blur-3xl transform -rotate-12" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto p-4 space-y-4">
        {/* Header */}
        <header className="mb-2 relative z-20">
          <div className="bg-white/20 backdrop-blur-xl border-white/30 dark:bg-slate-800/20 dark:border-slate-700/50 rounded-xl p-4 shadow-lg border">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg shadow-md">
                  <FileText className="w-5 h-5 text-white" aria-hidden="true" />
                </div>
                <h1 className="text-xl font-bold text-slate-800 dark:text-white">JIRA Ticket Creator</h1>
              </div>

              <div className="flex-1" />

              <ProviderSelector
                value={selectedProvider}
                onChange={setSelectedProvider}
                availableProviders={availableProviders}
              />

              <button
                onClick={toggleTheme}
                className="p-1.5 rounded-lg border transition-all bg-white/20 border-white/30 text-slate-600 hover:bg-white/30 dark:bg-slate-800/20 dark:border-slate-700/50 dark:text-slate-300 dark:hover:bg-slate-700/30"
                aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                type="button"
              >
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              <div className="flex items-center gap-1.5">
                <div
                  className="w-20 rounded-full h-2 bg-white/20 dark:bg-slate-800/20 border border-white/30 dark:border-slate-700/50"
                  role="progressbar"
                  aria-valuenow={calculateProgress()}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Ticket completion progress"
                >
                  <div
                    className="h-2 rounded-full transition-all duration-500 bg-gradient-to-r from-blue-600 to-blue-700"
                    style={{ width: `${calculateProgress()}%` }}
                  />
                </div>
                <span className="font-medium text-xs text-slate-500 dark:text-slate-400">
                  {calculateProgress()}%
                </span>
              </div>
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

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Left Panel - Form */}
          <section
            className="bg-white/20 backdrop-blur-xl border-white/30 dark:bg-slate-800/20 dark:border-slate-700/50 rounded-2xl shadow-2xl border p-5 space-y-4"
            aria-labelledby="create-ticket-heading"
          >
            <h2
              id="create-ticket-heading"
              className="text-lg font-bold text-slate-800 dark:text-white"
            >
              Create Ticket
            </h2>

            <DescriptionEditor
              value={ticketData.description}
              onChange={handleDescriptionChange}
              charCount={ticketData.description.length}
              wordCount={wordCount}
              draftSaved={draftSaved}
              onLoadDraft={handleLoadDraft}
              onClearDraft={handleClearDraft}
            />

            {/* Title input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="ticket-title"
                  className="text-sm font-semibold text-slate-800 dark:text-white"
                >
                  Title {autoGenerateTitle && <span className="text-blue-500 text-xs">(auto-generated)</span>}
                </label>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {ticketData.title.length}/100
                </span>
              </div>
              <input
                id="ticket-title"
                type="text"
                value={ticketData.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder={autoGenerateTitle ? "Auto-generated from description..." : "e.g., Fix user login timeout"}
                maxLength={100}
                className="w-full px-4 py-2 border-2 rounded-xl focus:outline-none focus-glow transition-all bg-white/20 backdrop-blur-xl border-white/30 text-slate-800 placeholder-slate-500 dark:bg-slate-800/20 dark:border-slate-700/50 dark:text-white dark:placeholder-slate-400"
              />
            </div>

            {/* Type + Priority row */}
            <div className="grid grid-cols-2 gap-4">
              <TicketTypeSelector
                value={ticketData.type}
                onChange={handleTypeChange}
              />
              <PrioritySelector
                value={ticketData.priority}
                onChange={handlePriorityChange}
              />
            </div>

            {/* Template + Writing Style row */}
            <div className="grid grid-cols-2 gap-4">
              <TemplateSelector
                value={ticketData.template}
                onChange={handleTemplateChange}
              />
              <WritingStyleSelector
                value={ticketData.writingStyle}
                onChange={handleWritingStyleChange}
              />
            </div>

            <LabelManager
              labels={ticketData.labels}
              onAdd={handleAddLabel}
              onRemove={handleRemoveLabel}
            />

            {/* Generate button */}
            <button
              onClick={() => handleGenerateTicket(false)}
              disabled={isGenerating || !ticketData.description || !selectedProvider}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 font-semibold text-base shadow-xl transition-all hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-busy={isGenerating}
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" aria-hidden="true" />
                  <span>Generating...</span>
                </>
              ) : !selectedProvider ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" aria-hidden="true" />
                  <span>Loading Provider...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5" aria-hidden="true" />
                  Generate Ticket
                </>
              )}
            </button>
          </section>

          {/* Right Panel - Generated Ticket */}
          <GeneratedTicketDisplay
            generatedTicket={generatedTicket}
            editedContent={editedContent}
            isEditMode={isEditMode}
            isGenerating={isGenerating}
            isRefining={isRefining}
            error={ticketError}
            onEditModeToggle={() => setIsEditMode(!isEditMode)}
            onContentChange={setEditedContent}
            onRegenerate={() => handleGenerateTicket(true)}
            onCopy={handleCopyToClipboard}
            onCopyMarkdown={handleCopyAsMarkdown}
            onRefine={handleRefineTicket}
            copySuccess={copySuccess}
          />
        </div>
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
