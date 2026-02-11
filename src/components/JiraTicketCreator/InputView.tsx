/**
 * InputView Component
 * Step 1 of the two-step flow: describe the problem
 */

import { memo, useState, useCallback, useEffect } from 'react';
import { Wand2, AlertCircle, Lightbulb, Clock, X } from 'lucide-react';
import { DescriptionEditor } from './DescriptionEditor';
import { TicketTypeSelector } from './TicketTypeSelector';
import { PrioritySelector } from './PrioritySelector';
import { AdvancedOptions } from './AdvancedOptions';
import { TICKET_TYPE_HINTS } from './constants';
import type { TicketFormData } from './types';
import type { RefinementStyle } from '../../types/ticket';

function formatRelativeTime(timestamp: number | null): string {
  if (!timestamp) return 'a while ago';
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

const GENERATION_PHASES = [
  'Analyzing your description...',
  'Crafting your ticket...',
  'Almost there...',
  'Taking longer than expected...',
];

interface InputViewProps {
  ticketData: TicketFormData;
  isGenerating: boolean;
  selectedProvider: string;
  wordCount: number;
  draftSaved: boolean;
  providerLoading?: boolean;
  error?: string | null;
  showDraftBanner?: boolean;
  draftTimestamp?: number | null;
  onDescriptionChange: (value: string) => void;
  onTypeChange: (type: string) => void;
  onPriorityChange: (priority: string) => void;
  onTemplateChange: (template: string) => void;
  onWritingStyleChange: (style: RefinementStyle | undefined) => void;
  onGenerate: () => void;
  onClearDraft: () => void;
  onCancel?: () => void;
  onRestoreDraft?: () => void;
  onDiscardDraft?: () => void;
}

export const InputView = memo(function InputView({
  ticketData,
  isGenerating,
  selectedProvider,
  wordCount,
  draftSaved,
  providerLoading,
  error,
  showDraftBanner,
  draftTimestamp,
  onDescriptionChange,
  onTypeChange,
  onPriorityChange,
  onTemplateChange,
  onWritingStyleChange,
  onGenerate,
  onClearDraft,
  onCancel,
  onRestoreDraft,
  onDiscardDraft,
}: InputViewProps) {
  // Validation state
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validationWarning, setValidationWarning] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);

  // Generation progress phase
  const [generationPhase, setGenerationPhase] = useState(0);

  // Adaptive form fields for Bug/Story types
  const [structuredInputs, setStructuredInputs] = useState<Record<string, string>>({});
  const [showHelpers, setShowHelpers] = useState(false);

  // Generation progress timer
  useEffect(() => {
    if (!isGenerating) {
      setGenerationPhase(0);
      return;
    }
    const timers = [
      setTimeout(() => setGenerationPhase(1), 5000),
      setTimeout(() => setGenerationPhase(2), 15000),
      setTimeout(() => setGenerationPhase(3), 25000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [isGenerating]);

  // Keyboard shortcuts (Ctrl+Enter / Ctrl+G) — routed through validation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'Enter' || e.key === 'g')) {
        e.preventDefault();
        if (!isGenerating && selectedProvider) {
          handleValidateAndGenerate();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGenerating, selectedProvider, ticketData.description, structuredInputs, ticketData.type]);

  // Clear validation on description change
  const handleDescriptionChangeWithValidation = useCallback((value: string) => {
    if (validationError) setValidationError(null);
    if (validationWarning) setValidationWarning(null);
    onDescriptionChange(value);
  }, [onDescriptionChange, validationError, validationWarning]);

  // Build full description including structured prompts
  const buildFullDescription = useCallback((): string => {
    let desc = ticketData.description;
    const hints = TICKET_TYPE_HINTS[ticketData.type];
    if (!hints?.structuredPrompts) return desc;

    const filledPrompts = hints.structuredPrompts
      .filter(p => structuredInputs[p.label]?.trim())
      .map(p => `**${p.label}:**\n${structuredInputs[p.label].trim()}`);

    if (filledPrompts.length > 0) {
      desc = desc.trim() + '\n\n' + filledPrompts.join('\n\n');
    }
    return desc;
  }, [ticketData.description, ticketData.type, structuredInputs]);

  // Validate and generate
  const handleValidateAndGenerate = useCallback(() => {
    const fullDesc = buildFullDescription().trim();

    if (!fullDesc) {
      setValidationError('Please describe your ticket before generating.');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 600);
      return;
    }

    if (fullDesc.length < 10) {
      setValidationWarning('Your description is very short. Adding more detail will produce a better ticket.');
    } else {
      setValidationWarning(null);
    }

    setValidationError(null);

    // If structured prompts were filled, append them to the description
    const builtDesc = buildFullDescription();
    if (builtDesc !== ticketData.description) {
      onDescriptionChange(builtDesc);
      // Wait for state to propagate, then generate
      setTimeout(() => onGenerate(), 0);
    } else {
      onGenerate();
    }
  }, [buildFullDescription, ticketData.description, onDescriptionChange, onGenerate]);

  // Reset structured inputs when ticket type changes
  useEffect(() => {
    setStructuredInputs({});
    setShowHelpers(false);
  }, [ticketData.type]);

  const typeHints = TICKET_TYPE_HINTS[ticketData.type];
  const hasStructuredPrompts = typeHints?.structuredPrompts && typeHints.structuredPrompts.length > 0;

  return (
    <section
      className="bg-white/20 backdrop-blur-xl border-white/30 dark:bg-slate-800/20 dark:border-slate-700/50 rounded-2xl shadow-2xl border p-5 space-y-4"
      aria-label="Create ticket"
    >
      {/* Draft restore banner */}
      {showDraftBanner && (
        <div className="flex items-center justify-between p-3 rounded-xl border bg-amber-50/80 border-amber-200 dark:bg-amber-900/20 dark:border-amber-700/50 backdrop-blur-xl hint-enter">
          <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-300">
            <Clock className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            <span>You have an unsaved draft from {formatRelativeTime(draftTimestamp ?? null)}.</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onRestoreDraft}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              type="button"
            >
              Restore
            </button>
            <button
              onClick={onDiscardDraft}
              className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:underline"
              type="button"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {/* Description editor with shake animation */}
      <div className={isShaking ? 'animate-shake' : ''}>
        <DescriptionEditor
          value={ticketData.description}
          onChange={handleDescriptionChangeWithValidation}
          charCount={ticketData.description.length}
          wordCount={wordCount}
          draftSaved={draftSaved}
          onClearDraft={onClearDraft}
          hasError={!!validationError && !ticketData.description.trim()}
          placeholder={typeHints?.placeholder}
        />
      </div>

      {/* Validation error */}
      {validationError && (
        <div className="flex items-center gap-1.5 text-xs text-red-500 dark:text-red-400 hint-enter" role="alert">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Validation warning (non-blocking) */}
      {validationWarning && !validationError && (
        <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 hint-enter" role="status">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
          <span>{validationWarning}</span>
        </div>
      )}

      {/* Compact Type + Priority pills */}
      <div className="flex flex-wrap items-start gap-4">
        <TicketTypeSelector
          value={ticketData.type}
          onChange={onTypeChange}
        />
        <PrioritySelector
          value={ticketData.priority}
          onChange={onPriorityChange}
        />
      </div>

      {/* Adaptive type hints */}
      {typeHints?.hint && (
        <div className="flex items-start gap-2 p-2.5 rounded-xl border bg-blue-50/50 border-blue-200/50 dark:bg-blue-900/10 dark:border-blue-800/30 hint-enter">
          <Lightbulb className="w-3.5 h-3.5 mt-0.5 text-blue-500 dark:text-blue-400 flex-shrink-0" aria-hidden="true" />
          <span className="text-xs text-blue-700 dark:text-blue-300">{typeHints.hint}</span>
        </div>
      )}

      {/* Structured prompts for Bug/Story */}
      {hasStructuredPrompts && (
        <div className="hint-enter">
          <button
            onClick={() => setShowHelpers(!showHelpers)}
            className="text-xs text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors flex items-center gap-1"
            type="button"
          >
            <Lightbulb className="w-3 h-3" aria-hidden="true" />
            {showHelpers ? 'Hide guided prompts' : `Show guided prompts for ${ticketData.type}`}
          </button>

          {showHelpers && (
            <div className="mt-2 space-y-2 hint-enter">
              {typeHints.structuredPrompts!.map((prompt) => (
                <div key={prompt.label}>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-0.5">
                    {prompt.label}
                  </label>
                  <textarea
                    value={structuredInputs[prompt.label] || ''}
                    onChange={(e) => setStructuredInputs(prev => ({
                      ...prev,
                      [prompt.label]: e.target.value,
                    }))}
                    placeholder={prompt.placeholder}
                    rows={2}
                    className="w-full px-3 py-2 border rounded-lg text-xs bg-white/20 backdrop-blur-xl border-white/30 text-slate-800 placeholder-slate-400 dark:bg-slate-800/20 dark:border-slate-700/50 dark:text-white dark:placeholder-slate-500 resize-none focus:outline-none focus-glow transition-all"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Advanced Options accordion */}
      <AdvancedOptions
        template={ticketData.template}
        writingStyle={ticketData.writingStyle}
        onTemplateChange={onTemplateChange}
        onWritingStyleChange={onWritingStyleChange}
      />

      {/* Generate button */}
      <div className="pt-2 space-y-3">
        <button
          onClick={handleValidateAndGenerate}
          disabled={isGenerating || !!providerLoading}
          className="w-full bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 hover:from-blue-600 hover:via-blue-700 hover:to-indigo-700 text-white py-3.5 px-5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 font-semibold text-base shadow-lg shadow-blue-500/25 dark:shadow-blue-500/15 transition-all hover:shadow-xl hover:shadow-blue-500/30 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
          aria-busy={isGenerating}
        >
          {isGenerating ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" aria-hidden="true" />
              <span>{GENERATION_PHASES[generationPhase]}</span>
            </>
          ) : providerLoading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" aria-hidden="true" />
              <span>Checking Providers...</span>
            </>
          ) : (
            <>
              <Wand2 className="w-5 h-5" aria-hidden="true" />
              Generate Ticket
              <kbd className="ml-1 px-1.5 py-0.5 text-xs rounded bg-white/20 font-mono">Ctrl+Enter</kbd>
            </>
          )}
        </button>

        {/* Cancel button during generation */}
        {isGenerating && onCancel && (
          <button
            onClick={onCancel}
            className="w-full py-2 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors flex items-center justify-center gap-1.5"
            type="button"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
            Cancel
          </button>
        )}

        {/* Error display */}
        {error && !isGenerating && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 hint-enter" role="alert">
            <div className="flex items-start gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <div>
                <p className="text-sm">{error}</p>
                <div className="flex gap-3 mt-2">
                  <button
                    onClick={onGenerate}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                    type="button"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
});
