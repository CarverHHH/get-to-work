# Plan — {Feature Name}

<!--
生成者：task-planner skill（STATE 3）。
写入路径：workflow-plugin/memory/plans/{YYYY-MM-DD}-{slug}.md。
确认状态：⬜ 待确认 / ✅ 已确认（CONFIRM_PLAN）。
字段来源：What to build / Acceptance criteria / Blocked by / Parent 来自 mattpocock to-issues；
Goal / Architecture / Tech Stack / Global Constraints / Files / Interfaces / Steps 来自 superpowers writing-plans；
Steps 的 TDD 五步来自 superpowers test-driven-development。
-->

## Goal
{One-sentence goal.}

## Architecture
{2-3 sentences.}

## Tech Stack
{Languages / frameworks / key dependencies.}

## Global Constraints (inherited by every task)
{Project-level constraints carried over from the spec. One per line.}

- ...

---

## Task 1: {end-to-end slice name — a narrow but complete path through every integration layer}

- **What to build**: A concise description of this vertical slice. Describe the end-to-end behavior, not layer-by-layer implementation. Avoid specific file paths or code snippets — they go stale fast. (Exception: a prototype snippet encoding a decision more precisely than prose — state machine, reducer, schema, type shape — may be inlined, noted as from a prototype, trimmed to the decision-rich parts.)
- **Acceptance criteria**:
  - [ ] {measurable criterion 1}
  - [ ] {…}
- **Blocked by**: {Task N, or "None - can start immediately"}
- **Files**:
  - Create: `{path}`
  - Modify: `{path:line-range}`
  - Test: `{path}`
- **Interfaces**:
  - Consumes: {precise signature produced by earlier tasks: `fn(a: T) -> R`}
  - Produces: {precise signature later tasks depend on: `fn(b: U) -> V`}
- **Steps** (TDD, one action per step, 2-5 min):
  1. Write a failing test (full test code, no placeholder)
  2. Run the test, verify it fails (command + Expected: failure is missing functionality, not a typo/error)
  3. Write minimal code to pass (full impl code, no extra features, no refactor)
  4. Run the test, verify pass (command + Expected: pass + other tests still pass + clean output)
  5. commit (full git command)

## Task 2: {…}
{Same structure. Dependency-ordered; `Blocked by` references real Task numbers.}
