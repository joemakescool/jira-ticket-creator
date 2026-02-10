/**
 * AdvancedOptions Component
 * Collapsible accordion for template, writing style, and labels
 */

import { memo, useState } from 'react';
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
}

export const AdvancedOptions = memo(function AdvancedOptions({
  template,
  writingStyle,
  onTemplateChange,
  onWritingStyleChange,
}: AdvancedOptionsProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-2 border-white/20 dark:border-slate-700/40 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-white/10 dark:hover:bg-slate-700/20 transition-colors"
        type="button"
        aria-expanded={isOpen}
      >
        <Settings2 className="w-3.5 h-3.5" aria-hidden="true" />
        Advanced Options
        <ChevronRight
          className={`w-3.5 h-3.5 ml-auto transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
          aria-hidden="true"
        />
      </button>

      <div
        className="grid transition-[grid-template-rows] duration-200 ease-out"
        style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <div className="px-3 pb-3 space-y-3 pt-1">
            <TemplateSelector value={template} onChange={onTemplateChange} />
            <WritingStyleSelector value={writingStyle} onChange={onWritingStyleChange} />
          </div>
        </div>
      </div>
    </div>
  );
});
