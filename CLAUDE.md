# SimBiotix — Claude Code Instructions

These rules apply to **every** code change. Non-negotiable unless a section states otherwise.

The full ruleset is split across topic files under `.claude/rules/` and imported below. Add new rules to the file that owns that topic; never let this index grow.

## Core framing — read first

@.claude/rules/honesty.md
@.claude/rules/critique.md
@.claude/rules/lab-context.md

## Code style

@.claude/rules/code-style.md
@.claude/rules/vue.md
@.claude/rules/css.md
@.claude/rules/strings.md
@.claude/rules/typescript.md

## Architecture

@.claude/rules/architecture.md

## Correctness

@.claude/rules/tests.md
@.claude/rules/correctness.md

## Legal

@.claude/rules/privacy.md

## Physics

@.claude/rules/physics.md

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **ResoPulse** (5635 symbols, 8944 relationships, 246 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/ResoPulse/context` | Codebase overview, check index freshness |
| `gitnexus://repo/ResoPulse/clusters` | All functional areas |
| `gitnexus://repo/ResoPulse/processes` | All execution flows |
| `gitnexus://repo/ResoPulse/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
