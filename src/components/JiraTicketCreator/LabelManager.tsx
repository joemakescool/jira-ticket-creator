/**
 * LabelManager Component
 * Handles label input, display, and common label suggestions
 */

import { memo, useState, useCallback, KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { COMMON_LABELS } from './constants';

interface LabelManagerProps {
  labels: string[];
  onAdd: (label: string) => void;
  onRemove: (label: string) => void;
  isDarkMode?: boolean;
}

export const LabelManager = memo(function LabelManager({
  labels,
  onAdd,
  onRemove,
  isDarkMode = true
}: LabelManagerProps) {
  const [inputValue, setInputValue] = useState('');

  const handleAdd = useCallback(() => {
    const trimmed = inputValue.trim().toLowerCase();
    if (trimmed && !labels.includes(trimmed)) {
      onAdd(trimmed);
      setInputValue('');
    }
  }, [inputValue, labels, onAdd]);

  const handleKeyPress = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAdd();
    }
  }, [handleAdd]);

  const availableSuggestions = COMMON_LABELS
    .filter(label => !labels.includes(label))
    .slice(0, 8);

  return (
    <div>
      <label
        htmlFor="label-input"
        className={`block text-sm font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}
      >
        Labels
      </label>

      {/* Current Labels */}
      {labels.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3" role="list" aria-label="Selected labels">
          {labels.map((label) => (
            <span
              key={label}
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                isDarkMode
                  ? 'bg-slate-800/30 border-slate-700/50 text-white'
                  : 'bg-white/30 border-white/30 text-slate-800'
              } border`}
              role="listitem"
            >
              {label}
              <button
                onClick={() => onRemove(label)}
                className="ml-2 hover:bg-white/20 rounded-full w-4 h-4 flex items-center justify-center"
                aria-label={`Remove ${label} label`}
                type="button"
              >
                <X className="w-3 h-3" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-3">
        <input
          id="label-input"
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Add label (press Enter)"
          className={`flex-1 px-4 py-2 text-sm border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            isDarkMode
              ? 'bg-slate-800/20 backdrop-blur-xl border-slate-700/50 text-white placeholder-slate-400'
              : 'bg-white/20 backdrop-blur-xl border-white/30 text-slate-800 placeholder-slate-500'
          }`}
        />
        <button
          onClick={handleAdd}
          disabled={!inputValue.trim()}
          className={`px-4 py-2 text-sm rounded-lg font-medium transition-all border ${
            isDarkMode
              ? 'bg-slate-800/20 border-slate-700/50 text-white hover:bg-slate-700/30'
              : 'bg-white/20 border-white/30 text-slate-800 hover:bg-white/30'
          } disabled:opacity-50`}
          type="button"
        >
          Add
        </button>
      </div>

      {/* Suggestions */}
      {availableSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3" role="group" aria-label="Suggested labels">
          {availableSuggestions.map((label) => (
            <button
              key={label}
              onClick={() => onAdd(label)}
              className={`px-3 py-1 text-xs rounded-lg border transition-all ${
                isDarkMode
                  ? 'bg-slate-800/20 border-slate-700/50 text-slate-400 hover:text-white'
                  : 'bg-white/20 border-white/30 text-slate-600 hover:text-slate-800'
              }`}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
