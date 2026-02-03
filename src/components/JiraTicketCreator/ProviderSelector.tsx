/**
 * ProviderSelector Component
 * Dropdown for selecting LLM provider
 */

import { memo } from 'react';
import { Server } from 'lucide-react';

interface ProviderSelectorProps {
  value: string;
  onChange: (provider: string) => void;
  availableProviders: string[];
  isDarkMode?: boolean;
}

const STANDARD_PROVIDERS = ['claude', 'openai', 'ollama'];

const PROVIDER_LABELS: Record<string, string> = {
  claude: 'Claude',
  openai: 'OpenAI',
  ollama: 'Ollama (Local)'
};

export const ProviderSelector = memo(function ProviderSelector({
  value,
  onChange,
  availableProviders,
  isDarkMode = true
}: ProviderSelectorProps) {
  const customProviders = availableProviders.filter(p => !STANDARD_PROVIDERS.includes(p));

  return (
    <div className="flex items-center gap-2">
      <Server
        className={`w-4 h-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}
        aria-hidden="true"
      />
      <label htmlFor="provider-select" className="sr-only">
        Select AI Provider
      </label>
      <select
        id="provider-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`px-3 py-1.5 rounded-lg text-sm font-medium border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          isDarkMode
            ? 'bg-slate-800/40 border-slate-700/50 text-white'
            : 'bg-white/40 border-white/30 text-slate-800'
        }`}
      >
        {STANDARD_PROVIDERS.map(p => (
          <option key={p} value={p}>
            {PROVIDER_LABELS[p] || p}
          </option>
        ))}
        {customProviders.map(p => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
    </div>
  );
});
