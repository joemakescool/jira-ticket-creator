---
name: commit
description: Draft a Conventional Commits message from staged changes, then commit on approval
disable-model-invocation: true
argument-hint: "[scope hint | --amend]"
allowed-tools: Bash(git diff:*) Bash(git status:*) Bash(git log:*) Bash(git branch:*)
---

## Branch

!`git branch --show-current`

## Staged summary (source of truth for "is anything staged")

!`git diff --cached --stat`

## Staged diff (generated files excluded)

```!
git diff --cached -- \
  ':(exclude)**/package-lock.json' \
  ':(exclude)**/yarn.lock' \
  ':(exclude)**/*.lock' \
  ':(exclude)**/*.min.*' | head -c 40000
```

## Files with unstaged edits (context only — never describe these)

!`git diff --name-only`

## Recent commits (match this style)

!`git log --oneline --no-merges -15`

## Format

```
type(scope): subject

* What changed, and why when it isn't obvious from the diff
* One bullet per distinct change

Refs: TICKET-123
```

- Blank line after the subject, always. Without it git treats the whole thing as one subject.
- Bullets: `*`, capitalized, no trailing period.
- Omit the bullet block entirely for a single-purpose commit. Bullets that restate the subject are noise.
- Omit `Refs:` when no ticket ID appears in the branch name or `$ARGUMENTS`.

## Task

If the staged summary is empty, say "Nothing staged" and stop. Never run `git add`.

Subject:

- Imperative, no trailing period. Target 50 chars, hard cap 72.
- Types: feat, fix, refactor, perf, test, docs, build, ci, chore, revert.

Bullets:

- One per distinct change, not one per file. Two files serving one change is one bullet.
- If a bullet only makes sense when you name the file path, it's too granular — drop it.
- 2-6. Past 6, this is two commits; say so before drafting.

Also:

- Flag any file appearing in both the staged diff and the unstaged list, above the message.
- If the diff looks truncated, say so and work from the stat and filenames rather than guessing.

Print the message in a fenced block and stop. On my approval:

```bash
git commit -F - <<'MSG'
<approved message, verbatim>
MSG
```

`$ARGUMENTS`, if present, is a scope or summary hint. `--amend` amends the previous commit.
SKILLEOF
