/**
 * KeyboardShortcutsModal Component
 * Modal showing available keyboard shortcuts
 */

import { memo, useEffect, useRef } from 'react';
import { Keyboard, X } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode?: boolean;
}

const SHORTCUTS = [
  { keys: 'Ctrl + G', description: 'Generate ticket' },
  { keys: 'Ctrl + S', description: 'Save draft' },
  { keys: 'Ctrl + K', description: 'Show shortcuts' }
];

export const KeyboardShortcutsModal = memo(function KeyboardShortcutsModal({
  isOpen,
  onClose,
  isDarkMode = true
}: KeyboardShortcutsModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus trap and close on escape
  useEffect(() => {
    if (!isOpen) return;

    // Focus close button when modal opens
    closeButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
    >
      <div
        className={`${
          isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
        } rounded-xl p-6 max-w-md w-full border shadow-2xl`}
      >
        <div className="flex items-center justify-between mb-4">
          <h3
            id="shortcuts-title"
            className={`text-lg font-semibold flex items-center gap-2 ${
              isDarkMode ? 'text-white' : 'text-slate-800'
            }`}
          >
            <Keyboard className="w-5 h-5" aria-hidden="true" />
            Keyboard Shortcuts
          </h3>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className={`p-1 rounded hover:bg-slate-700/30 transition-all ${
              isDarkMode ? 'text-slate-400' : 'text-slate-600'
            }`}
            aria-label="Close keyboard shortcuts"
            type="button"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
        <div className="space-y-2">
          {SHORTCUTS.map(({ keys, description }) => (
            <div key={keys} className="flex items-center justify-between py-2">
              <kbd
                className={`px-3 py-1 rounded text-sm font-mono ${
                  isDarkMode
                    ? 'bg-slate-700 text-slate-300 border border-slate-600'
                    : 'bg-slate-100 text-slate-700 border border-slate-300'
                }`}
              >
                {keys}
              </kbd>
              <span className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                {description}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
