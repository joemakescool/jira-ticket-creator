/**
 * DescriptionEditor Component
 * Markdown-enabled textarea with collapsible toolbar and attachment support
 */

import { memo, useRef, useCallback, useState, useEffect } from 'react';
import { Bold, Italic, Code, Hash, List, CheckSquare, Link2, Save, Type, Plus, X, FileText, File as FileIcon } from 'lucide-react';
import type { MarkdownAction } from './types';
import type { Attachment } from '../../types/ticket';
import { isImageAttachment } from '../../types/ticket';

interface DescriptionEditorProps {
  value: string;
  onChange: (value: string) => void;
  wordCount: number;
  charCount: number;
  draftSaved: boolean;
  onClearDraft: () => void;
  hasError?: boolean;
  placeholder?: string;
  attachments?: Attachment[];
  onAddAttachments?: (attachments: Attachment[]) => void;
  onRemoveAttachment?: (id: string) => void;
  onReorderAttachments?: (attachments: Attachment[]) => void;
  onPreviewAttachment?: (index: number) => void;
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

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/** File extension to icon label mapping for non-image files */
const FILE_EXTENSIONS: Record<string, string> = {
  pdf: 'PDF', doc: 'DOC', docx: 'DOCX', xls: 'XLS', xlsx: 'XLSX',
  ppt: 'PPT', pptx: 'PPTX', txt: 'TXT', csv: 'CSV', json: 'JSON',
  xml: 'XML', zip: 'ZIP', rar: 'RAR', md: 'MD', log: 'LOG',
};

function getFileExtLabel(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return FILE_EXTENSIONS[ext] || ext.toUpperCase() || 'FILE';
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function fileToAttachment(file: File): Promise<Attachment> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_FILE_SIZE) {
      reject(new Error(`Too large: ${file.name} (max 10MB)`));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const isImage = file.type.startsWith('image/');
      resolve({
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: file.name,
        mediaType: file.type || 'application/octet-stream',
        data: dataUrl.split(',')[1],
        previewUrl: isImage ? dataUrl : '',
        size: file.size,
      });
    };
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export const DescriptionEditor = memo(function DescriptionEditor({
  value,
  onChange,
  wordCount,
  charCount,
  draftSaved,
  onClearDraft,
  hasError,
  placeholder,
  attachments = [],
  onAddAttachments,
  onRemoveAttachment,
  onReorderAttachments,
  onPreviewAttachment,
}: DescriptionEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const [showToolbar, setShowToolbar] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [pasteToast, setPasteToast] = useState<string | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const dragCounter = useRef(0);

  const handleFocus = useCallback(() => {
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    setShowToolbar(true);
  }, []);

  const handleBlur = useCallback(() => {
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

  // --- Attachment handling ---
  const processFiles = useCallback(async (files: FileList | File[]) => {
    if (!onAddAttachments) return;
    const valid = Array.from(files).filter(f => f.size <= MAX_FILE_SIZE);
    if (valid.length === 0) return;
    try {
      const newAtts = await Promise.all(valid.map(fileToAttachment));
      onAddAttachments(newAtts);
    } catch { /* errors handled per-file */ }
  }, [onAddAttachments]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    dragCounter.current++;
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    dragCounter.current = 0;
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      const files = e.dataTransfer.files;
      processFiles(files);
      const count = files.length;
      const label = count === 1 ? files[0].name : `${count} files`;
      setPasteToast(`Attached: ${label}`);
      setTimeout(() => setPasteToast(null), 2000);
    }
  }, [processFiles]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    if (!onAddAttachments) return;
    const items = Array.from(e.clipboardData.items);
    const files = items
      .filter(item => item.kind === 'file')
      .map(item => item.getAsFile())
      .filter((f): f is File => f !== null);
    if (files.length > 0) {
      e.preventDefault();
      processFiles(files);
      const label = files.length === 1 ? files[0].name : `${files.length} files`;
      setPasteToast(`Attached: ${label}`);
      setTimeout(() => setPasteToast(null), 2000);
    }
  }, [onAddAttachments, processFiles]);

  // --- Auto-grow textarea ---
  const autoGrow = useCallback((el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => {
    if (textareaRef.current) autoGrow(textareaRef.current);
  }, [value, autoGrow]);

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

      {/* Textarea with drag-and-drop */}
      <div
        className="relative"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <textarea
          ref={textareaRef}
          id="description-input"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            autoGrow(e.target);
          }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onPaste={handlePaste}
          placeholder={placeholder || 'Describe the problem, feature request, or task...'}
          rows={8}
          className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus-glow transition-[border-color,box-shadow] bg-white/20 backdrop-blur-xl text-slate-800 placeholder-slate-500 dark:bg-slate-800/20 dark:text-white dark:placeholder-slate-400 resize-none font-mono text-sm overflow-y-auto ${
            isDragging
              ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-500/20'
              : hasError
                ? 'border-red-500 dark:border-red-500 ring-2 ring-red-500/20'
                : 'border-white/30 dark:border-slate-700/50'
          }`}
          style={{ minHeight: '14rem', maxHeight: '60vh' }}
        />

        {/* Drag overlay */}
        {isDragging && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-blue-500/10 dark:bg-blue-400/10 pointer-events-none">
            <span className="text-sm font-medium text-blue-600 dark:text-blue-300">Drop files here</span>
          </div>
        )}

        {/* Paste / drop toast */}
        {pasteToast && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-emerald-500/90 text-white text-xs font-medium shadow-lg hint-enter pointer-events-none">
            {pasteToast}
          </div>
        )}
      </div>

      {/* Attachments bar */}
      {(onAddAttachments || attachments.length > 0) && (
        <div className="flex items-start gap-3 mt-2">
          {/* Add button */}
          {onAddAttachments && (
            <>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-shrink-0 w-[4.5rem] h-[4.5rem] rounded-xl border-2 border-dashed border-slate-300/50 dark:border-slate-600/50 hover:border-blue-400 dark:hover:border-blue-500 flex flex-col items-center justify-center gap-1 text-slate-400 dark:text-slate-500 hover:text-blue-500 dark:hover:text-blue-400 transition-all cursor-pointer"
                aria-label="Attach files"
                title="Attach files (images, PDFs, docs...)"
              >
                <Plus className="w-5 h-5" />
                <span className="text-[10px] font-medium">Attach</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    processFiles(e.target.files);
                    e.target.value = '';
                  }
                }}
                className="hidden"
              />
            </>
          )}

          {/* Attachment cards */}
          {attachments.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {attachments.map((att, idx) => (
                <div
                  key={att.id}
                  draggable={!!onReorderAttachments}
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'move';
                    setDragIdx(idx);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (dragIdx === null || dragIdx === idx || !onReorderAttachments) return;
                    const reordered = [...attachments];
                    const [moved] = reordered.splice(dragIdx, 1);
                    reordered.splice(idx, 0, moved);
                    onReorderAttachments(reordered);
                    setDragIdx(null);
                  }}
                  onDragEnd={() => setDragIdx(null)}
                  className={`relative group rounded-xl overflow-hidden border w-[4.5rem] h-[4.5rem] flex-shrink-0 shadow-sm bg-white/10 dark:bg-slate-800/30 transition-all ${
                    dragIdx === idx
                      ? 'opacity-50 border-blue-400 scale-95'
                      : 'border-white/30 dark:border-slate-600/50'
                  } ${isImageAttachment(att) && onPreviewAttachment ? 'cursor-pointer' : ''} ${onReorderAttachments ? 'cursor-grab active:cursor-grabbing' : ''}`}
                  onClick={() => isImageAttachment(att) && onPreviewAttachment?.(idx)}
                >
                  {isImageAttachment(att) ? (
                    <img
                      src={att.previewUrl}
                      alt={att.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-1">
                      {att.mediaType === 'application/pdf' ? (
                        <FileText className="w-5 h-5 text-red-400" aria-hidden="true" />
                      ) : (
                        <FileIcon className="w-5 h-5 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                      )}
                      <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                        {getFileExtLabel(att.name)}
                      </span>
                    </div>
                  )}

                  {/* Filename tooltip on hover */}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[8px] text-white truncate block leading-tight">
                      {att.name}
                    </span>
                    <span className="text-[7px] text-white/60">
                      {formatFileSize(att.size)}
                    </span>
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveAttachment?.(att.id);
                    }}
                    className="absolute top-0.5 right-0.5 p-0.5 bg-black/50 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all"
                    aria-label={`Remove ${att.name}`}
                    type="button"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
});
