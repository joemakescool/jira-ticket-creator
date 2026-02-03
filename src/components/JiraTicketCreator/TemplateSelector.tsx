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
  isDarkMode?: boolean;
}

export const TemplateSelector = memo(function TemplateSelector({
  value,
  onChange,
  isDarkMode = true
}: TemplateSelectorProps) {
  return (
    <div>
      <label
        id="template-label"
        className={`block text-sm font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}
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
              className={`flex-1 px-4 py-3 rounded-xl border-2 transition-all duration-200 ${
                isSelected
                  ? isDarkMode
                    ? 'bg-purple-600/30 border-purple-500 text-white shadow-lg shadow-purple-500/20'
                    : 'bg-purple-100 border-purple-500 text-purple-700 shadow-lg shadow-purple-500/20'
                  : isDarkMode
                    ? 'bg-slate-800/20 border-slate-700/50 text-slate-300 hover:border-slate-600'
                    : 'bg-white/20 border-white/30 text-slate-600 hover:border-white/50'
              }`}
              role="radio"
              aria-checked={isSelected}
              type="button"
            >
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5" aria-hidden="true" />
                <div className="text-left">
                  <div className="font-semibold text-sm">{template.name}</div>
                  <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {template.description}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
});
