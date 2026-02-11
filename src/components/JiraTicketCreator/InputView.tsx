/**
 * InputView Component
 * Step 1 of the two-step flow: describe the problem
 */

import { memo } from 'react';
import { Wand2 } from 'lucide-react';
import { DescriptionEditor } from './DescriptionEditor';
import { TicketTypeSelector } from './TicketTypeSelector';
import { PrioritySelector } from './PrioritySelector';
import { AdvancedOptions } from './AdvancedOptions';
import type { TicketFormData } from './types';
import type { RefinementStyle } from '../../types/ticket';

interface InputViewProps {
  ticketData: TicketFormData;
  isGenerating: boolean;
  selectedProvider: string;
  wordCount: number;
  draftSaved: boolean;
  onDescriptionChange: (value: string) => void;
  onTypeChange: (type: string) => void;
  onPriorityChange: (priority: string) => void;
  onTemplateChange: (template: string) => void;
  onWritingStyleChange: (style: RefinementStyle | undefined) => void;
  onGenerate: () => void;
  onClearDraft: () => void;
}

export const InputView = memo(function InputView({
  ticketData,
  isGenerating,
  selectedProvider,
  wordCount,
  draftSaved,
  onDescriptionChange,
  onTypeChange,
  onPriorityChange,
  onTemplateChange,
  onWritingStyleChange,
  onGenerate,
  onClearDraft,
}: InputViewProps) {
  return (
    <section
      className="bg-white/20 backdrop-blur-xl border-white/30 dark:bg-slate-800/20 dark:border-slate-700/50 rounded-2xl shadow-2xl border p-5 space-y-4"
      aria-labelledby="create-ticket-heading"
    >
      <h2
        id="create-ticket-heading"
        className="text-lg font-bold text-slate-800 dark:text-white"
      >
        Describe Your Ticket
      </h2>

      <DescriptionEditor
        value={ticketData.description}
        onChange={onDescriptionChange}
        charCount={ticketData.description.length}
        wordCount={wordCount}
        draftSaved={draftSaved}
        onClearDraft={onClearDraft}
      />

      {/* Compact Type + Priority pills */}
      <div className="flex flex-wrap items-start gap-4">
        <TicketTypeSelector
          value={ticketData.type}
          onChange={onTypeChange}
        />
        <PrioritySelector
          value={ticketData.priority}
          onChange={onPriorityChange}
        />
      </div>

      {/* Advanced Options accordion */}
      <AdvancedOptions
        template={ticketData.template}
        writingStyle={ticketData.writingStyle}
        onTemplateChange={onTemplateChange}
        onWritingStyleChange={onWritingStyleChange}
      />

      {/* Generate button */}
      <div className="pt-2">
        <button
          onClick={onGenerate}
          disabled={isGenerating || !ticketData.description || !selectedProvider}
          className="w-full bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 hover:from-blue-600 hover:via-blue-700 hover:to-indigo-700 text-white py-3.5 px-5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 font-semibold text-base shadow-lg shadow-blue-500/25 dark:shadow-blue-500/15 transition-all hover:shadow-xl hover:shadow-blue-500/30 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
          aria-busy={isGenerating}
        >
          {isGenerating ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" aria-hidden="true" />
              <span>Generating...</span>
            </>
          ) : !selectedProvider ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" aria-hidden="true" />
              <span>Loading Provider...</span>
            </>
          ) : (
            <>
              <Wand2 className="w-5 h-5" aria-hidden="true" />
              Generate Ticket
              <kbd className="ml-1 px-1.5 py-0.5 text-xs rounded bg-white/20 font-mono">Ctrl+Enter</kbd>
            </>
          )}
        </button>
      </div>
    </section>
  );
});
