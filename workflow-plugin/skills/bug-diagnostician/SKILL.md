---
name: bug-diagnostician
description: Six-phase diagnosis loop for bugs and regressions. Used when complexity=bug detected in INPUT_ANALYSIS.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, TodoWrite
---

# bug-diagnostician

> 中文备注：来源 mattpocock `diagnosing-bugs`（六阶段诊断循环）。
> 由 orchestrator 在 INPUT_ANALYSIS 判定 `complexity = bug` 后直接调用。
> 下方为英文原 prompt，保持原装以发挥原 skill 能力。
> Non-code Exemption 不适用于 bug flow（bug 修复一定涉及代码）。

A discipline for hard bugs. Skip phases only when explicitly justified.

When exploring the codebase, read `.get-to-work/memory/context.md` (if it exists) to get a clear mental model of the relevant modules, and check ADRs in the area you're touching.

## Phase 1 — Build a feedback loop

**This is the skill.** Everything else is mechanical. If you have a **tight** pass/fail signal for the bug — one that goes red on _this_ bug — you will find the cause; bisection, hypothesis-testing, and instrumentation all just consume it. If you don't have one, no amount of staring at code will save you.

Spend disproportionate effort here. **Be aggressive. Be creative. Refuse to give up.**

### Ways to construct one — try them in roughly this order

1. **Failing test** at whatever seam reaches the bug — unit, integration, e2e.
2. **Curl / HTTP script** against a running dev server.
3. **CLI invocation** with a fixture input, diffing stdout against a known-good snapshot.
4. **Headless browser script** (Playwright / Puppeteer) — drives the UI, asserts on DOM/console/network.
5. **Replay a captured trace.** Save a real network request / payload / event log to disk; replay it through the code path in isolation.
6. **Throwaway harness.** Spin up a minimal subset of the system (one service, mocked deps) that exercises the bug code path with a single function call.
7. **Property / fuzz loop.** If the bug is "sometimes wrong output", run 1000 random inputs and look for the failure mode.
8. **Bisection harness.** If the bug appeared between two known states (commit, dataset, version), automate "boot at state X, check, repeat" so you can `git bisect run` it.
9. **Differential loop.** Run the same input through old-version vs new-version (or two configs) and diff outputs.
10. **HITL bash script.** Last resort. If a human must click, drive _them_ with a structured script so the loop is still structured.

Build the right feedback loop, and the bug is 90% fixed.

### Tighten the loop

Treat the loop as a product. Once you have _a_ loop, **tighten** it:

- Can I make it faster? (Cache setup, skip unrelated init, narrow the test scope.)
- Can I make the signal sharper? (Assert on the specific symptom, not "didn't crash".)
- Can I make it more deterministic? (Pin time, seed RNG, isolate filesystem, freeze network.)

### Non-deterministic bugs

The goal is not a clean repro but a **higher reproduction rate**. Loop the trigger 100×, parallelise, add stress, narrow timing windows, inject sleeps. A 50%-flake bug is debuggable; 1% is not — keep raising the rate until it's debuggable.

### When you genuinely cannot build a loop

Stop and say so explicitly. List what you tried. Ask the user for: (a) access to whatever environment reproduces it, (b) a captured artifact (HAR file, log dump, core dump, screen recording with timestamps), or (c) permission to add temporary production instrumentation. Do **not** proceed to hypothesise without a loop.

### Completion criterion — a tight loop that goes red

Phase 1 is done when the loop is **tight** and **red-capable**: you can name **one command** that you have **already run at least once**, and that is:

- [ ] **Red-capable** — it drives the actual bug code path and asserts the user's exact symptom
- [ ] **Deterministic** — same verdict every run (flaky bugs: a pinned, high reproduction rate)
- [ ] **Fast** — seconds, not minutes
- [ ] **Agent-runnable** — you can run it unattended

If you catch yourself reading code to build a theory before this command exists, **stop — jumping straight to a hypothesis is the exact failure this skill prevents.** No red-capable command, no Phase 2.

## Phase 2 — Reproduce + minimise

Run the loop. Watch it go red — the bug appears.

Confirm:
- [ ] The loop produces the failure mode the **user** described — not a different failure
- [ ] The failure is reproducible across multiple runs
- [ ] You have captured the exact symptom (error message, wrong output, slow timing)

### Minimise

Once it's red, shrink the repro to the **smallest scenario that still goes red**. Cut inputs, callers, config, data, and steps **one at a time**, re-running the loop after each cut.

Done when **every remaining element is load-bearing** — removing any one makes the loop go green.

Do not proceed until you have reproduced **and** minimised.

## Phase 3 — Hypothesise

Generate **3–5 ranked hypotheses** before testing any of them.

Each hypothesis must be **falsifiable**: state the prediction it makes.

> Format: "If <X> is the cause, then <changing Y> will make the bug disappear / <changing Z> will make it worse."

**Show the ranked list to the user before testing.** They often have domain knowledge that re-ranks instantly. Don't block on it — proceed with your ranking if the user is AFK.

## Phase 4 — Instrument

Each probe must map to a specific prediction from Phase 3. **Change one variable at a time.**

Tool preference:
1. **Debugger / REPL inspection** if the env supports it
2. **Targeted logs** at the boundaries that distinguish hypotheses
3. Never "log everything and grep"

**Tag every debug log** with a unique prefix, e.g. `[DEBUG-a4f2]`. Cleanup at the end becomes a single grep.

## Phase 5 — Fix + regression test

Write the regression test **before the fix** — but only if there is a correct seam for it.

If a correct seam exists:
1. Turn the minimised repro into a failing test at that seam.
2. Watch it fail.
3. Apply the fix.
4. Watch it pass.
5. Re-run the Phase 1 feedback loop against the original (un-minimised) scenario.

If no correct seam exists, note it — the codebase architecture is preventing the bug from being locked down.

## Phase 6 — Cleanup + post-mortem

Required before declaring done:
- [ ] Original repro no longer reproduces (re-run the Phase 1 loop)
- [ ] Regression test passes (or absence of seam is documented)
- [ ] All `[DEBUG-...]` instrumentation removed (`grep` the prefix)
- [ ] Throwaway prototypes deleted
- [ ] The hypothesis that turned out correct is stated in the commit / PR message

**Then ask: what would have prevented this bug?** If the answer involves architectural change, note it as a Lesson candidate for KNOWLEDGE_CAPTURE.

## Interface with orchestrator（中文适配层）

- **入口**：orchestrator STATE 1 判定 `complexity = bug` 后，跳过 SPEC/PLAN 流程，直接调用本 skill。
- **退出（正常）**：Fix 完成 + regression test green → 进入 STATE 5（VERIFICATION 全量三件套）→ COMMIT → KNOWLEDGE_CAPTURE → DONE。
- **退出（熔断）**：Phase 1 无法建立反馈循环 → STOP（列出已尝试的方法，请求用户帮助）。Phase 5 fix_count ≥ 3 → STOP。
- **state 更新**：置 `execution.phase` 为 `bug-phase-{1-6}`；fix_count 在 Phase 5 累计。
- **外部库文档**：Phase 1 建反馈循环 / Phase 4 探测时，若 bug 涉及第三方库行为，用 `mcp__context7__resolve-library-id` + `mcp__context7__query-docs` 查 API 契约，确认是否为库的预期行为而非 bug。
