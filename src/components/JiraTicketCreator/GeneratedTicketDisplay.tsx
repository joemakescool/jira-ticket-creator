/**
 * GeneratedTicketDisplay Component
 * Shows generated ticket content with edit and refinement options
 */

import { memo } from 'react';
import { Edit, RefreshCw, Copy, FileText, AlertCircle } from 'lucide-react';
import type { GeneratedTicket } from '../../types/ticket';

interface GeneratedTicketDisplayProps {
  generatedTicket: GeneratedTicket | null;
  editedContent: string;
  isEditMode: boolean;
  isGenerating: boolean;
  isRefining: boolean;
  error: string | null;
  onEditModeToggle: () => void;
  onContentChange: (content: string) => void;
  onRegenerate: () => void;
  onCopy: () => void;
  onCopyMarkdown: () => void;
  onRefine: (style: string) => void;
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

export const GeneratedTicketDisplay = memo(function GeneratedTicketDisplay({
  generatedTicket,
  editedContent,
  isEditMode,
  isGenerating,
  isRefining,
  error,
  onEditModeToggle,
  onContentChange,
  onRegenerate,
  onCopy,
  onCopyMarkdown,
  onRefine,
  copySuccess,
}: GeneratedTicketDisplayProps) {
  const hasContent = generatedTicket?.content || editedContent;
  const displayContent = editedContent || generatedTicket?.content;

  return (
    <div
      className="bg-white/20 backdrop-blur-xl border-white/30 dark:bg-slate-800/20 dark:border-slate-700/50 rounded-2xl shadow-2xl border p-5"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
          Generated Ticket
        </h2>
        {hasContent && (
          <div className="flex gap-2">
            <button
              onClick={onEditModeToggle}
              className={`${
                isEditMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-600 hover:bg-slate-700'
              } text-white py-2 px-4 rounded-xl flex items-center gap-2 transition-all`}
              type="button"
            >
              <Edit className="w-4 h-4" aria-hidden="true" />
              {isEditMode ? 'Editing' : 'Edit'}
            </button>
            <button
              onClick={onRegenerate}
              disabled={isGenerating || !editedContent}
              className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-xl flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              type="button"
            >
              {isGenerating ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
              )}
              Regenerate
            </button>
            <button
              onClick={onCopy}
              className={`${
                copySuccess ? 'bg-emerald-600' : 'bg-emerald-600 hover:bg-emerald-700'
              } text-white py-2 px-4 rounded-xl flex items-center gap-2 transition-all`}
              type="button"
            >
              <Copy className="w-4 h-4" aria-hidden="true" />
              {copySuccess ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={onCopyMarkdown}
              className="py-2 px-4 rounded-xl flex items-center gap-2 border bg-white/30 text-slate-700 border-white/50 dark:bg-slate-700/30 dark:text-slate-300 dark:border-slate-600"
              type="button"
            >
              <FileText className="w-4 h-4" aria-hidden="true" />
              Markdown
            </button>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div
          className="mb-4 p-4 rounded-xl bg-red-500/20 border border-red-500/50 text-red-300"
          role="alert"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" aria-hidden="true" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {hasContent ? (
        <>
          <div
            className="rounded-xl border bg-white/20 border-white/30 dark:bg-slate-800/20 dark:border-slate-700/50"
          >
            {isEditMode ? (
              <textarea
                value={editedContent}
                onChange={(e) => onContentChange(e.target.value)}
                className="w-full p-6 text-sm whitespace-pre-wrap font-mono rounded-xl focus:outline-none focus-glow border-2 border-transparent bg-white/40 text-slate-800 dark:bg-slate-800/40 dark:text-white resize-none"
                rows={20}
                placeholder="Edit your ticket here..."
              />
            ) : (
              <pre
                className="p-6 text-sm whitespace-pre-wrap font-mono text-slate-800 dark:text-white"
              >
                {displayContent}
              </pre>
            )}
          </div>

          {/* Refinement Options */}
          <div
            className="mt-4 p-4 rounded-xl border bg-white/20 border-white/30 dark:bg-slate-800/20 dark:border-slate-700/50"
          >
            <label
              className="block text-sm font-semibold mb-3 text-slate-800 dark:text-white"
            >
              Refine Ticket
            </label>
            <div className="grid grid-cols-3 gap-2">
              {REFINEMENT_OPTIONS.map(({ style, label }) => (
                <button
                  key={style}
                  onClick={() => onRefine(style)}
                  disabled={isRefining}
                  className="px-3 py-2 text-sm rounded-lg border transition-all bg-white/20 border-white/30 text-slate-600 hover:bg-white/30 dark:bg-slate-800/20 dark:border-slate-700/50 dark:text-slate-300 dark:hover:bg-slate-700/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  type="button"
                >
                  {isRefining ? '...' : label}
                </button>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div
          className="bg-white/20 border-white/30 dark:bg-slate-800/20 dark:border-slate-700/50 rounded-xl p-8 text-center border-2 border-dashed"
        >
          <FileText
            className="w-16 h-16 mx-auto mb-4 text-slate-500 dark:text-slate-400"
            aria-hidden="true"
          />
          <h3
            className="text-lg font-semibold mb-2 text-slate-800 dark:text-white"
          >
            No ticket generated yet
          </h3>
          <p className="text-slate-600 dark:text-slate-400">
            Fill in the details and click "Generate Ticket"
          </p>
        </div>
      )}
    </div>
  );
});
