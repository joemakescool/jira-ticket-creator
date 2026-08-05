import { memo } from 'react';
import { Check } from 'lucide-react';
import type { AppStep } from './types';

const STEPS: { key: AppStep; label: string }[] = [
  { key: 'describe', label: 'Describe' },
  { key: 'review', label: 'Review' },
];

const stepOrder: Record<AppStep, number> = { describe: 0, review: 1, done: 2 };

interface StepIndicatorProps {
  currentStep: AppStep;
  onStepClick?: (step: AppStep) => void;
  /**
   * Whether a step ahead of the current one can be jumped to. Used so a user who
   * navigates back to Describe can return to an existing generated ticket
   * instead of having to regenerate it.
   */
  canNavigateForwardTo?: (step: AppStep) => boolean;
}

export const StepIndicator = memo(function StepIndicator({
  currentStep,
  onStepClick,
  canNavigateForwardTo,
}: StepIndicatorProps) {
  const currentIndex = stepOrder[currentStep];

  return (
    <div className="flex items-center gap-1" role="navigation" aria-label="Progress steps">
      {STEPS.map((step, i) => {
        const isActive = i === currentIndex;
        const isCompleted = i < currentIndex;
        const isFuture = i > currentIndex;
        const isForwardAvailable = isFuture && !!canNavigateForwardTo?.(step.key);
        const isClickable = isCompleted || isForwardAvailable;

        const stateSuffix = isCompleted
          ? ' (completed, click to go back)'
          : isActive
            ? ' (current step)'
            : isForwardAvailable
              ? ' (click to return to your generated ticket)'
              : ' (not available yet)';

        return (
          <div key={step.key} className="flex items-center gap-1">
            {i > 0 && (
              <div
                className={`w-4 h-px transition-colors duration-300 ${
                  isCompleted ? 'bg-emerald-500' : 'bg-white/30 dark:bg-slate-600'
                }`}
              />
            )}
            <button
              onClick={() => isClickable && onStepClick?.(step.key)}
              disabled={!isClickable}
              className={`flex items-center gap-1 px-2 py-1.5 -mx-1 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isClickable
                  ? 'cursor-pointer hover:bg-white/20 dark:hover:bg-slate-700/30'
                  : 'cursor-not-allowed opacity-60'
              }`}
              aria-label={`${step.label}${stateSuffix}`}
              aria-current={isActive ? 'step' : undefined}
              aria-disabled={!isClickable}
              title={isForwardAvailable ? 'Return to your generated ticket' : undefined}
              type="button"
            >
              {isCompleted ? (
                <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center transition-all duration-300">
                  <Check className="w-2.5 h-2.5 text-white" aria-hidden="true" />
                </div>
              ) : (
                <div
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    isActive
                      ? 'bg-blue-500 ring-2 ring-blue-500/30'
                      : 'bg-white/30 dark:bg-slate-600'
                  }`}
                />
              )}
              <span
                className={`text-sm font-medium transition-colors duration-300 ${
                  isCompleted
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : isActive
                      ? 'text-blue-700 dark:text-blue-400'
                      : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {step.label}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
});
