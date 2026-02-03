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
  isDarkMode?: boolean;
}

const getPriorityStyles = (name: string, isSelected: boolean, isDarkMode: boolean) => {
  if (!isSelected) {
    return isDarkMode
      ? 'bg-slate-800/20 border-slate-700/50 text-slate-300 hover:border-slate-600'
      : 'bg-white/20 border-white/30 text-slate-600 hover:border-white/50';
  }

  const colorStyles: Record<string, string> = {
    Low: isDarkMode
      ? 'bg-green-600/30 border-green-500 text-green-400 shadow-lg shadow-green-500/20'
      : 'bg-green-100 border-green-500 text-green-700 shadow-lg shadow-green-500/20',
    Medium: isDarkMode
      ? 'bg-yellow-600/30 border-yellow-500 text-yellow-400 shadow-lg shadow-yellow-500/20'
      : 'bg-yellow-100 border-yellow-500 text-yellow-700 shadow-lg shadow-yellow-500/20',
    High: isDarkMode
      ? 'bg-orange-600/30 border-orange-500 text-orange-400 shadow-lg shadow-orange-500/20'
      : 'bg-orange-100 border-orange-500 text-orange-700 shadow-lg shadow-orange-500/20',
    Critical: isDarkMode
      ? 'bg-red-600/30 border-red-500 text-red-400 shadow-lg shadow-red-500/20'
      : 'bg-red-100 border-red-500 text-red-700 shadow-lg shadow-red-500/20'
  };

  return colorStyles[name] || colorStyles.Medium;
};

export const PrioritySelector = memo(function PrioritySelector({
  value,
  onChange,
  isDarkMode = true
}: PrioritySelectorProps) {
  return (
    <div>
      <label
        id="priority-label"
        className={`block text-sm font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}
      >
        Priority
      </label>
      <div
        className="flex flex-wrap gap-2"
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
              className={`px-4 py-2 rounded-xl border-2 transition-all duration-200 flex items-center gap-2 ${getPriorityStyles(
                priority.name,
                isSelected,
                isDarkMode
              )}`}
              role="radio"
              aria-checked={isSelected}
              aria-label={`${priority.name} priority`}
              type="button"
            >
              <Icon className="w-4 h-4" aria-hidden="true" />
              <span className="text-sm font-medium">{priority.name}</span>
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
