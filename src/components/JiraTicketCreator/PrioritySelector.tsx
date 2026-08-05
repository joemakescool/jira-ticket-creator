/**
 * PrioritySelector Component
 * Compact inline pill selector for ticket priority
 */

import { memo } from 'react';
import { PRIORITIES, SELECTION_STYLES, SEMANTIC_ICON_COLORS } from './constants';
import type { TicketFormData } from './types';

interface PrioritySelectorProps {
  value: TicketFormData['priority'];
  onChange: (priority: TicketFormData['priority']) => void;
}

export const PrioritySelector = memo(function PrioritySelector({
  value,
  onChange,
}: PrioritySelectorProps) {
  return (
    <div>
      <label
        id="priority-label"
        className="block text-sm font-semibold mb-1 text-slate-800 dark:text-slate-200"
      >
        Priority
      </label>
      <div
        className="flex flex-wrap gap-1"
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
              className={`px-2.5 py-1.5 rounded-lg border-2 transition-all duration-200 press-effect flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-slate-800 ${
                isSelected ? SELECTION_STYLES.selected : SELECTION_STYLES.unselected
              }`}
              role="radio"
              aria-checked={isSelected}
              aria-label={`${priority.name} priority`}
              type="button"
            >
              <Icon
                className={`w-3.5 h-3.5 ${SEMANTIC_ICON_COLORS[priority.name] ?? ''}`}
                aria-hidden="true"
              />
              <span className="text-xs font-medium">{priority.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
});
