/**
 * ModeToggle Component
 * Folder-style tabs that sit on the top edge of the content card, switching
 * between writing a new ticket and commenting on an existing one.
 *
 * Tabs rather than a segmented control in the header: the header holds
 * app-wide settings (provider, theme), while mode changes only the card below,
 * so the control lives on that card.
 *
 * The active tab is marked by an accent underline sitting on the card's top
 * edge. A "joined folder tab" (matching background, no bottom border) doesn't
 * work here: both surfaces are ~20% opaque glass, so the card's top border
 * always shows through the tab as a seam.
 */

import { memo, useRef, type KeyboardEvent } from 'react';
import { FileText, MessageSquare } from 'lucide-react';
import type { AppMode } from './types';

const MODES: { mode: AppMode; label: string; Icon: typeof FileText }[] = [
  { mode: 'ticket', label: 'Ticket', Icon: FileText },
  { mode: 'comment', label: 'Comment', Icon: MessageSquare },
];

/** Panel id the tabs point at via aria-controls. */
export const MODE_PANEL_ID = 'mode-panel';

interface ModeToggleProps {
  value: AppMode;
  onChange: (mode: AppMode) => void;
}

export const ModeToggle = memo(function ModeToggle({ value, onChange }: ModeToggleProps) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // WAI-ARIA tabs pattern: arrow keys move between tabs, and only the active
  // tab is in the Tab order.
  const handleKeyDown = (e: KeyboardEvent, index: number) => {
    const delta = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (index + delta + MODES.length) % MODES.length;
    onChange(MODES[next].mode);
    tabRefs.current[next]?.focus();
  };

  return (
    <div className="flex items-end gap-1" role="tablist" aria-label="What do you want to write?">
      {MODES.map(({ mode, label, Icon }, i) => {
        const isActive = value === mode;
        return (
          <button
            key={mode}
            ref={el => { tabRefs.current[i] = el; }}
            onClick={() => onChange(mode)}
            onKeyDown={e => handleKeyDown(e, i)}
            role="tab"
            id={`mode-tab-${mode}`}
            aria-selected={isActive}
            aria-controls={MODE_PANEL_ID}
            tabIndex={isActive ? 0 : -1}
            className={`relative px-4 py-2 rounded-t-lg flex items-center gap-1.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 ${
              isActive
                ? 'text-blue-700 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/20 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800/30'
            }`}
            type="button"
          >
            <Icon className="w-4 h-4" aria-hidden="true" />
            {label}
            {/* Underline overlaps the card's top border by 1px so it reads as
                sitting on the card rather than floating above it. */}
            <span
              className={`absolute inset-x-2 -bottom-px h-0.5 rounded-full transition-colors ${
                isActive ? 'bg-blue-600 dark:bg-blue-400' : 'bg-transparent'
              }`}
              aria-hidden="true"
            />
          </button>
        );
      })}
    </div>
  );
});
