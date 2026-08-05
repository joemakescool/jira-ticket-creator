/**
 * TicketTypeSelector Component
 * Compact inline pill selector for ticket type
 */

import { memo } from 'react';
import { TICKET_TYPES, SELECTION_STYLES, SEMANTIC_ICON_COLORS } from './constants';
import type { TicketFormData } from './types';

interface TicketTypeSelectorProps {
  value: TicketFormData['type'];
  onChange: (type: TicketFormData['type']) => void;
}

export const TicketTypeSelector = memo(function TicketTypeSelector({
  value,
  onChange,
}: TicketTypeSelectorProps) {
  return (
    <div>
      <label
        id="ticket-type-label"
        className="block text-sm font-semibold mb-1 text-slate-800 dark:text-slate-200"
      >
        Type
      </label>
      <div
        className="flex flex-wrap gap-1"
        role="radiogroup"
        aria-labelledby="ticket-type-label"
      >
        {TICKET_TYPES.map((type) => {
          const Icon = type.icon;
          const isSelected = value === type.value;

          return (
            <button
              key={type.value}
              onClick={() => onChange(type.value)}
              className={`px-2.5 py-1.5 rounded-lg border-2 transition-all duration-200 press-effect flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-slate-800 ${
                isSelected ? SELECTION_STYLES.selected : SELECTION_STYLES.unselected
              }`}
              role="radio"
              aria-checked={isSelected}
              aria-label={`${type.value} ticket type`}
              type="button"
            >
              <Icon
                className={`w-3.5 h-3.5 ${SEMANTIC_ICON_COLORS[type.value] ?? ''}`}
                aria-hidden="true"
              />
              <span className="text-xs font-medium">{type.value}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
});
