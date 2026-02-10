/**
 * TicketTypeSelector Component
 * Visual selector for ticket type (Task, Story, Bug, Spike, Epic)
 */

import { memo } from 'react';
import { TICKET_TYPES } from './constants';
import type { TicketFormData } from './types';

interface TicketTypeSelectorProps {
  value: TicketFormData['type'];
  onChange: (type: TicketFormData['type']) => void;
}

const getTypeStyles = (type: string, isSelected: boolean) => {
  if (!isSelected) {
    return 'bg-white/20 border-white/30 text-slate-600 hover:border-white/50 hover:bg-white/30 dark:bg-slate-800/20 dark:border-slate-700/50 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-700/30';
  }

  const colorStyles: Record<string, string> = {
    Task: 'bg-blue-100 border-blue-500 text-blue-700 shadow-lg shadow-blue-500/20 dark:bg-blue-600/30 dark:text-blue-400',
    Story: 'bg-green-100 border-green-500 text-green-700 shadow-lg shadow-green-500/20 dark:bg-green-600/30 dark:text-green-400',
    Bug: 'bg-red-100 border-red-500 text-red-700 shadow-lg shadow-red-500/20 dark:bg-red-600/30 dark:text-red-400',
    Spike: 'bg-purple-100 border-purple-500 text-purple-700 shadow-lg shadow-purple-500/20 dark:bg-purple-600/30 dark:text-purple-400',
    Epic: 'bg-orange-100 border-orange-500 text-orange-700 shadow-lg shadow-orange-500/20 dark:bg-orange-600/30 dark:text-orange-400',
  };

  return colorStyles[type] || colorStyles.Task;
};

export const TicketTypeSelector = memo(function TicketTypeSelector({
  value,
  onChange,
}: TicketTypeSelectorProps) {
  return (
    <div>
      <label
        id="ticket-type-label"
        className="block text-sm font-semibold mb-1.5 text-slate-800 dark:text-white"
      >
        Ticket Type
      </label>
      <div
        className="grid grid-cols-5 gap-1.5"
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
              className={`px-2 py-2 rounded-lg border-2 transition-all duration-200 press-effect ${getTypeStyles(
                type.value,
                isSelected,
              )}`}
              role="radio"
              aria-checked={isSelected}
              aria-label={`${type.value} ticket type`}
              type="button"
            >
              <div className="flex flex-col items-center gap-0.5">
                <Icon className="w-4 h-4" aria-hidden="true" />
                <span className="text-[10px] font-medium leading-tight">{type.value}</span>
                {isSelected && (
                  <span className="sr-only">(selected)</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
});
