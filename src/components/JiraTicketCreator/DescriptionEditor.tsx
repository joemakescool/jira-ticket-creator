/**
 * DescriptionEditor Component
 * Markdown-enabled textarea with collapsible toolbar
 */

import { memo, useRef, useCallback, useState } from 'react';
import { Bold, Italic, Code, Hash, List, CheckSquare, Link2, Save, Type } from 'lucide-react';
import type { MarkdownAction } from './types';

interface DescriptionEditorProps {
  value: string;
  onChange: (value: string) => void;
  wordCount: number;
  charCount: number;
  draftSaved: boolean;
  onClearDraft: () => void;
}

const MARKDOWN_INSERTIONS: Record<MarkdownAction, { template: string; placeholder: string; cursorOffset: number }> = {
  bold: { template: '**{text}**', placeholder: 'bold text', cursorOffset: 2 },
  italic: { template: '*{text}*', placeholder: 'italic text', cursorOffset: 1 },
  code: { template: '`{text}`', placeholder: 'code', cursorOffset: 1 },
  codeblock: { template: '```\n{text}\n```', placeholder: 'code block', cursorOffset: 4 },
  link: { template: '[{text}](url)', placeholder: 'link text', cursorOffset: -5 },
  ul: { template: '\n- {text}', placeholder: 'List item', cursorOffset: 2 },
  ol: { template: '\n1. {text}', placeholder: 'List item', cursorOffset: 3 },
  quote: { template: '\n> {text}', placeholder: 'Quote', cursorOffset: 2 },
  h3: { template: '\n### {text}', placeholder: 'Heading', cursorOffset: 4 },
  checkbox: { template: '\n- [ ] {text}', placeholder: 'Task', cursorOffset: 6 },
  table: { template: '\n| Column 1 | Column 2 |\n|----------|----------|\n| Data 1   | Data 2   |', placeholder: '', cursorOffset: 11 }
};

export const DescriptionEditor = memo(function DescriptionEditor({
  value,
  onChange,
  wordCount,
  charCount,
  draftSaved,
  onClearDraft,
}: DescriptionEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const [showToolbar, setShowToolbar] = useState(false);

  const handleFocus = useCallback(() => {
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    setShowToolbar(true);
  }, []);

  const handleBlur = useCallback(() => {
    // Delay to allow clicking toolbar buttons before hiding
    blurTimeoutRef.current = setTimeout(() => setShowToolbar(false), 150);
  }, []);

  const insertMarkdown = useCallback((action: MarkdownAction) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const config = MARKDOWN_INSERTIONS[action];

    const textToInsert = selectedText || config.placeholder;
    const newText = config.template.replace('{text}', textToInsert);
    const newValue = value.substring(0, start) + newText + value.substring(end);

    onChange(newValue);

    const cursorPos = selectedText
      ? start + newText.length
      : start + config.cursorOffset;

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(cursorPos, cursorPos);
    }, 0);
  }, [value, onChange]);

  const toolbarButtons: { action: MarkdownAction; icon: typeof Bold; label: string }[] = [
    { action: 'bold', icon: Bold, label: 'Bold (Ctrl+B)' },
    { action: 'italic', icon: Italic, label: 'Italic (Ctrl+I)' },
    { action: 'code', icon: Code, label: 'Inline code' },
    { action: 'h3', icon: Hash, label: 'Heading' },
    { action: 'ul', icon: List, label: 'Bullet list' },
    { action: 'checkbox', icon: CheckSquare, label: 'Checkbox' },
    { action: 'link', icon: Link2, label: 'Link' }
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label
          htmlFor="description-input"
          className="text-sm font-semibold text-slate-800 dark:text-white"
        >
          Description
        </label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {charCount} chars &bull; {wordCount} words
          </span>
          {draftSaved && (
            <span className="text-xs text-emerald-500 flex items-center gap-1">
              <Save className="w-3 h-3" aria-hidden="true" />
              Saved
            </span>
          )}
        </div>
      </div>

      {/* Collapsed Format button / Expanded Toolbar */}
      {showToolbar ? (
        <div
          className="flex flex-wrap items-center gap-1 p-1.5 mb-2 rounded-lg border bg-white/20 backdrop-blur-xl border-white/30 dark:bg-slate-800/20 dark:border-slate-700/50 toolbar-enter"
          role="toolbar"
          aria-label="Text formatting"
        >
          {toolbarButtons.map(({ action, icon: Icon, label }) => (
            <button
              key={action}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insertMarkdown(action)}
              className="p-1.5 rounded hover:bg-slate-700/30 transition-all text-slate-600 dark:text-slate-300"
              aria-label={label}
              type="button"
            >
              <Icon className="w-4 h-4" aria-hidden="true" />
            </button>
          ))}
          <div className="ml-auto">
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={onClearDraft}
              className="text-xs text-slate-400 hover:text-red-400 dark:text-slate-500 dark:hover:text-red-400 transition-colors px-1.5 py-0.5"
              type="button"
            >
              Clear
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => {
            textareaRef.current?.focus();
          }}
          className="flex items-center gap-1 mb-2 px-2 py-1 rounded-lg text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 border border-white/20 dark:border-slate-700/50 hover:bg-white/10 dark:hover:bg-slate-700/20 transition-all"
          type="button"
          aria-label="Show formatting toolbar"
        >
          <Type className="w-3.5 h-3.5" aria-hidden="true" />
          Format
        </button>
      )}

      <textarea
        ref={textareaRef}
        id="description-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder="Describe the problem, feature request, or task..."
        rows={3}
        className="w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus-glow transition-all bg-white/20 backdrop-blur-xl border-white/30 text-slate-800 placeholder-slate-500 dark:bg-slate-800/20 dark:border-slate-700/50 dark:text-white dark:placeholder-slate-400 resize-none font-mono text-sm"
      />
    </div>
  );
});
