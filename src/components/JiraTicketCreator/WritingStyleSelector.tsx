/**
 * WritingStyleSelector Component
 * Selector for pre-generation writing tone/style with preview popovers.
 *
 * Previews render in a portal on document.body. The panel that hosts this
 * selector has two `overflow-hidden` ancestors (the bordered container and the
 * accordion's animation wrapper), and no z-index can escape overflow clipping —
 * an absolutely-positioned popover was being sliced so only its header showed.
 */

import { memo, useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import {
  PRIMARY_WRITING_STYLES,
  SECONDARY_WRITING_STYLES,
  SELECTION_STYLES,
} from './constants';
import type { WritingStyleConfig } from './constants';
import type { RefinementStyle } from '../../types/ticket';

interface WritingStyleSelectorProps {
  value: RefinementStyle | undefined;
  onChange: (style: RefinementStyle | undefined) => void;
  /** Controlled so the "More styles" reveal survives step navigation. */
  showMore: boolean;
  onShowMoreChange: (showMore: boolean) => void;
}

const POPOVER_WIDTH = 280;
const VIEWPORT_MARGIN = 8;
const ANCHOR_GAP = 6;
/** Stable id so the active chip can reference the popover via aria-describedby. */
const PREVIEW_ID = 'writing-style-preview';

/**
 * A selectable option. `value: undefined` is the "Balanced" default, modelled as
 * a real option so every grid cell has the same [chip][help] structure — giving
 * one of them no help button made the chips render at four different widths.
 */
type StyleOption = Omit<WritingStyleConfig, 'value'> & {
  value: RefinementStyle | undefined;
};

const BALANCED_OPTION: StyleOption = {
  value: undefined,
  label: 'Balanced',
  icon: Check,
  description: 'Let the AI choose the tone based on your description',
  example:
    'The AI matches structure and tone to what\nyou wrote — a bug report reads like a bug\nreport, a feature request like a feature.',
};

/**
 * Preview popover rendered on document.body. Positions itself against the
 * trigger's viewport rect, flipping above the trigger when there isn't room
 * below and clamping horizontally so it never runs off-screen.
 */
const StylePreviewPopover = memo(function StylePreviewPopover({
  anchor,
  style,
  onMouseEnter,
  onMouseLeave,
  popoverRef,
}: {
  anchor: DOMRect;
  style: StyleOption;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  popoverRef: React.RefObject<HTMLDivElement>;
}) {
  // Flipping needs the rendered height, which isn't known until after layout.
  // A layout effect runs before paint, so the correction is written straight to
  // the node — going through state would add a render for no visual benefit.
  useLayoutEffect(() => {
    const el = popoverRef.current;
    if (!el) return;

    const height = el.offsetHeight;
    const spaceBelow = window.innerHeight - anchor.bottom;
    const flipAbove = spaceBelow < height + ANCHOR_GAP + VIEWPORT_MARGIN;

    el.style.top = flipAbove
      ? `${Math.max(VIEWPORT_MARGIN, anchor.top - height - ANCHOR_GAP)}px`
      : `${anchor.bottom + ANCHOR_GAP}px`;
  }, [anchor, popoverRef]);

  return createPortal(
    <div
      ref={popoverRef}
      id={PREVIEW_ID}
      role="tooltip"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: 'fixed',
        width: POPOVER_WIDTH,
        // Provisional placement below the trigger; the layout effect above flips
        // it upward before paint when there isn't room.
        top: anchor.bottom + ANCHOR_GAP,
        left: Math.min(
          Math.max(VIEWPORT_MARGIN, anchor.left),
          window.innerWidth - POPOVER_WIDTH - VIEWPORT_MARGIN,
        ),
      }}
      className="z-[100] p-3 rounded-xl border shadow-xl backdrop-blur-xl bg-white/95 border-white/40 dark:bg-slate-800/95 dark:border-slate-700/60 dropdown-enter"
    >
      <p className="font-semibold text-slate-800 dark:text-slate-100 mb-1.5 text-xs">
        {style.label} example
      </p>
      <pre className="text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap font-mono text-[11px]">
        {style.example}
      </pre>
    </div>,
    document.body,
  );
});

export const WritingStyleSelector = memo(function WritingStyleSelector({
  value,
  onChange,
  showMore,
  onShowMoreChange,
}: WritingStyleSelectorProps) {
  const [preview, setPreview] = useState<{
    style: StyleOption;
    anchor: DOMRect;
  } | null>(null);
  const previewTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const closePreview = useCallback(() => setPreview(null), []);

  // Close on click outside or Escape. The popover is portalled, so it isn't
  // inside containerRef — both elements have to be checked.
  useEffect(() => {
    if (!preview) return;

    function handlePointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (
        !containerRef.current?.contains(target) &&
        !popoverRef.current?.contains(target)
      ) {
        setPreview(null);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setPreview(null);
    }

    // A portalled, fixed-position popover doesn't follow its anchor, so dismiss
    // it rather than let it drift.
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', closePreview, true);
    window.addEventListener('resize', closePreview);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', closePreview, true);
      window.removeEventListener('resize', closePreview);
    };
  }, [preview, closePreview]);

  useEffect(() => {
    return () => {
      if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
    };
  }, []);

  const openPreview = useCallback(
    (style: StyleOption, trigger: HTMLElement) => {
      if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
      setPreview({ style, anchor: trigger.getBoundingClientRect() });
    },
    [],
  );

  const scheduleClose = useCallback(() => {
    previewTimeoutRef.current = setTimeout(() => setPreview(null), 200);
  }, []);

  const cancelClose = useCallback(() => {
    if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
  }, []);

  /**
   * The chip is its own preview trigger — hovering or focusing it shows the
   * example. Seven separate help buttons competed visually with the chips they
   * were annotating, and the chip is a far larger pointer target.
   */
  const renderStyleButton = (style: StyleOption) => {
    const Icon = style.icon;
    const isSelected = value === style.value;
    const isPreviewOpen = preview?.style.value === style.value;

    return (
      <button
        key={style.value ?? 'balanced'}
        onClick={() => onChange(isSelected ? undefined : style.value)}
        onMouseEnter={(e) => openPreview(style, e.currentTarget)}
        onMouseLeave={scheduleClose}
        onFocus={(e) => openPreview(style, e.currentTarget)}
        onBlur={scheduleClose}
        className={`px-2 py-1.5 rounded-lg border-2 transition-all duration-200 press-effect flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-slate-800 ${
          isSelected ? SELECTION_STYLES.selected : SELECTION_STYLES.unselected
        }`}
        role="radio"
        aria-checked={isSelected}
        // Points at the live popover so the example is announced on focus. No
        // `title` — a native tooltip would race the popover.
        aria-describedby={isPreviewOpen ? PREVIEW_ID : undefined}
        type="button"
      >
        <Icon className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
        <span className="text-xs font-medium">{style.label}</span>
      </button>
    );
  };

  return (
    <div ref={containerRef}>
      <label
        id="writing-style-label"
        className="block text-sm font-semibold mb-1.5 text-slate-800 dark:text-white"
      >
        Writing Style
      </label>
      <div
        className="grid grid-cols-1 sm:grid-cols-3 gap-1.5"
        role="radiogroup"
        aria-labelledby="writing-style-label"
      >
        {/* Balanced first — it represents "no explicit style", so the group
            always shows a selection rather than looking silently skipped. */}
        {[BALANCED_OPTION, ...PRIMARY_WRITING_STYLES].map(renderStyleButton)}
      </div>

      {showMore && (
        <div
          className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 mt-1.5"
          role="radiogroup"
          aria-label="More writing styles"
        >
          {SECONDARY_WRITING_STYLES.map(renderStyleButton)}
        </div>
      )}

      <button
        onClick={() => onShowMoreChange(!showMore)}
        className="mt-1.5 text-xs text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white flex items-center gap-1 transition-colors rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-expanded={showMore}
        type="button"
      >
        <ChevronDown
          className={`w-3 h-3 transition-transform duration-200 ${showMore ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
        {showMore ? 'Fewer styles' : 'More styles'}
      </button>

      {preview && (
        <StylePreviewPopover
          anchor={preview.anchor}
          style={preview.style}
          popoverRef={popoverRef}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        />
      )}
    </div>
  );
});
