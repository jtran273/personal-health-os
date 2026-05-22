# Memory Bank

Durable project memory for coding agents (and James). The point: any agent should be able to drop in cold, read this directory, and have enough context to make smart decisions without re-deriving everything from the code.

## Files

| File | Purpose | Update when |
|---|---|---|
| [`architecture.md`](./architecture.md) | How the code is organized and *why*. | Architecture changes — new layer, new boundary, new persistence backend. |
| [`decisions.md`](./decisions.md) | Append-only log of non-trivial choices (ADR-style). | A decision is made that future-you would want explained. |
| [`features.md`](./features.md) | What James has asked for, status, related code. | James asks for a feature, or ships one. |
| [`conventions.md`](./conventions.md) | Code style, patterns, do's and don'ts. | A pattern is established that should be repeated, or an anti-pattern is identified. |
| [`active-context.md`](./active-context.md) | What is being worked on *right now*. | At the start and end of every session. |
| [`hardware-strategy.md`](./hardware-strategy.md) | The wearable / scale decisions and per-metric source hierarchy. | Hardware lineup changes, accuracy evidence changes. |
| [`design-system.md`](./design-system.md) | Where the design tokens, theme, typography, and components live and how to use them. | A new component is built, a token changes, or the build-order checklist progresses. |
| [`glossary.md`](./glossary.md) | Domain terms — "body mode", "coverage score", "known food", "deficit estimate". | A term is introduced or its meaning sharpens. |

## How to use this as an agent

**At session start:** read `active-context.md` and whichever of the above are relevant to the task. Don't read all of them every time — they're indexed by topic.

**During work:** if you discover something a future agent would want to know (an invariant, a constraint, a "we tried this and it didn't work"), add it to the right file.

**At session end:** update `active-context.md` to reflect current state. If you made a real architectural choice, append to `decisions.md`. If James asked for a new feature, capture it in `features.md`.

## How to use this as James

Treat these files as the single source of truth for "what does my app know about itself." When you read `features.md`, you should see every ask you've made. When you read `decisions.md`, you should see why the app is the way it is.

If something feels stale or wrong, edit it directly — the agents will pick up the new state on the next session.

## What does NOT go here

- Code patterns derivable from reading the files.
- Per-task scratch notes (use the conversation, or `memory-bank/_drafts/` which is gitignored).
- Anything in `CLAUDE.md` / `AGENTS.md` — those are the agent entrypoint, this is the deep context.
