---
name: domain-modeling
description: Build and sharpen a project's domain model. Use when the user wants to pin down domain terminology or a ubiquitous language, record an architectural decision, or when another skill needs to maintain the domain model.
---

# Domain Modeling

> 中文备注：model-invoked 引擎，由 orchestrator STATE 1.5（CLARIFICATION）显式
> `读取 workflow-plugin/engines/domain-modeling/SKILL.md` 调用。
> 来源：mattpocock `domain-modeling`（含 `CONTEXT-FORMAT.md` / `ADR-FORMAT.md`）。
> 下方为英文原 prompt，保持原装以发挥原 skill 能力。
> 路径适配：原版的 `CONTEXT.md` / `docs/adr/` 在本插件统一为
> `workflow-plugin/memory/context.md` / `workflow-plugin/memory/adr/`。

Actively build and sharpen the project's domain model as you design. This is the *active* discipline — challenging terms, inventing edge-case scenarios, and writing the glossary and decisions down the moment they crystallise. (Merely *reading* `context.md` for vocabulary is not this skill — that's a one-line habit any skill can do. This skill is for when you're changing the model, not just consuming it.)

## File structure

Most repos have a single context:

```
workflow-plugin/memory/
├── context.md
└── adr/
    ├── 0001-event-sourced-orders.md
    └── 0002-postgres-for-write-model.md
```

If a `context-map.md` exists, the repo has multiple contexts. The map points to where each one lives. Create files lazily — only when you have something to write. If no `context.md` exists, create one when the first term is resolved. If no `adr/` exists, create it when the first ADR is needed.

## During the session

### Challenge against the glossary

When the user uses a term that conflicts with the existing language in `context.md`, call it out immediately. "Your glossary defines 'cancellation' as X, but you seem to mean Y — which is it?"

### Sharpen fuzzy language

When the user uses vague or overloaded terms, propose a precise canonical term. "You're saying 'account' — do you mean the Customer or the User? Those are different things."

### Discuss concrete scenarios

When domain relationships are being discussed, stress-test them with specific scenarios. Invent scenarios that probe edge cases and force the user to be precise about the boundaries between concepts.

### Cross-reference with code

When the user states how something works, check whether the code agrees. If you find a contradiction, surface it: "Your code cancels entire Orders, but you just said partial cancellation is possible — which is right?"

### Update context.md inline

When a term is resolved, update `context.md` right there. Don't batch these up — capture them as they happen. Use the format below.

`context.md` should be totally devoid of implementation details. Do not treat `context.md` as a spec, a scratch pad, or a repository for implementation decisions. It is a glossary and nothing else.

### Offer ADRs sparingly

Only offer to create an ADR when all three are true:

1. **Hard to reverse** — the cost of changing your mind later is meaningful
2. **Surprising without context** — a future reader will wonder "why did they do it this way?"
3. **The result of a real trade-off** — there were genuine alternatives and you picked one for specific reasons

If any of the three is missing, skip the ADR. Use the format in `workflow-plugin/memory/adr/0000-template.md`.

## context.md format（inline from CONTEXT-FORMAT.md，英文原装）

```md
# {Context Name}

{One or two sentence description of what this context is and why it exists.}

## Language

**{Term}**:
{A one or two sentence description of the term}
_Avoid_: {aliases that should be replaced}
```

Rules:
- **Be opinionated.** When multiple words exist for the same concept, pick the best one and list the others under `_Avoid_`.
- **Keep definitions tight.** One or two sentences max. Define what it IS, not what it does.
- **Only include terms specific to this project's context.** General programming concepts (timeouts, error types, utility patterns) don't belong even if the project uses them extensively. Before adding a term, ask: is this a concept unique to this context, or a general programming concept? Only the former belongs.
- **Group terms under subheadings** when natural clusters emerge. If all terms belong to a single cohesive area, a flat list is fine.

## Interface with orchestrator（中文适配层）

- **入口**：orchestrator STATE 1.5（CLARIFICATION）置 `flags.needs_domain_modeling = true` 后直接调用本引擎。
- **退出**：新增 ADR 编号追加到 `state.json.knowledge.adrs[]`；置 `flags.domain_modeling_done = true`。后续 skill 必须用 `workflow-plugin/memory/context.md` 术语表词汇并尊重已写 ADR。
- **收敛规则**：同 grilling 引擎（每 3 轮摘要，最多 7 轮，用户说“够了”即止）。
