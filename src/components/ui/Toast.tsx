/**
 * Toast Component
 * Displays temporary notification messages
 *
 * Pinned bottom-centre rather than top-right: at the top it sat over the
 * provider selector and theme button. It used to bounce indefinitely and never
 * dismiss itself; it now slides in once and closes after `duration`.
 */

import { memo, useEffect } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastProps {
  message: string;
  type?: ToastType;
  onClose: () => void;
  /** Auto-dismiss delay in ms. Errors stay longer so they can be read. */
  duration?: number;
}

const STYLES: Record<ToastType, string> = {
  success: 'bg-emerald-600 dark:bg-emerald-500',
  error: 'bg-red-600 dark:bg-red-500',
  info: 'bg-blue-600 dark:bg-blue-500',
};

const ICONS = {
  success: CheckCircle,
  error: AlertCircle,
  info: AlertCircle,
};

export const Toast = memo(function Toast({
  message,
  type = 'success',
  onClose,
  duration = type === 'error' ? 6000 : 3000,
}: ToastProps) {
  // Restarts when the message changes, so a second copy shows for the full duration.
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  const Icon = ICONS[type];

  // Centred by a full-width wrapper, not `-translate-x-1/2`: the entry
  // animation sets `transform` and would override the translate.
  return (
    <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4 pointer-events-none">
      <div
        className={`pointer-events-auto text-white pl-4 pr-2 py-2.5 rounded-xl shadow-2xl flex items-center gap-2.5 text-sm hint-enter ${STYLES[type]}`}
        // Errors interrupt; confirmations wait their turn.
        role={type === 'error' ? 'alert' : 'status'}
        aria-live={type === 'error' ? 'assertive' : 'polite'}
      >
        <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
        <span className="font-medium">{message}</span>
        <button
          onClick={onClose}
          className="p-1 rounded-full hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white/60"
          aria-label="Close notification"
          type="button"
        >
          <X className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
});
