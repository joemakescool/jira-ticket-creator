/**
 * JiraTicketCreator Component
 * Main component for creating JIRA tickets with AI assistance
 * Refactored from monolithic component into composable sub-components
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { FileText, Wand2 } from 'lucide-react';
import { useTicket } from '../../hooks/useTicket';
import type { RefinementStyle } from '../../types/ticket';
import type { TicketFormData } from './types';
import { DEFAULT_TICKET_DATA } from './types';

// Sub-components
import { DescriptionEditor } from './DescriptionEditor';
import { TicketTypeSelector } from './TicketTypeSelector';
import { PrioritySelector } from './PrioritySelector';
import { TemplateSelector } from './TemplateSelector';
import { LabelManager } from './LabelManager';
import { GeneratedTicketDisplay } from './GeneratedTicketDisplay';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';
import { ProviderSelector } from './ProviderSelector';
import { Toast } from '../ui/Toast';
import { useDraft } from './hooks/useDraft';

export function JiraTicketCreator() {
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
  const [autoGenerateTitle] = useState(true);
  const [autoCopy] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isDarkMode] = useState(true);
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

    if (autoGenerateTitle && value.length > 20) {
      titleGenerationTimeoutRef.current = setTimeout(() => {
        hookGenerateTitle();
      }, 1000);
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

    const styleMap: Record<string, RefinementStyle> = {
      'concise': 'concise',
      'detailed': 'detailed',
      'technical': 'technical',
      'business': 'business',
      'user-story': 'user-story',
      'acceptance': 'acceptance',
    };

    const apiStyle = styleMap[style] || 'concise';
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
    <div className={`min-h-screen bg-gradient-to-br ${
      isDarkMode
        ? 'from-slate-900 via-blue-900 to-slate-900'
        : 'from-blue-50 via-cyan-50 to-blue-100'
    } relative overflow-hidden`}>
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-blue-600 to-blue-700 opacity-10 rounded-full blur-3xl transform rotate-12" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-blue-500 to-cyan-600 opacity-10 rounded-full blur-3xl transform -rotate-12" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto p-8 space-y-8">
        {/* Header */}
        <header className="text-center mb-12">
          <div className={`${
            isDarkMode
              ? 'bg-slate-800/20 backdrop-blur-xl border-slate-700/50'
              : 'bg-white/20 backdrop-blur-xl border-white/30'
          } rounded-3xl p-8 shadow-2xl border`}>
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="p-4 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl shadow-xl">
                <FileText className="w-8 h-8 text-white" aria-hidden="true" />
              </div>
              <div className="text-left">
                <h1 className={`text-5xl font-bold mb-2 ${
                  isDarkMode ? 'text-white' : 'text-slate-800'
                }`}>JIRA Ticket Creator</h1>
                <p className={`text-lg ${
                  isDarkMode ? 'text-slate-300' : 'text-slate-600'
                }`}>
                  Generate professionally structured JIRA tickets with AI assistance
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4 flex-wrap">
              <ProviderSelector
                value={selectedProvider}
                onChange={setSelectedProvider}
                availableProviders={availableProviders}
                isDarkMode={isDarkMode}
              />

              {/* Progress Bar */}
              <div className="flex items-center gap-2">
                <div
                  className={`w-32 rounded-full h-3 ${
                    isDarkMode
                      ? 'bg-slate-800/20 backdrop-blur-xl border-slate-700/50'
                      : 'bg-white/20 backdrop-blur-xl border-white/30'
                  } border shadow-inner`}
                  role="progressbar"
                  aria-valuenow={calculateProgress()}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Ticket completion progress"
                >
                  <div
                    className="h-3 rounded-full transition-all duration-500 shadow-lg bg-gradient-to-r from-blue-600 to-blue-700"
                    style={{ width: `${calculateProgress()}%` }}
                  />
                </div>
                <span className={`font-medium text-sm ${
                  isDarkMode ? 'text-slate-300' : 'text-slate-600'
                }`}>
                  {calculateProgress()}% Complete
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

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Left Panel - Form */}
          <section
            className={`${
              isDarkMode
                ? 'bg-slate-800/20 backdrop-blur-xl border-slate-700/50'
                : 'bg-white/20 backdrop-blur-xl border-white/30'
            } rounded-2xl shadow-2xl border p-8 space-y-8`}
            aria-labelledby="create-ticket-heading"
          >
            <h2
              id="create-ticket-heading"
              className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}
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
              isDarkMode={isDarkMode}
            />

            {/* Title input */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label
                  htmlFor="ticket-title"
                  className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}
                >
                  Title {autoGenerateTitle && <span className="text-blue-500 text-xs">(auto-generated)</span>}
                </label>
                <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
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
                className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                  isDarkMode
                    ? 'bg-slate-800/20 backdrop-blur-xl border-slate-700/50 text-white placeholder-slate-400'
                    : 'bg-white/20 backdrop-blur-xl border-white/30 text-slate-800 placeholder-slate-500'
                }`}
              />
            </div>

            <TicketTypeSelector
              value={ticketData.type}
              onChange={handleTypeChange}
              isDarkMode={isDarkMode}
            />

            <PrioritySelector
              value={ticketData.priority}
              onChange={handlePriorityChange}
              isDarkMode={isDarkMode}
            />

            <TemplateSelector
              value={ticketData.template}
              onChange={handleTemplateChange}
              isDarkMode={isDarkMode}
            />

            <LabelManager
              labels={ticketData.labels}
              onAdd={handleAddLabel}
              onRemove={handleRemoveLabel}
              isDarkMode={isDarkMode}
            />

            {/* Generate button */}
            <button
              onClick={() => handleGenerateTicket(false)}
              disabled={isGenerating || !ticketData.description || !selectedProvider}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 px-6 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 font-semibold text-lg shadow-xl transition-all hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-busy={isGenerating}
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white" aria-hidden="true" />
                  <span>Generating...</span>
                </>
              ) : !selectedProvider ? (
                <>
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white" aria-hidden="true" />
                  <span>Loading Provider...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-6 h-6" aria-hidden="true" />
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
            isDarkMode={isDarkMode}
          />
        </div>
      </div>

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
        isDarkMode={isDarkMode}
      />
    </div>
  );
}

export default JiraTicketCreator;
