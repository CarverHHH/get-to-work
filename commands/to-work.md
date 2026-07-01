---
description: 自然语言需求 → spec → plan → TDD 执行 → 验证 → commit → 知识沉淀。状态机驱动的工作流入口。
argument-hint: "<需求> | --resume | --status | --lite <需求> | --inline <需求> | --sdd <需求>"
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
| `--resume` | 从 state.json 恢复中断的工作流 |
| `--status` | 输出当前 state.json 摘要（不启动流程） |

## 启动逻辑

1. 读取 `workflow-plugin/orchestrator.md`
2. 按 orchestrator §0 启动协议执行

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

