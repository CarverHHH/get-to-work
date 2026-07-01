---
name: grill-with-docs
description: A relentless interview to sharpen a plan or design, which also creates docs (ADR's and glossary) as we go.
disable-model-invocation: true
---

读取 `workflow-plugin/engines/grilling/SKILL.md` 执行质询，同时读取 `workflow-plugin/engines/domain-modeling/SKILL.md` 产出 ADR/glossary。

> 中文备注：独立入口，质询 + 领域建模并行。两引擎已注册但 `disable-model-invocation`，仅由本入口或 orchestrator 显式 Read 调用。
