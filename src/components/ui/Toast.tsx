/**
 * Toast Component
 * Displays temporary notification messages
 */

import { memo } from 'react';
import { CheckSquare, AlertCircle, X } from 'lucide-react';

export interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose?: () => void;
}

export const Toast = memo(function Toast({ message, type = 'success', onClose }: ToastProps) {
  const styles = {
    success: 'bg-gradient-to-r from-emerald-500 to-green-600',
    error: 'bg-gradient-to-r from-red-500 to-red-600',
    info: 'bg-gradient-to-r from-blue-500 to-blue-600'
  };

  const icons = {
    success: CheckSquare,
    error: AlertCircle,
    info: AlertCircle
  };

  const Icon = icons[type];

  return (
    <div
      className={`fixed top-6 right-6 backdrop-blur-xl text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce z-50 border border-white/20 ${styles[type]}`}
      role="alert"
      aria-live="polite"
    >
      <Icon className="w-6 h-6" aria-hidden="true" />
      <span className="font-medium">{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="ml-2 p-1 hover:bg-white/20 rounded-full transition-colors"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
});
