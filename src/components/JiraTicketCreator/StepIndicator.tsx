import { memo } from 'react';
import type { AppStep } from './types';

const STEPS: { key: AppStep; label: string }[] = [
  { key: 'describe', label: 'Describe' },
  { key: 'review', label: 'Review' },
  { key: 'done', label: 'Done' },
];

const stepOrder: Record<AppStep, number> = { describe: 0, review: 1, done: 2 };

interface StepIndicatorProps {
  currentStep: AppStep;
}

export const StepIndicator = memo(function StepIndicator({ currentStep }: StepIndicatorProps) {
  const currentIndex = stepOrder[currentStep];

  return (
    <div className="flex items-center gap-1" role="navigation" aria-label="Progress steps">
      {STEPS.map((step, i) => {
        const isActive = i === currentIndex;
        const isCompleted = i < currentIndex;

        return (
          <div key={step.key} className="flex items-center gap-1">
            {i > 0 && (
              <div
                className={`w-4 h-px transition-colors duration-300 ${
                  isCompleted ? 'bg-emerald-500' : 'bg-white/30 dark:bg-slate-600'
                }`}
              />
            )}
            <div className="flex items-center gap-1">
              <div
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  isCompleted
                    ? 'bg-emerald-500'
                    : isActive
                      ? 'bg-blue-500 ring-2 ring-blue-500/30'
                      : 'bg-white/30 dark:bg-slate-600'
                }`}
              />
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
            </div>
          </div>
        );
      })}
    </div>
  );
});
