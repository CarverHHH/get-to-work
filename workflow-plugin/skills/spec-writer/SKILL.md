---
name: spec-writer
description: Synthesize conversation context into a structured PRD. No interview — just synthesis. Used by orchestrator STATE 2.
allowed-tools: Read, Write, Edit, Glob, Grep
---

# spec-writer

> 中文备注：本 skill 来源 mattpocock `to-prd`（综合 spec）。
> 由 orchestrator STATE 2（REQUIREMENT_REFINEMENT）调用。
> 下方为英文原 prompt，保持原装以发挥原 skill 能力。
>
> 本插件适配（与原版差异）：
> - 原版 "publish to the project issue tracker" → 本插件 spec 写入 `.get-to-work/memory/specs/{YYYY-MM-DD}-{slug}.md`。
> - 原版 "run `/setup-matt-pocock-skills` if not" → 本插件不需要 setup（忽略该句）。
> - 原版内联 `<prd-template>` → 本插件使用 `workflow-plugin/templates/spec-template.md`（单一模板源）。
> - 使用模板时，跳过 HTML 注释内容，只填充实际字段。

## Process

This skill takes the current conversation context and codebase understanding and produces a PRD. Do NOT interview the user — just synthesize what you already know.

1. Explore the repo to understand the current state of the codebase, if you haven't already. Use the project's domain glossary vocabulary throughout the PRD, and respect any ADRs in the area you're touching.

2. Sketch out the seams at which you're going to test the feature. Existing seams should be preferred to new ones. Use the highest seam possible. If new seams are needed, propose them at the highest point you can. The fewer seams across the codebase, the better - the ideal number is one.

   Check with the user that these seams match their expectations.

3. Write the PRD using the template at `workflow-plugin/templates/spec-template.md`. Write it to `.get-to-work/memory/specs/{YYYY-MM-DD}-{slug}.md`.

## Phase exit

写完 spec 后：
1. 置 `state.json.spec.path` = 写入的文件路径
2. 置 `state.json.spec.confirmed = false`
3. 置 `state.json.spec.open_questions` = 仍有歧义的字段数（0 表示全部明确）
4. **停下**，输出 spec 摘要 + 确认请求
5. orchestrator 进入 **CONFIRM_SPEC**，等用户确认

用户未确认 ✅ 不得进入 PLANNING。

## Interface with orchestrator（中文适配层）

- **入口**：orchestrator STATE 2（REQUIREMENT_REFINEMENT）调用本 skill。
- **退出**：→ CONFIRM_SPEC（停下等用户）。
- **禁止质询**：只综合已有信息，不主动提问。如有不确定项，标注在 spec 的 `open_questions` 中。
- **域词汇**：若 `.get-to-work/memory/context.md` 存在，使用其术语表词汇；若 `.get-to-work/memory/adr/` 下有 ADR，尊重其决策。
- **Pattern 复用**：若 `.get-to-work/memory/patterns/` 下有适用 Pattern，优先引用其结构而非重新发明。
- **外部库文档**：若 spec 涉及不熟悉的外部库 API，用 `mcp__context7__resolve-library-id` + `mcp__context7__query-docs` 查最新文档，避免基于过时训练数据写 spec。
