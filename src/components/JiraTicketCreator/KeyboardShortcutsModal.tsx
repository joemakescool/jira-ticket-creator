/**
 * KeyboardShortcutsModal Component
 * Modal showing available keyboard shortcuts
 */

import { memo, useEffect, useRef } from 'react';
import { Keyboard, X } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { keys: 'Ctrl + Enter', description: 'Generate ticket' },
  { keys: 'Ctrl + G', description: 'Generate ticket (alt)' },
  { keys: 'Ctrl + S', description: 'Save draft' },
  { keys: 'Ctrl + K', description: 'Show shortcuts' }
];

export const KeyboardShortcutsModal = memo(function KeyboardShortcutsModal({
  isOpen,
  onClose,
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
      <div className="bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700 rounded-xl p-6 max-w-md w-full border shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3
            id="shortcuts-title"
            className="text-lg font-semibold flex items-center gap-2 text-slate-800 dark:text-white"
          >
            <Keyboard className="w-5 h-5" aria-hidden="true" />
            Keyboard Shortcuts
          </h3>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-700/30 transition-all text-slate-600 dark:text-slate-400"
            aria-label="Close keyboard shortcuts"
            type="button"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
        <div className="space-y-2">
          {SHORTCUTS.map(({ keys, description }) => (
            <div key={keys} className="flex items-center justify-between py-2">
              <kbd className="px-3 py-1 rounded text-sm font-mono bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600">
                {keys}
              </kbd>
              <span className="text-sm text-slate-600 dark:text-slate-300">
                {description}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
