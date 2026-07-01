---
name: grill-me
description: A relentless interview to sharpen a plan or design.
disable-model-invocation: true
---

读取 `workflow-plugin/engines/grilling/SKILL.md` 并按其执行。

> 中文备注：独立入口，脱离 orchestrator 状态机直接发起质询。grilling 引擎已注册但 `disable-model-invocation`，仅由本入口或 orchestrator 显式 Read 调用。
