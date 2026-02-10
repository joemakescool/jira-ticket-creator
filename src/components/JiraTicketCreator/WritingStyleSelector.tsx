/**
 * WritingStyleSelector Component
 * Selector for pre-generation writing tone/style
 */

import { memo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { PRIMARY_WRITING_STYLES, SECONDARY_WRITING_STYLES } from './constants';
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

  const renderStyleButton = (style: typeof PRIMARY_WRITING_STYLES[number]) => {
    const Icon = style.icon;
    const isSelected = value === style.value;

    return (
      <button
        key={style.value}
        onClick={() => onChange(isSelected ? undefined : style.value)}
        className={`px-2 py-1.5 rounded-lg border-2 transition-all duration-200 press-effect flex items-center gap-1.5 ${
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
    );
  };

  return (
    <div>
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
