/**
 * TemplateSelector Component
 * Selector for ticket output template style
 */

import { memo } from 'react';
import { TEMPLATES } from './constants';
import type { TicketFormData } from './types';

interface TemplateSelectorProps {
  value: TicketFormData['template'];
  onChange: (template: TicketFormData['template']) => void;
}

export const TemplateSelector = memo(function TemplateSelector({
  value,
  onChange,
}: TemplateSelectorProps) {
  return (
    <div>
      <label
        id="template-label"
        className="block text-sm font-semibold mb-1.5 text-slate-800 dark:text-white"
      >
        Template Style
      </label>
      <div
        className="flex gap-2"
        role="radiogroup"
        aria-labelledby="template-label"
      >
        {TEMPLATES.map((template) => {
          const Icon = template.icon;
          const isSelected = value === template.name;

          return (
            <button
              key={template.name}
              onClick={() => onChange(template.name)}
              className={`flex-1 px-3 py-2 rounded-lg border-2 transition-all duration-200 press-effect ${
                isSelected
                  ? 'bg-purple-100 border-purple-500 text-purple-700 shadow-lg shadow-purple-500/20 dark:bg-purple-600/30 dark:text-white'
                  : 'bg-white/20 border-white/30 text-slate-600 hover:border-white/50 dark:bg-slate-800/20 dark:border-slate-700/50 dark:text-slate-300 dark:hover:border-slate-600'
              }`}
              role="radio"
              aria-checked={isSelected}
              type="button"
            >
              <div className="flex items-center gap-2 justify-center">
                <Icon className="w-4 h-4" aria-hidden="true" />
                <span className="text-sm font-medium">{template.name}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
});
