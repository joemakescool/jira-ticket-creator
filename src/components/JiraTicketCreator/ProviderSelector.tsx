/**
 * ProviderSelector Component
 * Custom dropdown for selecting LLM provider
 */

import { memo, useState, useRef, useEffect, useCallback } from 'react';
import { Server, ChevronDown, Check } from 'lucide-react';

interface ProviderSelectorProps {
  value: string;
  onChange: (provider: string) => void;
  availableProviders: string[];
}

const STANDARD_PROVIDERS = ['claude', 'openai', 'ollama'];

const PROVIDER_LABELS: Record<string, string> = {
  claude: 'Claude',
  openai: 'OpenAI',
  ollama: 'Ollama (Local)'
};

const ANIMATION_MS = 120;

export const ProviderSelector = memo(function ProviderSelector({
  value,
  onChange,
  availableProviders,
}: ProviderSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const closingTimer = useRef<ReturnType<typeof setTimeout>>();

  const customProviders = availableProviders.filter(p => !STANDARD_PROVIDERS.includes(p));
  const allProviders = [...STANDARD_PROVIDERS, ...customProviders];

  const close = useCallback(() => {
    if (!isOpen || isClosing) return;
    setIsClosing(true);
    closingTimer.current = setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, ANIMATION_MS);
  }, [isOpen, isClosing]);

  const handleSelect = useCallback((provider: string) => {
    onChange(provider);
    close();
  }, [onChange, close]);

  const toggle = useCallback(() => {
    if (isOpen) {
      close();
    } else {
      setIsOpen(true);
    }
  }, [isOpen, close]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (closingTimer.current) clearTimeout(closingTimer.current);
    };
  }, []);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        close();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, close]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, close]);

  const showMenu = isOpen;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggle}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition-all duration-200 bg-white/20 border-white/30 text-slate-700 hover:bg-white/30 hover:border-white/50 dark:bg-slate-800/30 dark:border-slate-700/50 dark:text-slate-200 dark:hover:bg-slate-700/30 dark:hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        aria-expanded={isOpen && !isClosing}
        aria-haspopup="listbox"
        aria-label="Select AI Provider"
        type="button"
      >
        <Server className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" aria-hidden="true" />
        <span>{PROVIDER_LABELS[value] || value}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen && !isClosing ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {showMenu && (
        <div
          className={`absolute top-full right-0 mt-1.5 min-w-[180px] py-1 rounded-xl border-2 shadow-xl backdrop-blur-xl bg-white/90 border-white/40 dark:bg-slate-800/95 dark:border-slate-700/60 z-50 ${
            isClosing ? 'dropdown-exit' : 'dropdown-enter'
          }`}
          role="listbox"
          aria-label="AI Providers"
        >
          {allProviders.map((provider) => {
            const isSelected = value === provider;
            return (
              <button
                key={provider}
                onClick={() => handleSelect(provider)}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors duration-150 ${
                  isSelected
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300'
                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700/50'
                } first:rounded-t-lg last:rounded-b-lg`}
                role="option"
                aria-selected={isSelected}
                type="button"
              >
                <span className="flex-1 font-medium">{PROVIDER_LABELS[provider] || provider}</span>
                {isSelected && <Check className="w-3.5 h-3.5" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
});
