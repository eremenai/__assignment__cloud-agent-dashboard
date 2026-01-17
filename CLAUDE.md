# Claude Agent Operating Guide (Repository)

This file defines how the Claude agent should operate in this repository.
It is the primary instruction source. If it conflicts with other docs, follow
the most specific instruction, with this file taking precedence unless a task-
specific doc explicitly overrides it.

## 0) Always-read dynamic context: `/.ai/`
**On every run, before planning or editing code, you MUST read all files in `/.ai/` recursively.**
Treat `/.ai/` as the authoritative, frequently-changing source of:
- current goals and scope
- architectural decisions and constraints
- feature flags / rollout state
- known issues and TODOs
- test and quality gates
- conventions that may change

If `/.ai/` is missing, proceed using this file and the repo’s existing docs, but
call out that `/.ai/` was not found.

## 1) North Star
- **KISS (Keep It Simple, Stupid)**: Always choose the simplest solution that works. Avoid over-engineering, premature abstraction, and unnecessary complexity.
- Optimize for: correctness, maintainability, clarity, and long-term velocity.
- Prefer deletion over accumulation.
- Keep the repo consistently shippable: main branch should pass tests and lint.

## 2) Aggressive cleanup policy (mandatory)
We remove dead code and dead functionality aggressively.

### 2.1 When to delete
Delete (not deprecate) when one or more are true:
- Unused code paths, unreachable branches, unused exports, unused files
- Old feature flags or stubs that are no longer referenced
- Duplicate abstractions where one is clearly dominant
- Legacy migrations/scripts that are no longer applicable (after verifying)

### 2.2 Deletion rules
- If you delete code, also delete:
    - corresponding tests that only validate the deleted behavior
    - documentation referencing removed behavior
    - configuration entries, env vars, feature flags, and CI steps tied to it
- Prefer removing whole modules over “commenting out” or leaving placeholders.
- No “dead” toggles: if a flag is permanently ON/OFF, remove the flag and code.

### 2.3 Safety checks before deletion
- Search references (ripgrep/IDE) across the repo, including build scripts.
- Verify runtime wiring (DI, routing, reflection, registries, config, imports).
- Run relevant tests/build locally (or provide exact commands to run).

## 3) Development lifecycle & workflow
### 3.1 Plan → Change → Verify → Document
For any non-trivial change:
1) **Plan**: summarize intent, constraints from `/.ai/`, and the minimal approach.
2) **Change**: implement small, focused commits (logically grouped).
3) **Verify**: run/adjust tests and lint/format. Add tests when behavior changes.
4) **Document**: update relevant docs (README, `/.ai/`, ADRs) only if necessary.

### 3.2 Minimal surface area
- Prefer small PRs and incremental steps.
- Avoid broad refactors unless required or explicitly requested.

### 3.3 Tests are not optional
- If you change behavior, add or update tests.
- Prefer high-signal tests:
    - unit tests for logic
    - integration tests for wiring/IO boundaries
- Remove brittle snapshot tests unless they provide clear value.

## 4) Code quality standards
### 4.1 Readability
- Favor explicitness over cleverness.
- Keep functions small and single-purpose.
- Avoid unnecessary abstractions.

### 4.2 Error handling
- Fail fast with actionable error messages.
- Avoid swallowing exceptions.
- Ensure errors are logged at appropriate boundaries.

### 4.3 Performance
- Don’t micro-optimize. Do address:
    - N+1 queries
    - accidental O(n^2) hot paths
    - excessive allocations in tight loops
- Use benchmarks/profiling only when needed.

## 5) Repository conventions
- Follow existing style and structure unless `/.ai/` overrides.
- Do not introduce new major frameworks/libraries without explicit instruction.
- Keep dependencies minimal; remove unused dependencies immediately.

## 6) Documentation discipline
- Docs must match reality.
- If a doc is outdated and the feature is gone: remove or rewrite the doc.
- Prefer short, task-oriented docs; avoid long “wiki” pages unless required.

## 7) Security & secrets
- Never commit secrets. Redact tokens/keys in logs and examples.
- Prefer secure defaults and least privilege.
- Validate inputs at trust boundaries.

## 8) Output format expectations (for Claude responses)
When you respond in a run, structure output as:
- **Read context**: confirm you read `/.ai/` and list key constraints found.
- **Plan**: 3–8 bullet steps.
- **Changes**: what you modified (files/areas).
- **Verification**: exact commands to run + what passed/needs attention.
- **Cleanup**: what was deleted and why.
- 
## 9) Commit message convention
Use Conventional Commits:

< type >(< scope >): < subject >

Body (optional):
- 2–6 bullets, each starts with a verb
- explain why if non-obvious
- reference issue IDs like ABC-123 when present

Rules:
- type ∈ feat|fix|refactor|chore|docs|test|perf|build|ci
- scope: optional, kebab-case, max 20 chars
- subject: imperative, <= 72 chars, no period
- breaking change: add ! after type/scope and mention in body
  Examples:
- feat(api): add pagination to search endpoint
- refactor(ui)!: remove legacy widget store

## 10) If uncertain
- If requirements are unclear, make the smallest reasonable assumption, state it
  explicitly, and proceed.
- Prefer asking for one clarification only when truly blocking.

