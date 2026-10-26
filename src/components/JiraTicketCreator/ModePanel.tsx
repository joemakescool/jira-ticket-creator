/**
 * ModePanel Component
 * The tab strip plus one mode's tabpanel.
 *
 * Each workspace is always mounted, so its state and any in-flight request
 * survive a tab switch, but it renders its views only while active. The views
 * register global shortcuts (Ctrl+Enter generates in both modes), so mounting
 * an inactive one would fire both handlers on a single keypress.
 */

import type { ReactNode } from 'react';
import { MODE_PANEL_ID } from './ModeToggle';
import type { AppMode } from './types';

interface ModePanelProps {
  mode: AppMode;
  isActive: boolean;
  /** The shared tab strip, built by the parent with this mode's trailing content. */
  tabs: ReactNode;
  /** Remount key for the enter animation (e.g. the ticket step). */
  animationKey?: string;
  children: ReactNode;
}

export function ModePanel({ mode, isActive, tabs, animationKey, children }: ModePanelProps) {
  if (!isActive) return null;

  return (
    <div>
      {tabs}
      <div
        key={animationKey}
        className="step-enter"
        id={MODE_PANEL_ID}
        role="tabpanel"
        aria-labelledby={`mode-tab-${mode}`}
      >
        {children}
      </div>
    </div>
  );
}
