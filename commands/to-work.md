---
description: 自然语言需求 → spec → plan → TDD 执行 → 验证 → commit → 知识沉淀。状态机驱动的工作流入口。
argument-hint: "<需求> | --resume | --status | --lite <需求> | --inline <需求> | --sdd <需求> | --spec-only <需求> | --plan-only | --execute"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, TodoWrite, Task
---

# /to-work

状态机驱动的开发工作流入口。将自然语言需求转化为可执行的开发流程。

## 参数

| 参数 | 行为 |
|------|------|
| `<需求>` | 正常启动，INPUT_ANALYSIS 自动判断 complexity |
| `--lite <需求>` | 强制 lite 模式（跳过 CLARIFICATION + SPEC 确认） |
| `--inline <需求>` | 强制 Inline 执行策略（即使 tasks ≥ 3） |
| `--sdd <需求>` | 强制 SDD 执行策略（即使 tasks ≤ 2） |
| `--spec-only <需求>` | 阶段解耦：只跑到 CONFIRM_SPEC，输出 spec 文件后结束（不进 PLANNING） |
| `--plan-only` | 阶段解耦：前提 `spec.confirmed=true`，跑到 CONFIRM_PLAN 输出 plan 后结束 |
| `--execute` | 阶段解耦：前提 `plan.confirmed=true`，跑 EXECUTION_LOOP → VERIFICATION 后停（不自动 COMMIT） |
| `--resume` | 从 state.json 恢复中断的工作流 |
| `--status` | 输出当前 state.json 摘要 + **下一步该做什么**指引（不启动流程） |

## 启动逻辑

1. 读取 `workflow-plugin/orchestrator.md`
2. 按 orchestrator §0 启动协议执行

## --status 输出格式

`--status` 除 dump state.json 摘要外，按 `current_state` 输出可操作的下一步：
- `IDLE/DONE` → "无进行中工作流，用 `/to-work <需求>` 启动"
- `INPUT_ANALYSIS` → "正在判定复杂度…"
- `CLARIFICATION` → "正在质询澄清需求，回答当前问题或说『够了』收敛"
- `CONFIRM_SPEC` → "等你确认 spec（✅ 继续 / 提修改意见回退）"
- `CONFIRM_PLAN` → "等你确认 plan（✅ 继续 / 提修改意见回退）"
- `EXECUTION_LOOP` → "执行中（task {i}/{n}），无需操作，完成即继续"
- `VERIFICATION` → "正在跑 lint/test/build 验证"
- `COMMIT` → "等你确认提交（y / n / 自定义 message）"
- `KNOWLEDGE_CAPTURE` → "正在萃取 ADR/Lesson/Pattern 候选"
- `STOPPED` → "阻塞：{stop_reason}。解决后 `/to-work --resume`"

## 工作流概览

```
需求输入 → 复杂度判定 → [澄清] → Spec → Plan → TDD 执行 → 验证 → Commit → 知识沉淀
                           ↑                              ↑
                      仅 complex                    双模式自动选择
                                                  (Inline / SDD)
```

### 场景分流

| 复杂度 | 模式 | 流程 |
|--------|------|------|
| bug | bug | INPUT → BUG_DIAGNOSIS → VERIFY → COMMIT → KNOWLEDGE → DONE |
| simple | lite | INPUT → PLAN → CONFIRM → EXECUTE → VERIFY → COMMIT → KNOWLEDGE → DONE |
| moderate | full | INPUT → SPEC → CONFIRM → PLAN → CONFIRM → EXECUTE → VERIFY → COMMIT → KNOWLEDGE → DONE |
| complex | full | INPUT → [CLARIFY] → SPEC → CONFIRM → PLAN → CONFIRM → EXECUTE → VERIFY → COMMIT → KNOWLEDGE → DONE |
