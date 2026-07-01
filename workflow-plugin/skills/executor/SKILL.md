---
name: executor
description: Execute plan tasks using auto-selected strategy (Inline for ≤2 tasks, SDD for ≥3 tasks). Used by orchestrator STATE 4.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, TodoWrite, Task
---

# executor

> 中文备注：本 skill 整合 superpowers `test-driven-development`（TDD 五步两门）+ `executing-plans`
> （单任务约束 + STOP）+ `subagent-driven-development`（SDD 调度）+ cc-best 熔断（`fix_count≥3`）。
> 由 orchestrator STATE 4 调用。自动选择执行策略：Inline（≤2 tasks）或 SDD（≥3 tasks）。
>
> **TDD 权威纪律**（Iron Law / Red-Green-Refactor / Rationalizations / Red Flags / Verification Checklist）
> 统一见 `workflow-plugin/prompts/tdd-reference.md`（按需 Read），本文件不重复内联，避免三源漂移。

## Strategy Selection（双模式路由）

```
入口：orchestrator STATE 4 调用

IF state.json.plan.total_tasks ≤ 2 OR state.json.execution_strategy == "inline"：
  execution_strategy = "inline"
  → 执行 Inline 模式
ELSE：
  execution_strategy = "sdd"
  → 执行 SDD 模式

置 state.json.execution.strategy = execution_strategy
```

---

## Inline 模式（≤ 2 tasks）

主控 session 内直接执行 TDD。

### Single-task loop

For each task:
1. Mark as in_progress（置 `state.json.execution.current_task_id` / `.phase = RED` / `.fix_count = 0`）
2. Follow each step exactly (plan has bite-sized steps)
3. Run verifications as specified
4. Mark as completed

- **exactly** + **as specified** are the two anti-drift anchors: don't invent steps, don't skip plan-specified verifications.
- One task at a time. Complete and verify before moving to next.

### TDD Red-Green-Refactor

TDD 纪律详见 `workflow-plugin/prompts/tdd-reference.md`（按需 Read）。核心铁律：

```
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
```

五步循环：RED → verify RED → GREEN → verify GREEN → REFACTOR

verify 使用 Gate Function（IDENTIFY/RUN/READ/VERIFY/CLAIM）：
1. IDENTIFY: What command proves this claim?
2. RUN: Execute the FULL command (fresh, complete)
3. READ: Full output, check exit code, count failures
4. VERIFY: Does output confirm the claim?
5. ONLY THEN: Make the claim

### Non-code Exemption（非代码文件豁免）

当 task 的 `Files` 字段**全部为非代码文件**时（.md / .json / .yaml / .toml / .css / .env / 脚本权限修改）：
- 跳过 RED/GREEN 步骤
- 直接执行修改
- verify 阶段改为"确认文件正确写入 + 内容符合预期"（非 test suite）

**判定边界**：若 task 同时包含代码文件和非代码文件 → 代码部分仍严格 TDD，非代码部分豁免。

代码类修改（.ts/.js/.py/.go/.rs/.java/.kt/.swift 等）永远严格 TDD，无例外。

**与 verifier 衔接**：非代码 task 在 STATE 5 全量验证时，`verification.test/build` 可能不适用——置为 `null`（非 fail），`passed` 仅要求 lint 通过 + 文件写入确认；代码 task 三件套全跑。

### When to Stop and Ask for Help

**STOP executing immediately when:**
- Hit a blocker (missing dependency, test fails, instruction unclear)
- Plan has critical gaps preventing starting
- You don't understand an instruction
- Verification fails repeatedly

**Ask for clarification rather than guessing. Don't force through blockers.**
**Never start implementation on main/master branch without explicit user consent.**

---

## SDD 模式（≥ 3 tasks）

主控仅做调度，每 task 派 fresh subagent（隔离 context）。

### Per-task dispatch loop

```
FOR EACH task in plan（按依赖序）：
  1. 运行 `bash workflow-plugin/scripts/task-brief.sh <plan-path> <task-index>` 提取当前 task 文本
  2. Read `workflow-plugin/prompts/implementer-prompt.md`
  3. 构造 subagent prompt = implementer-prompt 模板 + 填充占位符：
     - {TASK_BRIEF_PLACEHOLDER} ← task brief
     - {GLOBAL_CONSTRAINTS_PLACEHOLDER} ← plan 的 Global Constraints 段
     - {FILES_PLACEHOLDER} ← task 的 Files 字段路径列表（让 subagent 直达目标，省探索）
     - {DOMAIN_MODEL_PLACEHOLDER} ← 若 .get-to-work/memory/context.md 或 .get-to-work/memory/adr/ 存在，注入术语表摘要 + 相关 ADR 标题
     **替换后必须 grep 校验组装好的 prompt 不含任何 {*_PLACEHOLDER} 残留**，否则重新组装（防破损 prompt 喂给 subagent）。
  4. Dispatch implementer subagent（使用 Task 工具）
  5. 收集 subagent 报告，解析 STATUS：
     - DONE → 进入 review 步骤
     - BLOCKED → fix_count++，若 ≥3 熔断回 PLANNING
     - NEEDS_CONTEXT → 主控补充信息（读取相关文件），重新构造 prompt，re-dispatch
  6. 运行 `bash workflow-plugin/scripts/review-package.sh HEAD <task 的 Files 路径...>` 生成 diff
     （传 Files 列表限定 diff scope，避免跨 task 泄漏）
  7. Read `workflow-plugin/prompts/task-reviewer-prompt.md`
  8. 构造 reviewer prompt = task-reviewer-prompt 模板 + 填充：
     - {TASK_SPEC_PLACEHOLDER} ← task brief
     - {DIFF_PLACEHOLDER} ← 上一步 diff
     - {DOMAIN_MODEL_PLACEHOLDER} ← 同 implementer（用于检查命名/决策一致性）
     同样 grep 校验无占位符残留。
  9. Dispatch task-reviewer subagent（使用 Task 工具）
  10. 解析 reviewer VERDICT：
      - APPROVED → mark complete，current_task_index++，fix_count = 0
      - ISSUES(Critical/Important) → dispatch fix subagent（带 reviewer 指出的问题列表）→ re-review（最多 2 轮）
      - 2 轮后仍有 Critical → 熔断回 PLANNING
  11. 更新 state.json：execution.current_task_id / .phase / .fix_count / .status
      plan.completed_task_indexes 追加
```

### 并行 dispatch（无依赖 task）

默认严格串行。但若多个 task 的 `Blocked by` 互不依赖（形成独立链），可并行 dispatch 它们的 implementer subagent（Task 工具支持一次多调用），各自返回后**串行** review。依赖链上的 task 必须等 blocker 完成。并行仅用于独立 slice，不要并行有依赖的 task。

### Narration rule

Between tool calls, narrate at most one short line — the state.json and tool results carry the record.

---

## Fuse / circuit-breaker（两种模式通用）

Same task's verification failure escalates by `fix_count`:

| fix_count | Strategy |
| --- | --- |
| 1 | Normal fix |
| 2 | Review the previous failure cause, fix from a **different angle** (don't repeat) |
| 3 | 🛑 **Fuse trips**: stop this task, mark blocked, return to orchestrator STATE 3 (PLANNING) for re-review |

`fix_count` lives in `state.json.execution.fix_count`. Reset to 0 after each task completion.

## Stall 检测（防死循环）

- 连续 2 次同 task 同错误 → 缩小范围（隔离更小单元）
- 3 轮无新 task 完成 → 切策略或回 PLANNING
- 同类工具失败 3+ 次 → 停止重试，分析根因或置 STOP

## 完成即继续铁律

task 完成 → 更新 state → 立即取下一 task 执行。
**禁止** "任务完成，需要我继续吗？" / "当前状态如下…"（等待）。
只在确认点/熔断/STOP 时停。

## Interface with orchestrator（中文适配层）

- **入口**：orchestrator STATE 4 取 `plan.current_task_index` 对应 task，置 `state.json.execution.current_task_id` / `.phase = RED` / `.fix_count = 0`，调用本 skill。
- **退出（正常）**：所有 task completed → 置 `.status = passed`，交还 orchestrator 进入 STATE 5（VERIFICATION）（完成即继续，禁止总结等待）。
- **退出（熔断）**：置 `.status = blocked` + `stop_reason`，orchestrator 回退 STATE 3（PLANNING）。
- **state 更新**：每个 task 完成/失败时更新 `execution.*` + `plan.completed_task_indexes`。
