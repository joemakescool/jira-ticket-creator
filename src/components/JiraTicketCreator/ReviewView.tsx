/**
 * ReviewView Component
 * Step 2 of the two-step flow: review and edit the generated ticket
 */

import { memo, useState, useCallback } from 'react';
import { ArrowLeft, Edit, RefreshCw, Copy, FileText, AlertCircle, X, Sparkles } from 'lucide-react';
import { TicketTypeSelector } from './TicketTypeSelector';
import { PrioritySelector } from './PrioritySelector';
import type { GeneratedTicket } from '../../types/ticket';
import type { TicketFormData } from './types';

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
  copySuccess: boolean;
}

const REFINEMENT_OPTIONS: { style: string; label: string }[] = [
  { style: 'concise', label: 'More Concise' },
  { style: 'detailed', label: 'More Details' },
  { style: 'technical', label: 'More Technical' },
  { style: 'business', label: 'Business Focus' },
  { style: 'user-story', label: 'User Story' },
  { style: 'acceptance', label: 'More Criteria' }
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
  copySuccess,
}: ReviewViewProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [labelInput, setLabelInput] = useState('');
  const displayContent = editedContent || generatedTicket.content;
  const aiSuggested = generatedTicket.metadata.aiSuggested;

  const handleAddLabel = useCallback(() => {
    const trimmed = labelInput.trim().toLowerCase();
    if (trimmed) {
      onAddLabel(trimmed);
      setLabelInput('');
    }
  }, [labelInput, onAddLabel]);

  return (
    <div className="space-y-4">
      <section
        className="bg-white/20 backdrop-blur-xl border-white/30 dark:bg-slate-800/20 dark:border-slate-700/50 rounded-2xl shadow-2xl border p-5 space-y-4"
      >
        {/* Back button */}
        <button
          onClick={onBackToEdit}
          className="p-1.5 rounded-lg border transition-all bg-white/20 border-white/30 text-slate-500 hover:text-slate-700 hover:bg-white/40 dark:bg-slate-800/20 dark:border-slate-700/50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700/30"
          aria-label="Back to description"
          title="Back to description"
          type="button"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        {/* Title - editable */}
        <div>
          <label
            htmlFor="review-title"
            className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300"
          >
            Title
          </label>
          <input
            id="review-title"
            type="text"
            value={ticketData.title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Ticket title..."
            maxLength={100}
            className="w-full px-4 py-2 text-lg font-semibold border-2 rounded-xl focus:outline-none focus-glow transition-all bg-white/20 backdrop-blur-xl border-white/30 text-slate-800 placeholder-slate-500 dark:bg-slate-800/20 dark:border-slate-700/50 dark:text-white dark:placeholder-slate-400"
          />
        </div>

        {/* Metadata row: Type, Priority */}
        <div className="flex flex-wrap items-start gap-4">
          <div>
            <TicketTypeSelector value={ticketData.type} onChange={onTypeChange} />
            {aiSuggested?.type && (
              <span className="inline-flex items-center gap-0.5 mt-1 text-[10px] text-blue-600 dark:text-blue-400">
                <Sparkles className="w-3 h-3" aria-hidden="true" />
                AI suggested
              </span>
            )}
          </div>
          <div>
            <PrioritySelector value={ticketData.priority} onChange={onPriorityChange} />
            {aiSuggested?.priority && (
              <span className="inline-flex items-center gap-0.5 mt-1 text-[10px] text-blue-600 dark:text-blue-400">
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
              <span className="inline-flex items-center gap-0.5 font-normal text-[10px] text-blue-600 dark:text-blue-400">
                <Sparkles className="w-3 h-3" aria-hidden="true" />
                AI suggested
              </span>
            )}
          </label>
          <div className="flex flex-wrap items-center gap-1.5">
            {ticketData.labels.map((label) => (
              <span
                key={label}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs border bg-white/30 border-white/30 text-slate-700 dark:bg-slate-800/30 dark:border-slate-700/50 dark:text-slate-300"
              >
                {label}
                <button
                  onClick={() => onRemoveLabel(label)}
                  className="ml-1 hover:text-red-500 transition-colors"
                  aria-label={`Remove ${label}`}
                  type="button"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <input
              type="text"
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  handleAddLabel();
                }
              }}
              placeholder="Add label..."
              className="px-2 py-0.5 text-xs border rounded-full bg-transparent border-white/20 dark:border-slate-700/50 text-slate-700 dark:text-slate-300 placeholder-slate-400 focus:outline-none focus:border-blue-400 w-24"
            />
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/50 text-red-700 dark:text-red-300" role="alert">
            <div className="flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4" aria-hidden="true" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={`${
              isEditMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-600 hover:bg-slate-700'
            } text-white py-1.5 px-3 rounded-lg flex items-center gap-1.5 text-sm transition-all`}
            type="button"
          >
            <Edit className="w-3.5 h-3.5" aria-hidden="true" />
            {isEditMode ? 'Editing' : 'Edit'}
          </button>
          <button
            onClick={onRegenerate}
            disabled={isGenerating || !editedContent}
            className="bg-purple-600 hover:bg-purple-700 text-white py-1.5 px-3 rounded-lg flex items-center gap-1.5 text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            type="button"
          >
            {isGenerating ? (
              <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            Regenerate
          </button>
          <button
            onClick={onCopy}
            className={`${
              copySuccess ? 'bg-emerald-600' : 'bg-emerald-600 hover:bg-emerald-700'
            } text-white py-1.5 px-3 rounded-lg flex items-center gap-1.5 text-sm transition-all`}
            type="button"
          >
            <Copy className="w-3.5 h-3.5" aria-hidden="true" />
            {copySuccess ? 'Copied!' : 'Copy'}
          </button>
          <button
            onClick={onCopyMarkdown}
            className="py-1.5 px-3 rounded-lg flex items-center gap-1.5 text-sm border bg-white/30 text-slate-700 border-white/50 dark:bg-slate-700/30 dark:text-slate-300 dark:border-slate-600"
            type="button"
          >
            <FileText className="w-3.5 h-3.5" aria-hidden="true" />
            Markdown
          </button>
        </div>

        {/* Content display */}
        <div className="rounded-xl border bg-white/20 border-white/30 dark:bg-slate-800/20 dark:border-slate-700/50">
          {isEditMode ? (
            <textarea
              value={editedContent}
              onChange={(e) => onContentChange(e.target.value)}
              className="w-full p-5 text-sm whitespace-pre-wrap font-mono rounded-xl focus:outline-none focus-glow border-2 border-transparent bg-white/40 text-slate-800 dark:bg-slate-800/40 dark:text-white resize-none"
              rows={20}
              placeholder="Edit your ticket here..."
            />
          ) : (
            <pre className="p-5 text-sm whitespace-pre-wrap font-mono text-slate-800 dark:text-white">
              {displayContent}
            </pre>
          )}
        </div>

        {/* Refinement Options */}
        <div className="p-3 rounded-xl border bg-white/20 border-white/30 dark:bg-slate-800/20 dark:border-slate-700/50">
          <label className="block text-xs font-semibold mb-2 text-slate-700 dark:text-slate-300">
            Refine Ticket
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {REFINEMENT_OPTIONS.map(({ style, label }) => (
              <button
                key={style}
                onClick={() => onRefine(style)}
                disabled={isRefining}
                className="px-2 py-1.5 text-xs rounded-lg border transition-all bg-white/20 border-white/30 text-slate-600 hover:bg-white/30 dark:bg-slate-800/20 dark:border-slate-700/50 dark:text-slate-300 dark:hover:bg-slate-700/30 disabled:opacity-50 disabled:cursor-not-allowed"
                type="button"
              >
                {isRefining ? '...' : label}
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
});
