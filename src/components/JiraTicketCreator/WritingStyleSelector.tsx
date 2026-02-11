/**
 * WritingStyleSelector Component
 * Selector for pre-generation writing tone/style with preview popovers
 */

import { memo, useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { PRIMARY_WRITING_STYLES, SECONDARY_WRITING_STYLES } from './constants';
import type { WritingStyleConfig } from './constants';
import type { RefinementStyle } from '../../types/ticket';

interface WritingStyleSelectorProps {
  value: RefinementStyle | undefined;
  onChange: (style: RefinementStyle | undefined) => void;
}

export const WritingStyleSelector = memo(function WritingStyleSelector({
  value,
  onChange,
}: WritingStyleSelectorProps) {
  const [showMore, setShowMore] = useState(false);
  const [previewStyle, setPreviewStyle] = useState<RefinementStyle | null>(null);
  const previewTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  // Close preview on click outside or Escape
  useEffect(() => {
    if (!previewStyle) return;

    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setPreviewStyle(null);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setPreviewStyle(null);
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [previewStyle]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
    };
  }, []);

  const handlePreviewEnter = useCallback((styleValue: RefinementStyle) => {
    if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
    setPreviewStyle(styleValue);
  }, []);

  const handlePreviewLeave = useCallback(() => {
    previewTimeoutRef.current = setTimeout(() => setPreviewStyle(null), 200);
  }, []);

  const renderStyleButton = (style: WritingStyleConfig) => {
    const Icon = style.icon;
    const isSelected = value === style.value;
    const isPreviewOpen = previewStyle === style.value;

    return (
      <div key={style.value} className="relative">
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => onChange(isSelected ? undefined : style.value)}
            className={`flex-1 px-2 py-1.5 rounded-lg border-2 transition-all duration-200 press-effect flex items-center gap-1.5 ${
              isSelected
                ? 'bg-indigo-100 border-indigo-500 text-indigo-700 shadow-lg shadow-indigo-500/20 dark:bg-indigo-600/30 dark:text-indigo-400'
                : 'bg-white/20 border-white/30 text-slate-600 hover:border-white/50 dark:bg-slate-800/20 dark:border-slate-700/50 dark:text-slate-300 dark:hover:border-slate-600'
            }`}
            role="radio"
            aria-checked={isSelected}
            title={style.description}
            type="button"
          >
            <Icon className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="text-xs font-medium">{style.label}</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setPreviewStyle(isPreviewOpen ? null : style.value);
            }}
            onMouseEnter={() => handlePreviewEnter(style.value)}
            onMouseLeave={handlePreviewLeave}
            onFocus={() => handlePreviewEnter(style.value)}
            onBlur={handlePreviewLeave}
            className="p-1 rounded-full text-slate-400 hover:text-blue-500 dark:text-slate-500 dark:hover:text-blue-400 transition-colors flex-shrink-0"
            aria-label={`Preview ${style.label} style`}
            type="button"
          >
            <HelpCircle className="w-3 h-3" />
          </button>
        </div>

        {/* Preview popover */}
        {isPreviewOpen && (
          <div
            className="absolute left-0 top-full mt-1 z-50 p-3 rounded-xl border shadow-xl backdrop-blur-xl bg-white/95 border-white/40 dark:bg-slate-800/95 dark:border-slate-700/60 text-xs max-w-[260px] dropdown-enter"
            role="tooltip"
            onMouseEnter={() => handlePreviewEnter(style.value)}
            onMouseLeave={handlePreviewLeave}
          >
            <p className="font-semibold text-slate-700 dark:text-slate-200 mb-1.5 text-[11px]">
              {style.label} Example:
            </p>
            <pre className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-mono text-[10px]">{style.example}</pre>
          </div>
        )}
      </div>
    );
  };

  return (
    <div ref={containerRef}>
      <label
        id="writing-style-label"
        className="block text-sm font-semibold mb-1.5 text-slate-800 dark:text-white"
      >
        Writing Style
      </label>
      <div
        className="grid grid-cols-3 gap-1.5"
        role="radiogroup"
        aria-labelledby="writing-style-label"
      >
        {PRIMARY_WRITING_STYLES.map(renderStyleButton)}
      </div>

      {showMore && (
        <div className="grid grid-cols-3 gap-1.5 mt-1.5" role="radiogroup" aria-label="More writing styles">
          {SECONDARY_WRITING_STYLES.map(renderStyleButton)}
        </div>
      )}

      <button
        onClick={() => setShowMore(!showMore)}
        className="mt-1.5 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1 transition-colors"
        type="button"
      >
        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showMore ? 'rotate-180' : ''}`} />
        {showMore ? 'Fewer styles' : 'More styles...'}
      </button>
    </div>
  );
});
