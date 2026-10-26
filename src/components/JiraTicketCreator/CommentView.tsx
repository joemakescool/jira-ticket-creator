/**
 * CommentView Component
 * Comment mode: turn rough notes into a comment for an existing JIRA ticket.
 *
 * A single screen rather than the ticket flow's Describe → Review steps — a
 * comment is short enough that the input and the result fit side by side, and
 * iterating means tweaking the notes and generating again.
 */

import { memo, useState, useCallback, useEffect } from 'react';
import {
  AlertCircle,
  Check,
  ChevronRight,
  Copy,
  Edit,
  Eye,
  Code2,
  RotateCcw,
  Save,
  Sparkles,
  X,
} from 'lucide-react';
import { MarkdownContent } from '../ui/MarkdownContent';
import { COMMENT_TYPE_OPTIONS, SELECTION_STYLES } from './constants';
import {
  MAX_COMMENT_CONTEXT_LENGTH,
  MAX_COMMENT_NOTES_LENGTH,
  MIN_COMMENT_NOTES_LENGTH,
} from '../../types/ticket';
import type { CommentInput, CommentType, GeneratedComment } from '../../types/ticket';

interface CommentViewProps {
  commentData: CommentInput;
  generatedComment: GeneratedComment | null;
  editedContent: string;
  isGenerating: boolean;
  providerLoading?: boolean;
  error: string | null;
  copied: boolean;
  /** Context disclosure state. Owned by the parent so it survives a mode switch. */
  contextOpen: boolean;
  onContextOpenChange: (isOpen: boolean) => void;
  onNotesChange: (notes: string) => void;
  onTypeChange: (type: CommentType) => void;
  onContextChange: (context: string) => void;
  onContentChange: (content: string) => void;
  onGenerate: () => void;
  onCancel: () => void;
  onCopy: () => void;
  onClear: () => void;
}

export const CommentView = memo(function CommentView({
  commentData,
  generatedComment,
  editedContent,
  isGenerating,
  providerLoading,
  error,
  copied,
  contextOpen,
  onContextOpenChange,
  onNotesChange,
  onTypeChange,
  onContextChange,
  onContentChange,
  onGenerate,
  onCancel,
  onCopy,
  onClear,
}: CommentViewProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [draftContent, setDraftContent] = useState('');
  const [viewMode, setViewMode] = useState<'rendered' | 'raw'>('rendered');

  const selectedType =
    COMMENT_TYPE_OPTIONS.find(option => option.value === commentData.type) ??
    COMMENT_TYPE_OPTIONS[0];
  const notesLength = commentData.notes.trim().length;
  const contextLength = commentData.ticketContext?.length ?? 0;
  const canGenerate =
    notesLength >= MIN_COMMENT_NOTES_LENGTH && !isGenerating && !providerLoading;
  const hasClearableInput =
    !!commentData.notes.trim() || !!commentData.ticketContext?.trim() || !!generatedComment;
  const displayContent = editedContent || generatedComment?.content || '';

  // A new generation replaces whatever was being edited, so drop out of edit
  // mode rather than leaving a stale draft over the fresh comment.
  const [prevComment, setPrevComment] = useState(generatedComment);
  if (prevComment !== generatedComment) {
    setPrevComment(generatedComment);
    setIsEditMode(false);
    setViewMode('rendered');
  }

  const handleGenerate = useCallback(() => {
    if (canGenerate && !isEditMode) onGenerate();
  }, [canGenerate, isEditMode, onGenerate]);

  // Ctrl+Enter generates, matching ticket mode. This view only mounts in comment
  // mode, so it never competes with InputView's handler for the same keys.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'Enter' || e.key === 'g')) {
        e.preventDefault();
        handleGenerate();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleGenerate]);

  const handleStartEdit = useCallback(() => {
    setDraftContent(displayContent);
    setIsEditMode(true);
  }, [displayContent]);

  const handleSaveEdit = useCallback(() => {
    onContentChange(draftContent);
    setIsEditMode(false);
  }, [draftContent, onContentChange]);

  const handleCancelEdit = useCallback(() => {
    setDraftContent('');
    setIsEditMode(false);
  }, []);

  const handleClear = useCallback(() => {
    if (window.confirm('Clear your notes, ticket context and the generated comment?')) {
      setIsEditMode(false);
      onClear();
    }
  }, [onClear]);

  return (
    <div className="space-y-4">
      <section
        className="bg-white/20 backdrop-blur-xl border-white/30 dark:bg-slate-800/20 dark:border-slate-700/50 rounded-2xl shadow-2xl border p-6 space-y-5"
        aria-label="Write a comment"
      >
        {/* Comment type */}
        <div>
          <label
            id="comment-type-label"
            className="block text-sm font-semibold mb-1 text-slate-800 dark:text-slate-200"
          >
            Comment type
          </label>
          <div
            className="flex flex-wrap gap-1.5"
            role="radiogroup"
            aria-labelledby="comment-type-label"
          >
            {COMMENT_TYPE_OPTIONS.map(option => {
              const Icon = option.icon;
              const isSelected = commentData.type === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => onTypeChange(option.value)}
                  className={`px-3 py-1.5 rounded-lg border-2 transition-all duration-200 press-effect flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-slate-800 ${
                    isSelected ? SELECTION_STYLES.selected : SELECTION_STYLES.unselected
                  }`}
                  role="radio"
                  aria-checked={isSelected}
                  title={option.description}
                  type="button"
                >
                  <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                  <span className="text-xs font-medium">{option.label}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            {selectedType.description}
          </p>
        </div>

        {/* Notes */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="comment-notes"
              className="text-sm font-semibold text-slate-800 dark:text-white"
            >
              Your notes
            </label>
            <span className="text-xs text-slate-500 dark:text-slate-400" aria-hidden="true">
              {commentData.notes.length}/{MAX_COMMENT_NOTES_LENGTH}
            </span>
          </div>
          <textarea
            id="comment-notes"
            value={commentData.notes}
            onChange={e => onNotesChange(e.target.value)}
            placeholder={selectedType.placeholder}
            maxLength={MAX_COMMENT_NOTES_LENGTH}
            rows={6}
            className="w-full px-4 py-3 border-2 rounded-xl text-sm font-mono resize-y bg-white/20 backdrop-blur-xl border-white/30 text-slate-800 placeholder-slate-500 dark:bg-slate-800/20 dark:border-slate-700/50 dark:text-white dark:placeholder-slate-400 focus:outline-none focus-glow transition-all"
          />
        </div>

        {/* Optional ticket context */}
        <div>
          <button
            onClick={() => onContextOpenChange(!contextOpen)}
            className="inline-flex items-center gap-1.5 py-1 -mx-1 px-1 rounded text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            type="button"
            aria-expanded={contextOpen}
            aria-controls="comment-context-panel"
          >
            Ticket context
            <span className="font-normal text-slate-500 dark:text-slate-400">(optional)</span>
            {!contextOpen && contextLength > 0 && (
              <span className="text-xs font-normal text-blue-700 dark:text-blue-300">
                · added
              </span>
            )}
            <ChevronRight
              className={`w-3.5 h-3.5 transition-transform duration-200 ${contextOpen ? 'rotate-90' : ''}`}
              aria-hidden="true"
            />
          </button>

          {contextOpen && (
            <div id="comment-context-panel" className="mt-2 hint-enter">
              <label htmlFor="comment-context" className="sr-only">
                Ticket context
              </label>
              <textarea
                id="comment-context"
                value={commentData.ticketContext ?? ''}
                onChange={e => onContextChange(e.target.value)}
                placeholder="Paste the ticket's title and description from JIRA so the comment uses the right terms and doesn't repeat what's already there."
                maxLength={MAX_COMMENT_CONTEXT_LENGTH}
                rows={5}
                className="w-full px-3 py-2 border rounded-lg text-xs resize-y bg-white/20 backdrop-blur-xl border-white/30 text-slate-800 placeholder-slate-500 dark:bg-slate-800/20 dark:border-slate-700/50 dark:text-white dark:placeholder-slate-400 focus:outline-none focus-glow transition-all"
              />
              <p className="mt-1 text-right text-xs text-slate-500 dark:text-slate-400">
                {contextLength}/{MAX_COMMENT_CONTEXT_LENGTH}
              </p>
            </div>
          )}
        </div>

        {/* Generate, with its secondary action (Clear, or Cancel while busy)
            on the same row rather than stacked beneath it. */}
        <div className="pt-1 space-y-3">
          <div className="flex gap-2">
            <button
              onClick={handleGenerate}
              disabled={!canGenerate || isEditMode}
              className="relative flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white border border-blue-700/50 hover:from-blue-500 hover:to-blue-600 py-3 px-5 rounded-xl disabled:from-slate-400 disabled:to-slate-500 disabled:border-slate-500/40 disabled:text-white/80 disabled:cursor-not-allowed disabled:shadow-none dark:disabled:from-slate-700 dark:disabled:to-slate-700 dark:disabled:text-slate-400 flex items-center justify-center gap-2 font-semibold shadow-lg transition-all hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
              aria-busy={isGenerating}
              aria-describedby={notesLength < MIN_COMMENT_NOTES_LENGTH ? 'comment-generate-hint' : undefined}
              type="button"
            >
              {isGenerating ? (
                <>
                  <span
                    className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"
                    aria-hidden="true"
                  />
                  Writing comment…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" aria-hidden="true" />
                  {/* One inline span, so the button's flex gap doesn't split the
                      words. "Comment" is dropped on narrow screens to fit one line. */}
                  <span>
                    {generatedComment ? 'Regenerate' : 'Generate'}
                    <span className="hidden sm:inline"> Comment</span>
                  </span>
                  <kbd className="absolute right-4 hidden sm:inline-block px-1.5 py-0.5 text-xs rounded bg-white/20 font-mono font-normal">
                    Ctrl+Enter
                  </kbd>
                </>
              )}
            </button>

            {isGenerating ? (
              <button
                onClick={onCancel}
                className="py-3 px-4 rounded-xl text-sm flex items-center gap-1.5 border border-white/50 bg-white/30 text-slate-700 hover:bg-white/50 dark:border-slate-600 dark:bg-slate-800/40 dark:text-slate-200 dark:hover:bg-slate-700/50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                type="button"
              >
                <X className="w-4 h-4" aria-hidden="true" />
                Cancel
              </button>
            ) : (
              <button
                onClick={handleClear}
                disabled={!hasClearableInput}
                className="py-3 px-4 rounded-xl text-sm flex items-center gap-1.5 border border-transparent text-slate-600 hover:text-red-700 hover:border-red-500/40 hover:bg-red-500/10 dark:text-slate-400 dark:hover:text-red-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-transparent disabled:hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-red-500"
                title="Clear notes, context and the generated comment"
                type="button"
              >
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
                Clear
              </button>
            )}
          </div>

          {notesLength < MIN_COMMENT_NOTES_LENGTH && !isGenerating && (
            <p id="comment-generate-hint" className="text-xs text-slate-600 dark:text-slate-400">
              Add a few words of notes above to generate a comment.
            </p>
          )}

          {error && !isGenerating && (
            <div
              className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 hint-enter"
              role="alert"
            >
              <div className="flex items-start gap-2 text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Generated comment */}
      {generatedComment && (
        <section
          className="bg-white/30 backdrop-blur-xl border-white/40 dark:bg-slate-800/30 dark:border-slate-700/60 rounded-2xl shadow-2xl border p-6 space-y-3 step-enter"
          aria-label="Generated comment"
        >
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mr-auto">
              Generated comment
            </h2>

            <div
              className="inline-flex rounded-lg border border-white/40 dark:border-slate-600 overflow-hidden"
              role="group"
              aria-label="Comment view mode"
            >
              {([
                { mode: 'rendered' as const, label: 'Rendered', Icon: Eye },
                { mode: 'raw' as const, label: 'Raw', Icon: Code2 },
              ]).map(({ mode, label, Icon }) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  disabled={isEditMode}
                  aria-pressed={viewMode === mode}
                  className={`px-2.5 py-1.5 flex items-center gap-1.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                    viewMode === mode
                      ? 'bg-blue-600 text-white'
                      : 'bg-white/30 text-slate-700 hover:bg-white/50 dark:bg-slate-800/40 dark:text-slate-200 dark:hover:bg-slate-700/50'
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
                disabled={isGenerating}
                className="py-1.5 px-3 rounded-lg flex items-center gap-1.5 text-sm border bg-white/30 text-slate-700 border-white/50 hover:bg-white/50 dark:bg-slate-800/40 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-700/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  Save
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
          </div>

          <div className="rounded-xl border bg-white/20 border-white/30 dark:bg-slate-800/20 dark:border-slate-700/50">
            {isEditMode ? (
              <textarea
                value={draftContent}
                onChange={e => setDraftContent(e.target.value)}
                className="w-full min-h-[12rem] p-4 text-sm whitespace-pre-wrap font-mono rounded-xl focus:outline-none focus-glow border-2 border-transparent bg-white/40 text-slate-800 dark:bg-slate-800/40 dark:text-white resize-y"
                aria-label="Comment (markdown)"
              />
            ) : (
              <div className={`p-4 max-h-[28rem] overflow-y-auto ${isGenerating ? 'opacity-50' : ''}`}>
                {viewMode === 'rendered' ? (
                  <MarkdownContent content={displayContent} />
                ) : (
                  <pre className="text-sm whitespace-pre-wrap font-mono text-slate-800 dark:text-slate-100">
                    {displayContent}
                  </pre>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <p className="flex-1 min-w-[10rem] text-xs text-slate-600 dark:text-slate-400">
              Generated by{' '}
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {generatedComment.model}
              </span>
            </p>
            <button
              onClick={onCopy}
              disabled={isEditMode || !displayContent}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white py-2.5 px-5 rounded-xl flex items-center gap-2 font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
              type="button"
            >
              {copied ? (
                <Check className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Copy className="w-4 h-4" aria-hidden="true" />
              )}
              {copied ? 'Copied!' : 'Copy comment'}
            </button>
          </div>

          {isEditMode && (
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Save or cancel your edits to copy.
            </p>
          )}
        </section>
      )}
    </div>
  );
});
