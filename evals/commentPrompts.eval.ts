/**
 * Comment prompt quality check
 *
 * Runs fixed sets of notes through the real comment pipeline (same service and
 * provider code the API uses) and checks each output against deterministic
 * rules. The unit tests prove the prompt *contains* its guardrails; this proves
 * the model *follows* them. Cases and checks live in ./commentCases.ts.
 *
 * Makes paid API calls, so it is deliberately not part of `npm test`.
 *
 *   npm run eval:prompts                       # default provider, 2 runs per case
 *   npm run eval:prompts -- --provider openai --runs 3
 *   npm run eval:prompts -- --case sparse      # only cases whose id contains "sparse"
 *
 * Exits non-zero if any run fails, so it can gate a prompt or model change.
 */

import { config } from 'dotenv';
import { TicketService } from '../server/services/ticket/TicketService.js';
import { getProvider } from '../server/helpers/provider.js';
import { CASES, evaluate } from './commentCases.js';

config();

function parseArgs(argv: string[]) {
  const get = (flag: string) => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const runs = Number(get('--runs') ?? 2);
  if (!Number.isInteger(runs) || runs < 1) throw new Error('--runs must be a positive integer');
  return { provider: get('--provider'), runs, filter: get('--case') };
}

async function main() {
  const { provider: providerName, runs, filter } = parseArgs(process.argv.slice(2));
  const provider = getProvider(providerName);
  const service = new TicketService();
  const cases = filter ? CASES.filter(c => c.id.includes(filter)) : CASES;
  if (cases.length === 0) throw new Error(`No case id contains "${filter}"`);

  console.log(
    `Comment prompt eval — ${provider.name} (${provider.model}), ${cases.length} cases × ${runs} runs\n`,
  );

  let failedRuns = 0;
  let totalRuns = 0;

  // Sequential on purpose: parallel runs would trip provider rate limits and
  // turn quality failures into 429s.
  for (const c of cases) {
    for (let run = 1; run <= runs; run++) {
      totalRuns++;
      const label = runs > 1 ? `${c.id} #${run}` : c.id;

      let text: string;
      try {
        text = (await service.generateComment(c.input, provider)).content;
      } catch (err) {
        failedRuns++;
        console.log(`✗ ${label} — request failed: ${err instanceof Error ? err.message : String(err)}\n`);
        continue;
      }

      const failures = evaluate(text, c);
      if (failures.length === 0) {
        console.log(`✓ ${label}`);
        continue;
      }

      failedRuns++;
      console.log(`✗ ${label}`);
      for (const f of failures) console.log(`    - ${f.name}${f.detail ? ` (${f.detail})` : ''}`);
      console.log(text.replace(/^/gm, '    │ ') + '\n');
    }
  }

  console.log(`\n${totalRuns - failedRuns}/${totalRuns} runs passed`);
  process.exitCode = failedRuns > 0 ? 1 : 0;
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
