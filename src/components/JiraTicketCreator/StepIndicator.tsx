import { memo } from 'react';
import { Check } from 'lucide-react';
import type { AppStep } from './types';

const STEPS: { key: AppStep; label: string }[] = [
  { key: 'describe', label: 'Describe' },
  { key: 'review', label: 'Review' },
  { key: 'done', label: 'Done' },
];

const stepOrder: Record<AppStep, number> = { describe: 0, review: 1, done: 2 };

interface StepIndicatorProps {
  currentStep: AppStep;
  onStepClick?: (step: AppStep) => void;
}

export const StepIndicator = memo(function StepIndicator({ currentStep, onStepClick }: StepIndicatorProps) {
  const currentIndex = stepOrder[currentStep];

  return (
    <div className="flex items-center gap-1" role="navigation" aria-label="Progress steps">
      {STEPS.map((step, i) => {
        const isActive = i === currentIndex;
        const isCompleted = i < currentIndex;
        const isFuture = i > currentIndex;

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
              onClick={() => isCompleted && onStepClick?.(step.key)}
              disabled={!isCompleted}
              className={`flex items-center gap-1 transition-all duration-200 ${
                isCompleted
                  ? 'cursor-pointer hover:opacity-80'
                  : isFuture
                    ? 'cursor-not-allowed'
                    : ''
              }`}
              aria-label={`${step.label}${isCompleted ? ' (completed, click to go back)' : isActive ? ' (current step)' : ' (upcoming)'}`}
              aria-current={isActive ? 'step' : undefined}
              aria-disabled={isFuture}
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
                className={`text-xs font-medium transition-colors duration-300 ${
                  isCompleted
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : isActive
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-slate-400 dark:text-slate-500'
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
