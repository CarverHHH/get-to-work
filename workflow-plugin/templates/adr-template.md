<!--
生成者：knowledge-capture skill（STATE 7）或 domain-modeling 引擎（CLARIFICATION）。
复制本模板 → workflow-plugin/memory/adr/NNNN-{kebab-slug}.md（NNNN = 现有最大编号 + 1）。
质量门：ADR 三重门（难逆转 + 无上下文惊讶 + 真权衡）。
Keep it minimal. A single short paragraph is fine. Delete optional sections that add no value.
-->

# ADR-NNNN: {Short title of the decision}

{1-3 sentences: what's the context, what did we decide, and why.}

## Optional sections (only when they add genuine value; most ADRs won't need them)

- **Status**: `proposed | accepted | deprecated | superseded by ADR-NNNN`
- **Date**: YYYY-MM-DD
- **Considered Options** — only when the rejected alternatives are worth remembering
- **Consequences** — only when non-obvious downstream effects need to be called out

---

## When to offer an ADR (gate — all three must be true, else skip)

1. **Hard to reverse** — the cost of changing your mind later is meaningful.
2. **Surprising without context** — a future reader will look at the code and wonder "why on earth did they do it this way?".
3. **The result of a real trade-off** — there were genuine alternatives and you picked one for specific reasons.

If a decision is easy to reverse, skip it — you'll just reverse it. If it's not surprising, nobody will wonder why. If there was no real alternative, there's nothing to record beyond "we did the obvious thing."
