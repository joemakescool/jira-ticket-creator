/**
 * ProviderSelector Component
 * Custom dropdown for selecting LLM provider
 */

import { memo, useState, useRef, useEffect, useCallback, type ComponentType } from 'react';
import { ChevronDown, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { ClaudeLogo, OpenAILogo, OllamaLogo } from './ProviderIcons';

interface ProviderSelectorProps {
  value: string;
  onChange: (provider: string) => void;
  availableProviders: string[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

const STANDARD_PROVIDERS = ['claude', 'openai', 'ollama'];

const PROVIDER_LABELS: Record<string, string> = {
  claude: 'Claude',
  openai: 'OpenAI',
  ollama: 'Ollama (Local)'
};

const PROVIDER_LOGOS: Record<string, ComponentType<{ className?: string }>> = {
  claude: ClaudeLogo,
  openai: OpenAILogo,
  ollama: OllamaLogo,
};

function ProviderIcon({ provider, size = 'sm' }: { provider: string; size?: 'sm' | 'md' }) {
  const Logo = PROVIDER_LOGOS[provider];
  const dim = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  if (Logo) {
    return <Logo className={`${dim} flex-shrink-0`} />;
  }
  // Fallback for unknown providers
  const letter = (PROVIDER_LABELS[provider] || provider).charAt(0).toUpperCase();
  return (
    <span className={`${dim} bg-slate-500 text-white rounded-full inline-flex items-center justify-center font-bold flex-shrink-0 text-[9px]`}>
      {letter}
    </span>
  );
}

const ANIMATION_MS = 120;

export const ProviderSelector = memo(function ProviderSelector({
  value,
  onChange,
  availableProviders,
  isLoading,
  error,
  onRetry,
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
        <div className="relative">
          <ProviderIcon provider={value || 'claude'} />
          {isLoading && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          )}
        </div>
        <span>{PROVIDER_LABELS[value] || value || 'Select...'}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen && !isClosing ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {/* Inline error message */}
      {error && (
        <div className="absolute top-full right-0 mt-1.5 p-2.5 rounded-xl text-xs border shadow-lg backdrop-blur-xl bg-red-50/90 border-red-200 dark:bg-red-900/30 dark:border-red-800/50 whitespace-nowrap flex items-center gap-2 z-50 dropdown-enter" role="alert">
          <AlertCircle className="w-3.5 h-3.5 text-red-500 dark:text-red-400 flex-shrink-0" aria-hidden="true" />
          <span className="text-red-700 dark:text-red-300">{error}</span>
          {onRetry && (
            <button
              onClick={(e) => { e.stopPropagation(); onRetry(); }}
              className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-semibold ml-1"
              type="button"
            >
              <RefreshCw className="w-3 h-3" aria-hidden="true" />
              Retry
            </button>
          )}
        </div>
      )}

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
                <ProviderIcon provider={provider} />
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
