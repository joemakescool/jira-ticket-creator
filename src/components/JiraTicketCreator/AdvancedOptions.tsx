/**
 * AdvancedOptions Component
 * Collapsible accordion for template and writing style.
 *
 * The reveal animates a measured pixel height rather than
 * `grid-template-rows: 0fr -> 1fr`. The `fr` transition resolved against the
 * container instead of the content, so the open state settled at a height that
 * cut the last row in half. A ResizeObserver keeps the measurement current, so
 * toggling "More styles" while the panel is open grows it smoothly instead of
 * clipping the newly revealed row.
 */

import { memo, useState, useRef, useEffect } from 'react';
import { ChevronRight, Settings2 } from 'lucide-react';
import { TemplateSelector } from './TemplateSelector';
import { WritingStyleSelector } from './WritingStyleSelector';
import type { TicketFormData } from './types';
import type { RefinementStyle } from '../../types/ticket';

interface AdvancedOptionsProps {
  template: TicketFormData['template'];
  writingStyle: RefinementStyle | undefined;
  onTemplateChange: (template: TicketFormData['template']) => void;
  onWritingStyleChange: (style: RefinementStyle | undefined) => void;
  /** Controlled so the panel stays open across generation and back-navigation. */
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  showMoreStyles: boolean;
  onShowMoreStylesChange: (showMore: boolean) => void;
}

export const AdvancedOptions = memo(function AdvancedOptions({
  template,
  writingStyle,
  onTemplateChange,
  onWritingStyleChange,
  isOpen,
  onOpenChange,
  showMoreStyles,
  onShowMoreStylesChange,
}: AdvancedOptionsProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);

  // ResizeObserver delivers an initial observation on observe(), so there's no
  // need to seed the height synchronously here.
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContentHeight(entry.target.scrollHeight);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div>
      {/* Reads as a section title rather than a boxed button — the bordered
          container and full-width hit area made a secondary disclosure look
          like a primary control. */}
      <button
        onClick={() => onOpenChange(!isOpen)}
        className="inline-flex items-center gap-1.5 py-1 -mx-1 px-1 rounded text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        type="button"
        aria-expanded={isOpen}
        aria-controls="advanced-options-content"
      >
        <Settings2 className="w-4 h-4" aria-hidden="true" />
        Advanced Options
        <ChevronRight
          className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
          aria-hidden="true"
        />
      </button>

      <div
        id="advanced-options-content"
        className="overflow-hidden transition-[max-height] duration-200 ease-out"
        style={{ maxHeight: isOpen ? contentHeight : 0 }}
        aria-hidden={!isOpen}
      >
        <div ref={contentRef} className="space-y-3 pt-2">
          <TemplateSelector value={template} onChange={onTemplateChange} />
          <WritingStyleSelector
            value={writingStyle}
            onChange={onWritingStyleChange}
            showMore={showMoreStyles}
            onShowMoreChange={onShowMoreStylesChange}
          />
        </div>
      </div>
    </div>
  );
});
