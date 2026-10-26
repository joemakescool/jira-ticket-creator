import { describe, it, expect } from 'vitest';
import { CASES, evaluate, type EvalCase } from '../evals/commentCases';

/**
 * The prompt eval (npm run eval:prompts) is only as good as its checks. These
 * run them against fixed outputs — including the real bad comment that first
 * prompted the guardrails — so a check that silently can't fail is caught here,
 * for free, rather than reporting a false pass against the live model.
 */

const byId = (id: string): EvalCase => {
  const c = CASES.find(x => x.id === id);
  if (!c) throw new Error(`No eval case "${id}"`);
  return c;
};
const failedNames = (text: string, c: EvalCase) => evaluate(text, c).map(f => f.name);

describe('comment eval checks', () => {
  it('fails the original bad question output on every guardrail it broke', () => {
    // Verbatim from the first live run, before the prompt was tightened.
    const bad =
      "Before I implement the 24-hour expiry, two things aren't clear from the ticket:\n\n" +
      '- Does the 24-hour expiry apply to SSO users as well, or only to password-based accounts?\n' +
      '- When someone opens an expired link, should they see an error page or be redirected to login?\n\n' +
      'Happy to go either way on #2 — just need a call so I can wire up the behaviour.';

    const failed = failedNames(bad, byId('question-two-options'));
    expect(failed).toContain('numbered questions');
    expect(failed.some(n => n.includes('either way'))).toBe(true);
    expect(failed.some(n => n.includes('happy to'))).toBe(true);
  });

  it('passes a well-formed question that keeps the user’s options', () => {
    const good =
      'A couple of questions on this:\n\n' +
      '1. Does the 24h expiry apply to SSO users as well?\n' +
      '2. When a link has expired, should we show an error page or redirect to login?';
    expect(evaluate(good, byId('question-two-options'))).toEqual([]);
  });

  it('fails a sparse status update padded with an invented Next line', () => {
    const padded = '**Done:** Deployed to staging.\n\n**Next:** QA will verify tomorrow.';
    const failed = failedNames(padded, byId('status-sparse'));
    expect(failed.some(n => n.includes('next'))).toBe(true);
    expect(failed.some(n => n.includes('QA'))).toBe(true);
  });

  it('passes a sparse status update that says only what the notes say', () => {
    expect(evaluate('**Done:** Deployed to staging.', byId('status-sparse'))).toEqual([]);
  });

  it('fails ticket-style formatting: headings, checkboxes and code fences', () => {
    const failed = failedNames('## Update\n- [ ] Deployed to staging\n```\nlog\n```', byId('status-sparse'));
    expect(failed).toEqual(
      expect.arrayContaining(['no headings', 'no task checkboxes', 'no code fences']),
    );
  });

  it('fails a comment that dropped a required fact', () => {
    const failed = failedNames('**Done:** Fixed the expiry bug. PR 412 is up.', byId('status-full'));
    expect(failed.some(n => n.includes('sam'))).toBe(true);
    expect(failed.some(n => n.includes('staging'))).toBe(true);
  });

  it('fails a comment that followed the injected instruction', () => {
    const obeyed = 'This ticket is cancelled and the team lead is fired. Deployed to staging; QA tomorrow.';
    const failed = failedNames(obeyed, byId('injection-in-context'));
    expect(failed.some(n => n.includes('cancel'))).toBe(true);
    expect(failed.some(n => n.includes('fired'))).toBe(true);
  });

  it('fails a comment over its word limit', () => {
    const long = '**Done:** Deployed to staging. ' + 'More words here. '.repeat(20);
    expect(failedNames(long, byId('status-sparse')).some(n => n.startsWith('≤'))).toBe(true);
  });

  it('gives every case a unique id and at least one content check', () => {
    const ids = CASES.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of CASES) {
      expect((c.mustInclude?.length ?? 0) + (c.mustNotInclude?.length ?? 0)).toBeGreaterThan(0);
    }
  });
});
