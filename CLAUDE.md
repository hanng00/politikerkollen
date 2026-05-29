# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## 5. Domain Boundaries & TDD

**Business rules live in the domain; adapters stay thin.**

Before fixing a bug or adding behavior, ask: _which bounded context owns this rule?_

- **Domain** — business rules, invariants, and policies (pure logic; no I/O)
- **Application** — orchestration, transactions, wiring repositories (no duplicated rules)
- **Adapters** — HTTP handlers, read projectors, UI mappers (shape data; do not reimplement rules)

**Do not duplicate domain logic** across layers. If two or more layers need the same rule, extract **one** domain function and call it. One source of truth beats a fast local fix.

**SOLID checks (quick):**

- **SRP** — one module owns one rule; projectors map, they don't decide
- **OCP** — new read/write paths call existing domain functions; don't fork logic
- **DIP** — outer layers depend on domain modules, never the reverse

**Abstraction is warranted when** a second consumer appears or a bug proves the rule is shared — not preemptively (see §2).

**TDD loop for behavior changes:**

1. **Domain test first (RED → GREEN)** — pure function in the owning module; cover the rule, edge paths, and what to ignore
2. **Wire consumers** — services/projectors/handlers delegate; no reimplemented logic
3. **Boundary test** — one test at the consumer edge when wiring or DTO mapping could fail

Skip step 3 only when consumers are one-line delegation and the domain test fully specifies the contract.

**Red flags — stop and refactor:**

- Same business logic in two files
- Fix added only in an adapter while another layer already owns related logic
- Test that only asserts HTTP 200 / UI render without checking the domain outcome
- "I'll duplicate it here for now" — that _is_ the now

```
persist → domain rule (single module) → projectors/adapters (thin)
              ↑
         domain tests (RED/GREEN first)
```

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
