/**
 * DescriptionEditor Component
 * Markdown-enabled textarea with toolbar
 */

import { memo, useRef, useCallback } from 'react';
import { Bold, Italic, Code, Hash, List, CheckSquare, Link2, FileDown, Save } from 'lucide-react';
import type { MarkdownAction } from './types';

interface DescriptionEditorProps {
  value: string;
  onChange: (value: string) => void;
  wordCount: number;
  charCount: number;
  draftSaved: boolean;
  onLoadDraft: () => void;
  onClearDraft: () => void;
  isDarkMode?: boolean;
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
  onLoadDraft,
  onClearDraft,
  isDarkMode = true
}: DescriptionEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

    // Set cursor position
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
      <div className="flex items-center justify-between mb-3">
        <label
          htmlFor="description-input"
          className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}
        >
          Description
        </label>
        <div className="flex items-center gap-2">
          <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
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

      {/* Markdown Toolbar */}
      <div
        className={`flex flex-wrap items-center gap-1 p-2 mb-2 rounded-lg border ${
          isDarkMode
            ? 'bg-slate-800/20 backdrop-blur-xl border-slate-700/50'
            : 'bg-white/20 backdrop-blur-xl border-white/30'
        }`}
        role="toolbar"
        aria-label="Text formatting"
      >
        {toolbarButtons.map(({ action, icon: Icon, label }) => (
          <button
            key={action}
            onClick={() => insertMarkdown(action)}
            className={`p-1.5 rounded hover:bg-slate-700/30 transition-all ${
              isDarkMode ? 'text-slate-300' : 'text-slate-600'
            }`}
            aria-label={label}
            type="button"
          >
            <Icon className="w-4 h-4" aria-hidden="true" />
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={onLoadDraft}
            className={`p-1.5 rounded hover:bg-slate-700/30 transition-all ${
              isDarkMode ? 'text-slate-300' : 'text-slate-600'
            }`}
            aria-label="Load saved draft"
            type="button"
          >
            <FileDown className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            onClick={onClearDraft}
            className={`px-2 py-1 text-xs rounded hover:bg-slate-700/30 transition-all ${
              isDarkMode ? 'text-slate-300' : 'text-slate-600'
            }`}
            type="button"
          >
            Clear
          </button>
        </div>
      </div>

      <textarea
        ref={textareaRef}
        id="description-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Describe the problem, feature request, or task..."
        rows={5}
        className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
          isDarkMode
            ? 'bg-slate-800/20 backdrop-blur-xl border-slate-700/50 text-white placeholder-slate-400'
            : 'bg-white/20 backdrop-blur-xl border-white/30 text-slate-800 placeholder-slate-500'
        } resize-none font-mono text-sm`}
      />
    </div>
  );
});
