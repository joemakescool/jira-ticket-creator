/**
 * TemplateSelector Component
 * Selector for ticket output template style
 */

import { memo } from 'react';
import { TEMPLATES, SELECTION_STYLES } from './constants';
import type { TicketFormData } from './types';

/** Stated rather than implied — "Basic" vs "Detailed" isn't self-explanatory. */
const TEMPLATE_DESCRIPTIONS: Record<string, string> = {
  Basic: 'Context, outcome, acceptance criteria',
  Detailed: 'Adds problem, solution, scope, risks',
};

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
              className={`flex-1 px-3 py-2 rounded-lg border-2 text-left transition-all duration-200 press-effect focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-slate-800 ${
                isSelected ? SELECTION_STYLES.selected : SELECTION_STYLES.unselected
              }`}
              role="radio"
              aria-checked={isSelected}
              type="button"
            >
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                <span className="text-sm font-medium">{template.name}</span>
              </div>
              {TEMPLATE_DESCRIPTIONS[template.name] && (
                <span className="block mt-0.5 text-xs leading-snug opacity-80">
                  {TEMPLATE_DESCRIPTIONS[template.name]}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
});
