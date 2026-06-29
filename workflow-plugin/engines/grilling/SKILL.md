---
name: grilling
description: Interview the user relentlessly about a plan or design. Use when the user wants to stress-test a plan before building, or uses any 'grill' trigger phrases.
---

# grilling

> 中文备注：可复用循环，是调询引擎（model-invoked）。
> 由 orchestrator STATE 1.5（CLARIFICATION）显式 `读取 workflow-plugin/engines/grilling/SKILL.md` 调用。
> 来源：mattpocock `grilling`。下方为英文原 prompt，保持原装以发挥原 skill 能力。

Interview me relentlessly about every aspect of this plan until we reach a shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one. For each question, provide your recommended answer.

Ask the questions one at a time, waiting for feedback on each question before continuing. Asking multiple questions at once is bewildering.

If a question can be answered by exploring the codebase, explore the codebase instead.

## Interface with orchestrator（中文适配层）

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

## 收敛规则（显式停止条件）

- 每 **3 轮**质询后，输出“当前共识摘要”并询问用户“继续深入还是已经足够？”
- 最多 **7 轮**自动收敛：输出完整共识 + “质询已达 7 轮，建议进入下一步”
- 用户任何时候说“够了/可以了/差不多了/OK/没问题” → 立即收敛退出
