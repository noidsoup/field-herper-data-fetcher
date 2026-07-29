# AGENTS.md — <PROJECT NAME>

> Minimal stub created by `bootstrap`. Fill in the bracketed parts, then delete this note.
> Keep this file small (<~200 lines). Link out to deeper docs; don't inline everything.

**This repo:** <one line: what it is and who uses it>
**Stack:** <language / framework / package manager / host>

## Retrieval order (read before acting)

Governed by `.cursor/rules/pre-task-retrieval.mdc`. Cheapest-first:
1. SimpleMem (if present) → 2. LanceDB (`scripts/search_project_knowledge_lancedb.py`)
→ 3. cross-repo vault → 4. long-term memory.

## Invariants (always apply)

1. **Verify before done.** Run the gate, paste real output. See `.cursor/rules/verify-before-done.mdc`.
2. **Secrets only in `.env`** (gitignored). Behavioral config in config files, never env vars.
3. <add project-specific hard rules here — the scar-tissue ones>

## Definition of done (commands)

```bash
<verify command>        # e.g. npm run verify  /  make check
```

## Topic → where

| Need | Open |
| ---- | ---- |
| Operations / deploy / env | `AI_RUNBOOK.md` |
| Recent decisions | `AI_SESSION_MEMORY.md` |
| Architecture | `docs/ARCHITECTURE.md` |
| Workflows (plan, tdd, gate, migrate…) | global `.loops/` (say "use the loops") |

## Continuity

At close-out: append to `AI_SESSION_MEMORY.md`, update `MEMORY.md`, re-index changed
docs. The AI maintains these — not the human.
