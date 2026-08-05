/**
 * MarkdownContent
 *
 * Renders ticket markdown as real formatted output — headings, bold, task-list
 * checkboxes, tables, code. The generation prompts specifically ask for GFM
 * task lists (`- [ ]`) and tables, so remark-gfm is required, not optional.
 *
 * Raw HTML is intentionally not enabled. Ticket bodies are model output and are
 * echoed straight back to the user, so allowing HTML through would turn a
 * prompt-injected `<img onerror>` into script execution.
 */

import { memo } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export const MarkdownContent = memo(function MarkdownContent({
  content,
  className = '',
}: MarkdownContentProps) {
  return (
    <div className={`text-sm text-slate-800 dark:text-slate-100 ${className}`}>
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-lg font-bold mt-4 mb-2 first:mt-0 text-slate-900 dark:text-white">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base font-bold mt-4 mb-2 first:mt-0 text-slate-900 dark:text-white">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-bold uppercase tracking-wide mt-4 mb-1.5 first:mt-0 text-slate-700 dark:text-slate-200">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-sm font-semibold mt-3 mb-1 first:mt-0 text-slate-700 dark:text-slate-200">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="mb-3 leading-relaxed last:mb-0">{children}</p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-slate-900 dark:text-white">
              {children}
            </strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          ul: ({ children }) => (
            <ul className="mb-3 space-y-1 last:mb-0">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-3 space-y-1 list-decimal list-outside ml-5 last:mb-0">
              {children}
            </ol>
          ),
          li: ({ children, ...props }) => {
            // remark-gfm marks task-list items so they can drop the bullet and
            // align with the rendered checkbox instead.
            const isTaskItem = 'className' in props &&
              typeof props.className === 'string' &&
              props.className.includes('task-list-item');

            return (
              <li
                className={
                  isTaskItem
                    ? 'flex items-start gap-2 leading-relaxed list-none'
                    : 'leading-relaxed ml-5 list-disc list-outside'
                }
              >
                {children}
              </li>
            );
          },
          input: ({ checked, type }) =>
            type === 'checkbox' ? (
              <input
                type="checkbox"
                checked={!!checked}
                readOnly
                aria-hidden="true"
                className="mt-1 h-3.5 w-3.5 flex-shrink-0 rounded border-slate-400 text-blue-600 dark:border-slate-500"
              />
            ) : null,
          code: ({ children, className: codeClass }) => {
            // Fenced blocks arrive with a language- class; bare inline code doesn't.
            const isBlock = typeof codeClass === 'string' && codeClass.includes('language-');
            if (isBlock) {
              return (
                <code className="block font-mono text-xs leading-relaxed">
                  {children}
                </code>
              );
            }
            return (
              <code className="px-1 py-0.5 rounded font-mono text-[0.85em] bg-slate-200/70 text-slate-800 dark:bg-slate-700/70 dark:text-slate-100">
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="mb-3 p-3 rounded-lg overflow-x-auto bg-slate-200/60 dark:bg-slate-900/60 last:mb-0">
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="mb-3 pl-3 border-l-2 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 last:mb-0">
              {children}
            </blockquote>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 underline hover:no-underline"
            >
              {children}
            </a>
          ),
          hr: () => (
            <hr className="my-4 border-slate-300/60 dark:border-slate-600/60" />
          ),
          table: ({ children }) => (
            <div className="mb-3 overflow-x-auto last:mb-0">
              <table className="w-full text-xs border-collapse">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-slate-300 dark:border-slate-600 px-2 py-1 text-left font-semibold bg-slate-200/50 dark:bg-slate-700/50">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-slate-300 dark:border-slate-600 px-2 py-1">
              {children}
            </td>
          ),
        }}
      >
        {content}
      </Markdown>
    </div>
  );
});
