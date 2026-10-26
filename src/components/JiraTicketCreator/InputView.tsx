/**
 * InputView Component
 * Step 1 of the two-step flow: describe the problem
 */

import { memo, useState, useCallback, useEffect } from "react";
import {
  AlertCircle,
  Lightbulb,
  Clock,
  X,
  RotateCcw,
  Paperclip,
} from "lucide-react";
import { DescriptionEditor } from "./DescriptionEditor";
import { TicketTypeSelector } from "./TicketTypeSelector";
import { PrioritySelector } from "./PrioritySelector";
import { AdvancedOptions } from "./AdvancedOptions";
import { ClaudeLogo, OpenAILogo, OllamaLogo } from "./ProviderIcons";
import { TICKET_TYPE_HINTS } from "./constants";

const PROVIDER_LOGOS: Record<
  string,
  { Logo: React.ComponentType<{ className?: string }>; animation: string }
> = {
  claude: { Logo: ClaudeLogo, animation: "animate-slow-spin" },
  openai: { Logo: OpenAILogo, animation: "animate-breathe" },
  ollama: { Logo: OllamaLogo, animation: "animate-gentle-bounce" },
};
import type { TicketFormData } from "./types";
import type { RefinementStyle, Attachment } from "../../types/ticket";

function formatRelativeTime(timestamp: number | null): string {
  if (!timestamp) return "a while ago";
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

const GENERATION_PHASES = [
  "Analyzing your description",
  "Crafting your ticket",
  "Almost there",
  "Taking longer than expected",
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
  /**
   * Advanced Options disclosure state. Owned by the parent because InputView is
   * remounted on every step change (`key={currentStep}`), which would otherwise
   * collapse the panel whenever the user generates or navigates back.
   */
  advancedOpen: boolean;
  onAdvancedOpenChange: (isOpen: boolean) => void;
  showMoreStyles: boolean;
  onShowMoreStylesChange: (showMore: boolean) => void;
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
  onAddAttachments?: (attachments: Attachment[]) => void;
  onRemoveAttachment?: (id: string) => void;
  onReorderAttachments?: (attachments: Attachment[]) => void;
  onPreviewAttachment?: (index: number) => void;
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
  advancedOpen,
  onAdvancedOpenChange,
  showMoreStyles,
  onShowMoreStylesChange,
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
  onAddAttachments,
  onRemoveAttachment,
  onReorderAttachments,
  onPreviewAttachment,
}: InputViewProps) {
  // Validation state
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validationWarning, setValidationWarning] = useState<string | null>(
    null,
  );
  const [isShaking, setIsShaking] = useState(false);

  // Generation progress phase
  const [generationPhase, setGenerationPhase] = useState(0);

  // Adaptive form fields for Bug/Story types
  const [structuredInputs, setStructuredInputs] = useState<
    Record<string, string>
  >({});
  const [showHelpers, setShowHelpers] = useState(false);

  // Generation progress timer. The phase resets in cleanup rather than in the
  // effect body so no setState runs synchronously on a non-generating render.
  useEffect(() => {
    if (!isGenerating) return;

    const timers = [
      setTimeout(() => setGenerationPhase(1), 5000),
      setTimeout(() => setGenerationPhase(2), 15000),
      setTimeout(() => setGenerationPhase(3), 25000),
    ];
    return () => {
      timers.forEach(clearTimeout);
      setGenerationPhase(0);
    };
  }, [isGenerating]);

  // Clear validation on description change
  const handleDescriptionChangeWithValidation = useCallback(
    (value: string) => {
      if (validationError) setValidationError(null);
      if (validationWarning) setValidationWarning(null);
      onDescriptionChange(value);
    },
    [onDescriptionChange, validationError, validationWarning],
  );

  // Build full description including structured prompts
  const buildFullDescription = useCallback((): string => {
    let desc = ticketData.description;
    const hints = TICKET_TYPE_HINTS[ticketData.type];
    if (!hints?.structuredPrompts) return desc;

    const filledPrompts = hints.structuredPrompts
      .filter((p) => structuredInputs[p.label]?.trim())
      .map((p) => `**${p.label}:**\n${structuredInputs[p.label].trim()}`);

    if (filledPrompts.length > 0) {
      desc = desc.trim() + "\n\n" + filledPrompts.join("\n\n");
    }
    return desc;
  }, [ticketData.description, ticketData.type, structuredInputs]);

  // Validate and generate
  const handleValidateAndGenerate = useCallback(() => {
    const fullDesc = buildFullDescription().trim();

    if (!fullDesc) {
      setValidationError("Please describe your ticket before generating.");
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 600);
      return;
    }

    if (fullDesc.length < 10) {
      setValidationWarning(
        "Your description is very short. Adding more detail will produce a better ticket.",
      );
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
  }, [
    buildFullDescription,
    ticketData.description,
    onDescriptionChange,
    onGenerate,
  ]);

  // Keyboard shortcuts (Ctrl+Enter / Ctrl+G) — routed through validation.
  // Declared after handleValidateAndGenerate so the effect can depend on it
  // directly instead of re-deriving its inputs.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "Enter" || e.key === "g")) {
        e.preventDefault();
        if (!isGenerating && selectedProvider) {
          handleValidateAndGenerate();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isGenerating, selectedProvider, handleValidateAndGenerate]);

  // Reset structured inputs when the ticket type changes. Done during render
  // (React's documented "adjusting state when a prop changes" pattern) rather
  // than in an effect — React re-renders before committing, so there's no
  // extra commit and no frame showing the previous type's answers.
  const [prevType, setPrevType] = useState(ticketData.type);
  if (prevType !== ticketData.type) {
    setPrevType(ticketData.type);
    setStructuredInputs({});
    setShowHelpers(false);
  }

  const typeHints = TICKET_TYPE_HINTS[ticketData.type];
  const hasStructuredPrompts =
    typeHints?.structuredPrompts && typeHints.structuredPrompts.length > 0;

  // The CTA is muted until there's something to generate from, rather than
  // looking fully enabled and then rejecting the submission. Structured prompt
  // answers count, so this checks the composed description.
  const hasContent = buildFullDescription().trim().length > 0;
  const canGenerate = hasContent && !isGenerating && !providerLoading;
  const hasClearableInput =
    !!ticketData.description.trim() ||
    ticketData.labels.length > 0 ||
    (ticketData.attachments?.length ?? 0) > 0;

  const handleClearForm = useCallback(() => {
    if (
      window.confirm(
        'Clear the form? Your description, labels and attachments will be removed.',
      )
    ) {
      onClearDraft();
    }
  }, [onClearDraft]);

  return (
    <section
      className="bg-white/20 backdrop-blur-xl border-white/30 dark:bg-slate-800/20 dark:border-slate-700/50 rounded-2xl shadow-2xl border p-6 space-y-5"
      aria-label="Create ticket"
    >
      {/* Draft restore banner */}
      {showDraftBanner && (
        <div className="flex items-center justify-between p-3 rounded-xl border bg-amber-50/80 border-amber-200 dark:bg-amber-900/20 dark:border-amber-700/50 backdrop-blur-xl hint-enter">
          <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-300">
            <Clock className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            <span>
              You have an unsaved draft from{" "}
              {formatRelativeTime(draftTimestamp ?? null)}.
            </span>
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
      <div className={isShaking ? "animate-shake" : ""}>
        <DescriptionEditor
          value={ticketData.description}
          onChange={handleDescriptionChangeWithValidation}
          charCount={ticketData.description.length}
          wordCount={wordCount}
          draftSaved={draftSaved}
          errorMessage={validationError}
          warningMessage={validationWarning}
          hasError={!!validationError && !ticketData.description.trim()}
          placeholder={typeHints?.placeholder}
          attachments={ticketData.attachments || []}
          onAddAttachments={onAddAttachments}
          onRemoveAttachment={onRemoveAttachment}
          onReorderAttachments={onReorderAttachments}
          onPreviewAttachment={onPreviewAttachment}
        />
      </div>

      {/* Validation messages now render inside DescriptionEditor, directly
          beneath the textarea they describe and wired via aria-describedby. */}

      {/* Screen-reader progress announcements. The visual phase text lives in
          the button, which isn't a live region, so long generations were silent
          for assistive tech. */}
      <p className="sr-only" role="status" aria-live="polite">
        {isGenerating ? GENERATION_PHASES[generationPhase] : ''}
      </p>

      {/* Type and Priority share one row. A two-column grid rather than
          flex-wrap: with wrapping, Priority dropped onto its own line as soon as
          the chips exceeded the card width. Each column now wraps internally. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 items-start gap-x-4 gap-y-5 pt-1">
        <TicketTypeSelector
          value={ticketData.type}
          onChange={onTypeChange}
        />
        {/* Shrink-wrapped and pushed to the column's right edge, so the label
            sits directly above its own chips rather than orphaned above the
            empty left half of the column. */}
        <div className="sm:justify-self-end">
          <PrioritySelector
            value={ticketData.priority}
            onChange={onPriorityChange}
          />
        </div>
      </div>

      {/* Adaptive type hints */}
      {typeHints?.hint && (
        <div className="flex items-start gap-2 p-2.5 rounded-xl border bg-blue-50/50 border-blue-200/50 dark:bg-blue-900/10 dark:border-blue-800/30 hint-enter">
          <Lightbulb
            className="w-3.5 h-3.5 mt-0.5 text-blue-500 dark:text-blue-400 flex-shrink-0"
            aria-hidden="true"
          />
          <span className="text-xs text-blue-700 dark:text-blue-300">
            {typeHints.hint}
          </span>
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
            {showHelpers
              ? "Hide guided prompts"
              : `Show guided prompts for ${ticketData.type}`}
          </button>

          {showHelpers && (
            <div className="mt-2 space-y-2 hint-enter">
              {typeHints.structuredPrompts!.map((prompt) => (
                <div key={prompt.label}>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-0.5">
                    {prompt.label}
                  </label>
                  <textarea
                    value={structuredInputs[prompt.label] || ""}
                    onChange={(e) =>
                      setStructuredInputs((prev) => ({
                        ...prev,
                        [prompt.label]: e.target.value,
                      }))
                    }
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
        isOpen={advancedOpen}
        onOpenChange={onAdvancedOpenChange}
        showMoreStyles={showMoreStyles}
        onShowMoreStylesChange={onShowMoreStylesChange}
      />

      {/* Generate button */}
      <div className="pt-3 space-y-3">
        <div className="flex gap-2">
        <button
          onClick={handleValidateAndGenerate}
          disabled={!canGenerate}
          // `relative` so the trailing metadata can be pinned to the right edge
          // rather than sitting inline: inline, it split the label from the
          // keycap and shifted the centred label sideways whenever a file was
          // attached.
          className="relative flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white border border-blue-700/50 hover:from-blue-500 hover:to-blue-600 py-3.5 px-5 rounded-xl disabled:from-slate-400 disabled:to-slate-500 disabled:border-slate-500/40 disabled:text-white/80 disabled:cursor-not-allowed disabled:shadow-none dark:disabled:from-slate-700 dark:disabled:to-slate-700 dark:disabled:text-slate-400 flex items-center justify-center gap-3 font-semibold text-base shadow-lg transition-all hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
          aria-busy={isGenerating}
          aria-describedby={!hasContent ? "generate-hint" : undefined}
        >
          {(() => {
            const provider = PROVIDER_LOGOS[selectedProvider];
            const logoEl = provider ? (
              <span className={isGenerating ? provider.animation : ""}>
                <provider.Logo className="w-5 h-5" />
              </span>
            ) : (
              <div
                className={`rounded-full h-5 w-5 border-b-2 border-white ${isGenerating ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
            );

            if (isGenerating) {
              return (
                <>
                  {logoEl}
                  <span key={generationPhase} className="phase-fade-in">
                    {GENERATION_PHASES[generationPhase]}
                  </span>
                  <span className="loading-dots" aria-hidden="true">
                    <span className="dot dot-1">.</span>
                    <span className="dot dot-2">.</span>
                    <span className="dot dot-3">.</span>
                  </span>
                </>
              );
            }
            if (providerLoading) {
              return (
                <>
                  <div
                    className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"
                    aria-hidden="true"
                  />
                  <span>Checking Providers...</span>
                </>
              );
            }
            const attCount = ticketData.attachments?.length || 0;
            return (
              <>
                {logoEl}
                Generate Ticket
                {/* Ancillary info lives at the right edge so the label stays
                    optically centred and doesn't move when a file is attached.
                    The keycap is hidden on small screens — a keyboard shortcut
                    is meaningless on touch, and it would crowd the label. */}
                <span className="absolute right-4 flex items-center gap-2">
                  {attCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-sm font-normal opacity-75">
                      <Paperclip className="w-3.5 h-3.5" aria-hidden="true" />
                      {attCount}
                      <span className="sr-only">
                        {attCount === 1 ? "attachment" : "attachments"} included
                      </span>
                    </span>
                  )}
                  <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-xs rounded bg-white/20 font-mono font-normal">
                    Ctrl+Enter
                  </kbd>
                </span>
              </>
            );
          })()}
        </button>

        {/* Secondary action shares the CTA's row, matching comment mode. It's
            always rendered (Clear disabled when empty, swapped for Cancel while
            busy) so the primary button never resizes under the cursor. */}
        {isGenerating && onCancel ? (
          <button
            onClick={onCancel}
            className="py-3.5 px-4 rounded-xl text-sm flex items-center gap-1.5 border border-white/50 bg-white/30 text-slate-700 hover:bg-white/50 dark:border-slate-600 dark:bg-slate-800/40 dark:text-slate-200 dark:hover:bg-slate-700/50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            type="button"
          >
            <X className="w-4 h-4" aria-hidden="true" />
            Cancel
          </button>
        ) : (
          <button
            onClick={handleClearForm}
            disabled={!hasClearableInput || isGenerating}
            className="py-3.5 px-4 rounded-xl text-sm flex items-center gap-1.5 border border-transparent text-slate-600 hover:text-red-700 hover:border-red-500/40 hover:bg-red-500/10 dark:text-slate-400 dark:hover:text-red-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-transparent disabled:hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-red-500"
            type="button"
            title="Clear the description, labels and attachments"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            Clear
          </button>
        )}
        </div>

        {/* Hint explaining why the CTA is muted */}
        {!hasContent && !isGenerating && (
          <p
            id="generate-hint"
            className="text-xs text-slate-600 dark:text-slate-400"
          >
            Add a description above to generate a ticket.
          </p>
        )}

        {/* Error display */}
        {error && !isGenerating && (
          <div
            className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 hint-enter"
            role="alert"
          >
            <div className="flex items-start gap-2 text-red-600 dark:text-red-400">
              <AlertCircle
                className="w-4 h-4 mt-0.5 flex-shrink-0"
                aria-hidden="true"
              />
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
