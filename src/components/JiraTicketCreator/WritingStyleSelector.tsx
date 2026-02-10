/**
 * WritingStyleSelector Component
 * Selector for pre-generation writing tone/style
 */

import { memo } from 'react';
import { WRITING_STYLES } from './constants';
import type { RefinementStyle } from '../../types/ticket';

interface WritingStyleSelectorProps {
  value: RefinementStyle | undefined;
  onChange: (style: RefinementStyle | undefined) => void;
}

export const WritingStyleSelector = memo(function WritingStyleSelector({
  value,
  onChange,
}: WritingStyleSelectorProps) {
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
        {WRITING_STYLES.map((style) => {
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
              type="button"
            >
              <Icon className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="text-xs font-medium">{style.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
});
