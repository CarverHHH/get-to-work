---
name: task-planner
description: Break a confirmed spec into dependency-ordered vertical-slice tasks. Used by orchestrator STATE 3.
allowed-tools: Read, Write, Edit, Glob, Grep
---

# task-planner

> 中文备注：本 skill 来源 mattpocock `to-issues`（拆解 task）。
> 由 orchestrator STATE 3（PLANNING）调用。
> 下方为英文原 prompt，保持原装以发挥原 skill 能力。
>
> 本插件适配（与原版差异）：
> - 原版 "publish issues to the issue tracker" → 本插件 plan 写入 `workflow-plugin/memory/plans/{YYYY-MM-DD}-{slug}.md`。
> - 原版 `ready-for-agent` triage label → 本插件略（task list 即认领单元）。
> - 原版内联 `<issue-template>` → 本插件使用 `workflow-plugin/templates/task-template.md`（单一模板源）。
> - 收敛测验（Quiz the user）保留，对应 CONFIRM_PLAN 确认点。
> - 使用模板时，跳过 HTML 注释内容，只填充实际字段。

## Process

Break a plan into independently-grabbable issues using vertical slices (tracer bullets).

### 1. Gather context

Work from the confirmed spec at `state.json.spec.path`. Read its full content.

### 2. Explore the codebase (optional)

If you have not already explored the codebase, do so to understand the current state of the code. Issue titles and descriptions should use the project's domain glossary vocabulary, and respect ADRs in the area you're touching.

Look for opportunities to prefactor the code to make the implementation easier. "Make the change easy, then make the easy change."

### 3. Draft vertical slices

Break the plan into **tracer bullet** issues. Each issue is a thin vertical slice that cuts through ALL integration layers end-to-end, NOT a horizontal slice of one layer.

- Each slice delivers a narrow but COMPLETE path through every layer (schema, API, UI, tests)
- A completed slice is demoable or verifiable on its own
- Any prefactoring should be done first

### 4. Quiz the user

Present the proposed breakdown as a numbered list. For each slice, show:

- **Title**: short descriptive name
- **Blocked by**: which other slices (if any) must complete first
- **User stories covered**: which user stories this addresses (if the source material has them)

Ask the user:

- Does the granularity feel right? (too coarse / too fine)
- Are the dependency relationships correct?
- Should any slices be merged or split further?

Iterate until the user approves the breakdown.

### 5. Write the plan

For each approved slice, write a task using the template at `workflow-plugin/templates/task-template.md`. Write the complete plan to `workflow-plugin/memory/plans/{YYYY-MM-DD}-{slug}.md`. `Blocked by` references real Task numbers in dependency order.

Do NOT close or modify any parent issue.

## Output constraints

- **Vertical slices, not horizontal** — each task cuts end-to-end (schema → API → UI → tests), demoable/verifiable on its own, NOT "all models first, then all APIs".
- **Dependency-ordered** — blockers first, so `Blocked by` references real numbers already listed.
- **No Placeholders** — no TBD / TODO / "add appropriate error handling" / "write tests for the above" (with no code) / "similar to Task N" (must repeat the code). Either write it fully or don't write the task.
- **Step granularity** — one action per step, 2-5 min; the five-step TDD template is intact, none missing.
- **Task right-sizing** — a task = the smallest self-contained test cycle + a unit worth a reviewer gate. Fold setup/config/scaffold into the task that needs it.

## Phase exit

写完 plan 后：
1. 置 `state.json.plan.path` = 写入的文件路径
2. 置 `state.json.plan.confirmed = false`
3. 置 `state.json.plan.total_tasks` = task 总数
4. 置 `state.json.plan.current_task_index = -1`
5. **停下**，输出 plan 摘要 + 确认请求
6. orchestrator 进入 **CONFIRM_PLAN**，等用户确认

用户未确认 ✅ 不得进入 EXECUTION_LOOP。

## Interface with orchestrator（中文适配层）

- **入口**：orchestrator STATE 3（PLANNING），前提 `spec.confirmed = true`。
- **退出**：→ CONFIRM_PLAN（停下等用户）。
- **收敛测验**：到用户批准为止。
- **lite 模式不调用本 skill**：lite 模式下 orchestrator 直接生成简化 plan。
