/**
 * ReviewView Component
 * Step 2 of the two-step flow: review and edit the generated ticket
 */

import { memo, useState, useCallback } from "react";
import {
  ArrowLeft,
  Edit,
  RefreshCw,
  Copy,
  Check,
  Eye,
  Code2,
  Undo2,
  Save,
  FileText as FileTextIcon,
  File as FileIcon,
  AlertCircle,
  X,
  Sparkles,
  Plus,
} from "lucide-react";
import { TicketTypeSelector } from "./TicketTypeSelector";
import { PrioritySelector } from "./PrioritySelector";
import { MarkdownContent } from "../ui/MarkdownContent";
import type { GeneratedTicket, Attachment } from "../../types/ticket";
import { isImageAttachment } from "../../types/ticket";
import type { TicketFormData } from "./types";

/** Which copy action last succeeded, so feedback lands on the pressed button. */
export type CopyTarget = "plain" | "markdown" | null;

interface ReviewViewProps {
  generatedTicket: GeneratedTicket;
  editedContent: string;
  ticketData: TicketFormData;
  isGenerating: boolean;
  isRefining: boolean;
  error: string | null;
  onTitleChange: (title: string) => void;
  onTypeChange: (type: string) => void;
  onPriorityChange: (priority: string) => void;
  onAddLabel: (label: string) => void;
  onRemoveLabel: (label: string) => void;
  onContentChange: (content: string) => void;
  onRegenerate: () => void;
  onCopy: () => void;
  onCopyMarkdown: () => void;
  onRefine: (style: string) => void;
  onBackToEdit: () => void;
  onNewTicket: () => void;
  onUndo: () => void;
  canUndo: boolean;
  lastActionLabel: string | null;
  copiedTarget: CopyTarget;
  attachments?: Attachment[];
  onPreviewAttachment?: (index: number) => void;
}

/**
 * Grow a textarea to fit its content, so editing scrolls with the page rather
 * than inside a fixed-height box. Doubles as a callback ref to size it on mount.
 */
function fitToContent(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

const REFINEMENT_OPTIONS: {
  style: string;
  label: string;
  hint: string;
}[] = [
  { style: "concise", label: "More Concise", hint: "Tighten wording, cut redundancy" },
  { style: "detailed", label: "More Details", hint: "Expand context and edge cases" },
  { style: "technical", label: "More Technical", hint: "Add implementation detail" },
  { style: "business", label: "Business Focus", hint: "Frame as user and business impact" },
  { style: "user-story", label: "User Story", hint: 'Rewrite as "As a…, I want…"' },
  { style: "acceptance", label: "More Criteria", hint: "Add verifiable test cases" },
];

export const ReviewView = memo(function ReviewView({
  generatedTicket,
  editedContent,
  ticketData,
  isGenerating,
  isRefining,
  error,
  onTitleChange,
  onTypeChange,
  onPriorityChange,
  onAddLabel,
  onRemoveLabel,
  onContentChange,
  onRegenerate,
  onCopy,
  onCopyMarkdown,
  onRefine,
  onBackToEdit,
  onNewTicket,
  onUndo,
  canUndo,
  lastActionLabel,
  copiedTarget,
  attachments = [],
  onPreviewAttachment,
}: ReviewViewProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [draftContent, setDraftContent] = useState("");
  const [viewMode, setViewMode] = useState<"rendered" | "raw">("rendered");
  const [labelInput, setLabelInput] = useState("");
  const [labelError, setLabelError] = useState<string | null>(null);
  const [titleCopied, setTitleCopied] = useState(false);
  const [pendingRefine, setPendingRefine] = useState<string | null>(null);

  const displayContent = editedContent || generatedTicket.content;
  const aiSuggested = generatedTicket.metadata.aiSuggested;
  const imageCaptions = generatedTicket.metadata.imageCaptions || {};
  /** True once the body differs from the original generation (manual edit or refine). */
  const hasUnsavedWork =
    editedContent !== "" && editedContent !== generatedTicket.content;

  // Metadata edits don't re-derive the body, so track when the two have drifted
  // apart and offer a regeneration rather than leaving it implicit.
  const generatedMeta = generatedTicket.metadata;
  const changedMetadata = [
    ticketData.type !== generatedMeta.type ? "Type" : null,
    ticketData.priority !== generatedMeta.priority ? "Priority" : null,
    [...ticketData.labels].sort().join("|") !==
    [...generatedMeta.labels].sort().join("|")
      ? "Labels"
      : null,
  ].filter((field): field is string => field !== null);

  const handleAddLabel = useCallback(() => {
    const trimmed = labelInput.trim().toLowerCase();
    if (!trimmed) return;

    if (trimmed.length > 50) {
      setLabelError("Labels must be 50 characters or fewer.");
      return;
    }
    if (ticketData.labels.includes(trimmed)) {
      setLabelError(`"${trimmed}" is already added.`);
      return;
    }
    if (ticketData.labels.length >= 10) {
      setLabelError("Maximum of 10 labels.");
      return;
    }

    setLabelError(null);
    onAddLabel(trimmed);
    setLabelInput("");
  }, [labelInput, onAddLabel, ticketData.labels]);

  const handleStartEdit = useCallback(() => {
    setDraftContent(displayContent);
    setViewMode("raw");
    setIsEditMode(true);
  }, [displayContent]);

  const handleSaveEdit = useCallback(() => {
    onContentChange(draftContent);
    setIsEditMode(false);
    setViewMode("rendered");
  }, [draftContent, onContentChange]);

  const handleCancelEdit = useCallback(() => {
    setDraftContent("");
    setIsEditMode(false);
    setViewMode("rendered");
  }, []);

  const handleRegenerateClick = useCallback(() => {
    if (
      hasUnsavedWork &&
      !window.confirm(
        "Regenerating replaces the current version of this ticket with a new one from the AI.\n\nYou can undo it afterwards. Continue?",
      )
    ) {
      return;
    }
    onRegenerate();
  }, [hasUnsavedWork, onRegenerate]);

  const handleRefineClick = useCallback(
    (style: string) => {
      setPendingRefine(style);
      onRefine(style);
    },
    [onRefine],
  );

  return (
    <div className="space-y-4">
      <section className="bg-white/20 backdrop-blur-xl border-white/30 dark:bg-slate-800/20 dark:border-slate-700/50 rounded-2xl shadow-2xl border p-6 space-y-5">
        {/* Navigation — labelled, so neither reads as an unexplained icon. */}
        <div className="flex items-center justify-between gap-2 -mt-1">
          <button
            onClick={onBackToEdit}
            className="py-1 px-2 -ml-2 rounded-lg flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-white/40 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-700/30 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            title="Back to your description"
            type="button"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Back
          </button>
          <button
            onClick={onNewTicket}
            className="py-1 px-2 -mr-2 rounded-lg flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-white/40 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-700/30 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            title="Clear everything and start a new ticket"
            type="button"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            New ticket
          </button>
        </div>

        {/* Title - editable with copy button */}
        <div>
          <label
            htmlFor="review-title"
            className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300"
          >
            Title
          </label>
          <div className="relative">
            <input
              id="review-title"
              type="text"
              value={ticketData.title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Ticket title..."
              maxLength={100}
              className="w-full px-4 py-2 pr-10 text-lg font-semibold border-2 rounded-xl focus:outline-none focus-glow transition-all bg-white/20 backdrop-blur-xl border-white/30 text-slate-800 placeholder-slate-500 dark:bg-slate-800/20 dark:border-slate-700/50 dark:text-white dark:placeholder-slate-400"
            />
            {ticketData.title && (
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(ticketData.title);
                  setTitleCopied(true);
                  setTimeout(() => setTitleCopied(false), 1500);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all text-slate-600 hover:text-slate-900 hover:bg-slate-500/10 dark:text-slate-300 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Copy title"
                title="Copy title"
              >
                {titleCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>

        {/* Metadata row: Type, Priority */}
        <div className="flex flex-wrap items-start gap-4">
          <div>
            <TicketTypeSelector
              value={ticketData.type}
              onChange={onTypeChange}
            />
            {aiSuggested?.type && (
              <span className="inline-flex items-center gap-0.5 mt-1 text-xs text-blue-700 dark:text-blue-300">
                <Sparkles className="w-3 h-3" aria-hidden="true" />
                AI suggested
              </span>
            )}
          </div>
          <div>
            <PrioritySelector
              value={ticketData.priority}
              onChange={onPriorityChange}
            />
            {aiSuggested?.priority && (
              <span className="inline-flex items-center gap-0.5 mt-1 text-xs text-blue-700 dark:text-blue-300">
                <Sparkles className="w-3 h-3" aria-hidden="true" />
                AI suggested
              </span>
            )}
          </div>
        </div>

        {/* Labels */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
            Labels
            {aiSuggested?.labels && (
              <span className="inline-flex items-center gap-0.5 font-normal text-xs text-blue-700 dark:text-blue-300">
                <Sparkles className="w-3 h-3" aria-hidden="true" />
                AI suggested
              </span>
            )}
          </label>
          <div className="flex flex-wrap items-center gap-1.5">
            {ticketData.labels.map((label) => (
              <span
                key={label}
                className="inline-flex items-center gap-0.5 pl-2.5 pr-1 py-1 rounded-full text-xs border bg-white/30 border-white/30 text-slate-700 dark:bg-slate-800/30 dark:border-slate-700/50 dark:text-slate-200"
              >
                {label}
                <button
                  onClick={() => onRemoveLabel(label)}
                  className="p-1 rounded-full text-slate-500 hover:text-red-600 hover:bg-red-500/10 dark:text-slate-400 dark:hover:text-red-400 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/50"
                  aria-label={`Remove label ${label}`}
                  title={`Remove ${label}`}
                  type="button"
                >
                  <X className="w-3 h-3" aria-hidden="true" />
                </button>
              </span>
            ))}
            <input
              type="text"
              value={labelInput}
              onChange={(e) => {
                setLabelInput(e.target.value);
                if (labelError) setLabelError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  handleAddLabel();
                }
              }}
              placeholder="Add label…"
              aria-label="Add a label"
              aria-invalid={!!labelError}
              aria-describedby={labelError ? "label-error" : undefined}
              className="px-2.5 py-1 text-xs border rounded-full bg-white/20 dark:bg-slate-800/20 border-white/40 dark:border-slate-600 text-slate-800 dark:text-slate-100 placeholder-slate-600 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 w-28"
            />
          </div>
          {labelError && (
            <p
              id="label-error"
              className="mt-1 text-xs text-red-600 dark:text-red-400"
              role="alert"
            >
              {labelError}
            </p>
          )}
        </div>

        {/* Metadata edits don't rewrite the body. Rather than a permanent
            paragraph saying so, this only appears once they've drifted. */}
        {changedMetadata.length > 0 && (
          <div
            className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl border text-xs bg-amber-50/70 border-amber-300 text-amber-900 dark:bg-amber-900/20 dark:border-amber-700/50 dark:text-amber-200"
            role="status"
          >
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
            <span className="flex-1">
              {changedMetadata.join(" and ")}{" "}
              {changedMetadata.length === 1 ? "has" : "have"} changed since this
              ticket was written.
            </span>
            <button
              onClick={handleRegenerateClick}
              disabled={isGenerating || isEditMode}
              className="font-semibold underline hover:no-underline disabled:opacity-50 disabled:cursor-not-allowed rounded focus:outline-none focus:ring-2 focus:ring-amber-500"
              type="button"
            >
              Regenerate to match
            </button>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div
            className="p-3 rounded-xl bg-red-500/20 border border-red-500/50 text-red-700 dark:text-red-300"
            role="alert"
          >
            <div className="flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4" aria-hidden="true" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Body toolbar — secondary/tertiary tools only. The single primary
            action lives in the footer bar at the bottom of the screen. */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Rendered / Raw view toggle (segmented) */}
          <div
            className="inline-flex rounded-lg border border-white/40 dark:border-slate-600 overflow-hidden"
            role="group"
            aria-label="Body view mode"
          >
            {([
              { mode: "rendered" as const, label: "Rendered", Icon: Eye },
              { mode: "raw" as const, label: "Raw", Icon: Code2 },
            ]).map(({ mode, label, Icon }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                disabled={isEditMode}
                aria-pressed={viewMode === mode}
                className={`px-2.5 py-1.5 flex items-center gap-1.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                  viewMode === mode
                    ? "bg-blue-600 text-white"
                    : "bg-white/30 text-slate-700 hover:bg-white/50 dark:bg-slate-800/40 dark:text-slate-200 dark:hover:bg-slate-700/50"
                }`}
                type="button"
              >
                <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>

          {!isEditMode ? (
            <button
              onClick={handleStartEdit}
              className="py-1.5 px-3 rounded-lg flex items-center gap-1.5 text-sm border bg-white/30 text-slate-700 border-white/50 hover:bg-white/50 dark:bg-slate-800/40 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-700/50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              type="button"
            >
              <Edit className="w-3.5 h-3.5" aria-hidden="true" />
              Edit
            </button>
          ) : (
            <>
              <button
                onClick={handleSaveEdit}
                className="py-1.5 px-3 rounded-lg flex items-center gap-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
                type="button"
              >
                <Save className="w-3.5 h-3.5" aria-hidden="true" />
                Save changes
              </button>
              <button
                onClick={handleCancelEdit}
                className="py-1.5 px-3 rounded-lg flex items-center gap-1.5 text-sm border bg-transparent text-slate-700 border-white/50 hover:bg-white/40 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-700/50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                type="button"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
                Cancel
              </button>
            </>
          )}

          {canUndo && !isEditMode && (
            <button
              onClick={onUndo}
              className="py-1.5 px-3 rounded-lg flex items-center gap-1.5 text-sm border border-transparent text-blue-700 hover:bg-blue-500/10 dark:text-blue-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              type="button"
              title={lastActionLabel ? `Undo ${lastActionLabel}` : "Undo last change"}
            >
              <Undo2 className="w-3.5 h-3.5" aria-hidden="true" />
              Undo{lastActionLabel ? ` ${lastActionLabel}` : ""}
            </button>
          )}

        </div>

        {/* Body only. Title and metadata are edited above and added at copy
            time, so they can't be absorbed by body edits. It scrolls with the
            page: it used to be a capped inner scroll box inside a scrolling
            page, with an Expand button whose only job was lifting the cap. */}
        <div className="rounded-xl border bg-white/20 border-white/30 dark:bg-slate-800/20 dark:border-slate-700/50">
          {isEditMode ? (
            <textarea
              value={draftContent}
              onChange={(e) => {
                setDraftContent(e.target.value);
                fitToContent(e.target);
              }}
              ref={fitToContent}
              className="w-full min-h-[16rem] p-5 text-sm whitespace-pre-wrap font-mono rounded-xl focus:outline-none focus-glow border-2 border-transparent bg-white/40 text-slate-800 dark:bg-slate-800/40 dark:text-white resize-none overflow-hidden"
              aria-label="Ticket body (markdown)"
              placeholder="Edit your ticket here..."
            />
          ) : (
            <div className="p-5">
              {viewMode === "rendered" ? (
                <MarkdownContent content={displayContent} />
              ) : (
                <pre className="text-sm whitespace-pre-wrap font-mono text-slate-800 dark:text-slate-100">
                  {displayContent}
                </pre>
              )}
            </div>
          )}
        </div>

        {/* Attachment thumbnails */}
        {attachments.length > 0 && (
          <div className="p-3 rounded-xl border bg-white/20 border-white/30 dark:bg-slate-800/20 dark:border-slate-700/50">
            <label className="block text-xs font-semibold mb-2 text-slate-700 dark:text-slate-300">
              Attachments ({attachments.length})
            </label>
            <div className="flex flex-wrap gap-3">
              {attachments.map((att, idx) => {
                const caption = imageCaptions[att.name];
                return (
                  <div key={att.id} className="flex flex-col items-center gap-1" style={{ width: '5.5rem' }}>
                    <div
                      className={`relative group rounded-xl overflow-hidden border border-white/30 dark:border-slate-700/50 w-[4.5rem] h-[4.5rem] flex-shrink-0 bg-white/10 dark:bg-slate-800/30 ${isImageAttachment(att) && onPreviewAttachment ? 'cursor-pointer' : ''}`}
                      onClick={() => isImageAttachment(att) && onPreviewAttachment?.(idx)}
                    >
                      {isImageAttachment(att) ? (
                        <img
                          src={att.previewUrl}
                          alt={caption || att.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-1">
                          {att.mediaType === 'application/pdf' ? (
                            <FileTextIcon className="w-5 h-5 text-red-400" aria-hidden="true" />
                          ) : (
                            <FileIcon className="w-5 h-5 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                          )}
                          <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                            {att.name.split('.').pop()?.toUpperCase() || 'FILE'}
                          </span>
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[8px] text-white truncate block leading-tight">
                          {att.name}
                        </span>
                      </div>
                    </div>
                    {caption && (
                      <span className="text-xs text-slate-600 dark:text-slate-300 text-center leading-tight line-clamp-2">
                        {caption}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Refinement Options */}
        <div className="p-3 rounded-xl border bg-white/20 border-white/30 dark:bg-slate-800/20 dark:border-slate-700/50">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-2">
            Refine with AI{" "}
            <span className="font-normal text-xs text-slate-600 dark:text-slate-400">
              — rewrites the body; undo is available
            </span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
            {REFINEMENT_OPTIONS.map(({ style, label, hint }) => {
              const isPending = isRefining && pendingRefine === style;
              return (
                <button
                  key={style}
                  onClick={() => handleRefineClick(style)}
                  disabled={isRefining || isEditMode}
                  title={hint}
                  aria-busy={isPending}
                  className="px-2 py-2 text-xs rounded-lg border flex items-center justify-center gap-1.5 transition-colors bg-white/20 border-white/40 text-slate-700 hover:bg-white/40 dark:bg-slate-800/30 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700/40 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
                  type="button"
                >
                  {isPending ? (
                    <span
                      className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"
                      aria-hidden="true"
                    />
                  ) : (
                    <Sparkles className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
                  )}
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer action bar — every way out of this screen lives here, and the
          full-ticket copy is the only filled accent button. Sticky so Copy is
          always in reach; it used to start well below the fold. Opaque-ish
          background so body text scrolling underneath stays unreadable
          through it, and z-30 keeps it above the content but under the toast. */}
      <section className="sticky bottom-4 z-30 bg-white/80 backdrop-blur-xl border-white/40 dark:bg-slate-800/85 dark:border-slate-700/60 rounded-2xl shadow-2xl border p-2.5 sm:p-4">
        {/* One row on phones too — a wrapped two-row bar took ~15% of the
            screen. Regenerate goes icon-only and the attribution is hidden. */}
        <div className="flex items-center gap-2">
          {/* Quiet, destructive-intent action — the most expensive button on the
              screen should not also be the most prominent. */}
          <button
            onClick={handleRegenerateClick}
            disabled={isGenerating || isEditMode || !displayContent}
            className="py-2.5 px-3 sm:px-4 rounded-xl flex items-center gap-2 text-sm border border-transparent text-slate-600 hover:text-amber-700 hover:border-amber-500/50 hover:bg-amber-500/10 dark:text-slate-300 dark:hover:text-amber-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-amber-500"
            type="button"
            title="Discard this version and generate a new one"
            aria-label="Regenerate"
          >
            {isGenerating ? (
              <span
                className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"
                aria-hidden="true"
              />
            ) : (
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
            )}
            <span className="hidden sm:inline" aria-hidden="true">Regenerate</span>
          </button>

          <p className="flex-1 min-w-0 text-xs text-slate-600 dark:text-slate-400">
            {isEditMode ? (
              <span className="text-amber-700 dark:text-amber-300">
                Save or cancel your edits to copy.
              </span>
            ) : (
              <span className="hidden sm:inline">
                Generated by{" "}
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {generatedTicket.metadata.model}
                </span>
              </span>
            )}
          </p>

          {/* Both copies side by side, so the difference is visible at a glance
              rather than split between the toolbar and the footer. */}
          <button
            onClick={onCopy}
            disabled={isEditMode || !displayContent}
            className="py-2.5 px-3 sm:px-4 rounded-xl flex items-center gap-2 text-sm font-medium whitespace-nowrap border bg-white/30 text-slate-700 border-white/50 hover:bg-white/50 dark:bg-slate-800/40 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-700/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
            type="button"
            title="Copy the description only — for pasting into an existing JIRA ticket"
          >
            {copiedTarget === "plain" ? (
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            ) : (
              <Copy className="w-4 h-4" aria-hidden="true" />
            )}
            {copiedTarget === "plain" ? "Copied!" : "Copy body"}
          </button>

          <button
            onClick={onCopyMarkdown}
            disabled={isEditMode || !displayContent}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white py-2.5 px-4 sm:px-5 rounded-xl flex items-center gap-2 font-semibold whitespace-nowrap shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
            type="button"
            title="Copy title, type, priority, labels and description as Markdown"
          >
            {copiedTarget === "markdown" ? (
              <Check className="w-4 h-4" aria-hidden="true" />
            ) : (
              <Copy className="w-4 h-4" aria-hidden="true" />
            )}
            {copiedTarget === "markdown" ? "Copied!" : "Copy ticket"}
          </button>
        </div>
      </section>
    </div>
  );
});
