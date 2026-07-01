---
name: grilling
description: Interview the user relentlessly about a plan or design. Use when the user wants to stress-test a plan before building, or uses any 'grill' trigger phrases.
disable-model-invocation: true
---

# grilling

> 中文备注：可复用循环，是调询引擎（model-invoked）。
> 由 orchestrator STATE 1.5（CLARIFICATION）显式 `读取 workflow-plugin/engines/grilling/SKILL.md` 调用。
> 来源：mattpocock `grilling`。下方为英文原 prompt，保持原装以发挥原 skill 能力。

Interview me relentlessly about every aspect of this plan until we reach a shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one. For each question, provide your recommended answer.

Ask the questions one at a time, waiting for feedback on each question before continuing. Asking multiple questions at once is bewildering.

If a question can be answered by exploring the codebase, explore the codebase instead.

## Interface with orchestrator（中文适配层）

> 仅在 orchestrator STATE 1.5 上下文中执行下列 state.json 写回；经 `/grill-me` 独立调用本引擎时，跳过 state.json 写回，直接在对话中输出 `## Clarification Consensus` 段即可。

- **入口**：orchestrator STATE 1.5（CLARIFICATION）置 `flags.needs_clarification = true` 后直接调用本引擎。
- **退出**：把达成的共识写成结构化摘要，写回 `state.json.input`（追加 `## Clarification Consensus` 段），并置 `flags.clarification_done = true`，交还 orchestrator 进入 STATE 2。

### 共识摘要格式（追加到 state.json.input 尾部）

```markdown
## Clarification Consensus

| # | 决策点 | 结论 | 理由 |
|---|--------|------|------|
| 1 | {具体问题} | {明确结论} | {为什么这样决定} |
| 2 | ... | ... | ... |

### 未解决项（若有）
- {留待 spec 阶段处理的问题}
```

要求：
- 每个决策点必须有明确结论（不能是“待定”）
- 若有未解决项，标注“留待 spec 阶段”，不阻塞进入 STATE 2

## 收敛规则（软停止）

- 不设轮次上限，遵循原 prompt 的 “relentlessly … until we reach a shared understanding”——走完 design tree 每个分支再停。
- 不主动问”继续深入还是已经足够？”（避免给用户提前退出的台阶）。
- **阶段性进度可见**（只通报、不截断）：每 **10 轮**输出一次”已覆盖分支 + 未深入分支”清单，让用户看到进度并主动决定是否还要深入，而非被动问”够了没”。
- 仅当用户**显式**表达停止意图时退出，触发词限定为：`停 / 停止 / 结束 / 进入下一步 / 进入 spec / 够了 / 不用再问了` 等。
- 模糊随口的 `OK / 差不多 / 可以 / 嗯 / 行` **不**触发退出，视为对当前问题的反馈，继续深挖未走完的分支。
- 收敛时输出完整 `## Clarification Consensus` 段并退出。
