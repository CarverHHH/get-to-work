# get-to-work — Workflow OS Plugin

本项目是一个 **Claude Code 工作流插件**：将自然语言需求通过 14 态状态机驱动为
spec → plan → TDD 执行（双模式：Inline/SDD）→ 验证 → commit → 知识沉淀（ADR/Lesson/Pattern）。

四场景分流：`bug`（六阶段诊断）/ `simple`（lite 快速通道）/ `moderate`（标准流程）/ `complex`（含质询）。

> **核心文件**：`workflow-plugin/orchestrator.md`（状态机调度器，全文必读）。
> **入口命令**：`/to-work`。
> **技术栈**：纯 Markdown + JSON + Shell，零外部依赖。

## Quick Navigation

| 文件 | 用途 |
| --- | --- |
| `workflow-plugin/orchestrator.md` | 状态机核心（14 STATE + 验证门 + 回边 + 确认点 + 压缩恢复） |
| `.get-to-work/state.json` | 当前工作流状态（schema v2，Claude 用 Read/Write 维护） |
| `workflow-plugin/skills/spec-writer/` | 综合 PRD（原 planner Phase A） |
| `workflow-plugin/skills/task-planner/` | 垂直切片拆 task（原 planner Phase B） |
| `workflow-plugin/skills/executor/` | 双模式 dispatcher（Inline ≤2 / SDD ≥3） |
| `workflow-plugin/skills/verifier/` | lint/test/build 三件套验证 |
| `workflow-plugin/skills/committer/` | Conventional Commits 提交 |
| `workflow-plugin/skills/knowledge-capture/` | ADR/Lesson/Pattern 知识萃取 |
| `workflow-plugin/skills/bug-diagnostician/` | 六阶段 bug 诊断循环 |
| `workflow-plugin/engines/*/SKILL.md` | 可复用引擎（grilling / domain-modeling） |
| `workflow-plugin/prompts/` | SDD subagent 指令（implementer / reviewer / tdd-reference） |
| `workflow-plugin/scripts/` | shell 辅助（task-brief.sh / review-package.sh） |
| `workflow-plugin/templates/` | spec / task / adr / lesson / pattern 模板 |
| `.get-to-work/memory/` | 知识库（specs / plans / adr / lessons / patterns） |
| `hooks/hooks.json` | Hook 系统配置（8 hooks） |
| `commands/to-work.md` | `/to-work` 入口 |
| `.claude-plugin/plugin.json` | 插件元数据（v0.3.0） |

## 铁律（不可违背）

1. **状态机驱动** — 不跳 STATE、不跳验证门。
2. **用户确认点** — CONFIRM_SPEC / CONFIRM_PLAN 必须停下等用户。
3. **测试驱动验证** — 无失败测试不写实现（Non-code Exemption 除外）。
4. **完成即继续** — task 完成后立即取下一个，禁止"需要继续吗？"。
5. **单任务执行** — 一次只做一个 task。
6. **state.json 实时同步** — 每次状态转移立即写入。

## 状态机速览

```
IDLE → INPUT_ANALYSIS → [四场景分流]
  ├─ bug → BUG_DIAGNOSIS → VERIFICATION → COMMIT → KNOWLEDGE_CAPTURE → DONE
  ├─ simple(lite) → PLANNING → CONFIRM_PLAN → EXECUTION_LOOP → VERIFICATION → COMMIT → KNOWLEDGE_CAPTURE → DONE
  ├─ moderate → REQUIREMENT_REFINEMENT → CONFIRM_SPEC → PLANNING → CONFIRM_PLAN → EXECUTION_LOOP → VERIFICATION → COMMIT → KNOWLEDGE_CAPTURE → DONE
  └─ complex → [CLARIFICATION →] REQUIREMENT_REFINEMENT → CONFIRM_SPEC → PLANNING → CONFIRM_PLAN → EXECUTION_LOOP → VERIFICATION → COMMIT → KNOWLEDGE_CAPTURE → DONE
```

**执行策略**：tasks ≤ 2 → Inline TDD | tasks ≥ 3 → SDD（subagent 隔离 context）。

## 开发约定

- **路径基准**：只读资源（skills/engines/templates/scripts/prompts）从插件目录 `workflow-plugin/` 起算；工作数据（state.json/memory/）从项目 cwd 的 `.get-to-work/` 起算（per-project 隔离）
- **state.json**：schema v2，`history[]` 最多 20 条
- **Commit 规范**：Conventional Commits（`<type>(<scope>): <subject>`）
- **熔断机制**：fix_count ≥ 3 → 回退 PLANNING

## 如何启动

```bash
/to-work <需求>              # 正常启动，自动判断复杂度
/to-work --lite <需求>       # 强制 lite 快速通道
/to-work --inline <需求>     # 强制 Inline 执行
/to-work --sdd <需求>        # 强制 SDD 执行
/to-work --resume            # 恢复中断的工作流
/to-work --status            # 查看当前状态
```
