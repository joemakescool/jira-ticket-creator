/**
 * PrioritySelector Component
 * Visual selector for ticket priority
 */

import { memo } from 'react';
import { PRIORITIES } from './constants';
import type { TicketFormData } from './types';

interface PrioritySelectorProps {
  value: TicketFormData['priority'];
  onChange: (priority: TicketFormData['priority']) => void;
}

const getPriorityStyles = (name: string, isSelected: boolean) => {
  if (!isSelected) {
    return 'bg-white/20 border-white/30 text-slate-600 hover:border-white/50 dark:bg-slate-800/20 dark:border-slate-700/50 dark:text-slate-300 dark:hover:border-slate-600';
  }

  const colorStyles: Record<string, string> = {
    Low: 'bg-green-100 border-green-500 text-green-700 shadow-lg shadow-green-500/20 dark:bg-green-600/30 dark:text-green-400',
    Medium: 'bg-yellow-100 border-yellow-500 text-yellow-700 shadow-lg shadow-yellow-500/20 dark:bg-yellow-600/30 dark:text-yellow-400',
    High: 'bg-orange-100 border-orange-500 text-orange-700 shadow-lg shadow-orange-500/20 dark:bg-orange-600/30 dark:text-orange-400',
    Critical: 'bg-red-100 border-red-500 text-red-700 shadow-lg shadow-red-500/20 dark:bg-red-600/30 dark:text-red-400',
  };

  return colorStyles[name] || colorStyles.Medium;
};

export const PrioritySelector = memo(function PrioritySelector({
  value,
  onChange,
}: PrioritySelectorProps) {
  return (
    <div>
      <label
        id="priority-label"
        className="block text-sm font-semibold mb-1.5 text-slate-800 dark:text-white"
      >
        Priority
      </label>
      <div
        className="grid grid-cols-2 gap-1.5"
        role="radiogroup"
        aria-labelledby="priority-label"
      >
        {PRIORITIES.map((priority) => {
          const Icon = priority.icon;
          const isSelected = value === priority.name;

          return (
            <button
              key={priority.name}
              onClick={() => onChange(priority.name)}
              className={`px-2 py-1.5 rounded-lg border-2 transition-all duration-200 flex items-center gap-1.5 ${getPriorityStyles(
                priority.name,
                isSelected,
              )}`}
              role="radio"
              aria-checked={isSelected}
              aria-label={`${priority.name} priority`}
              type="button"
            >
              <Icon className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="text-xs font-medium">{priority.name}</span>
              {isSelected && (
                <span className="sr-only">(selected)</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
});
