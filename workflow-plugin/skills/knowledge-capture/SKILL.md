---
name: knowledge-capture
description: Scan current workflow for ADR/Lesson/Pattern candidates, apply quality gates, present to user for confirmation. Used by orchestrator STATE 7.
allowed-tools: Read, Write, Edit, Glob, Grep
---

# knowledge-capture

> 中文备注：整合 mattpocock `domain-modeling` 的 ADR 三重门 + cc-best `learn` 的知识萃取。
> 由 orchestrator STATE 7（KNOWLEDGE_CAPTURE）调用。
> 知识写入需用户确认，不自动写入。

## 三种知识类型

| 类型 | 写入路径 | 模板 |
|------|----------|------|
| ADR | `workflow-plugin/memory/adr/NNNN-{slug}.md` | `workflow-plugin/templates/adr-template.md` |
| Lesson | `workflow-plugin/memory/lessons/{YYYY-MM-DD}-{slug}.md` | `workflow-plugin/templates/lesson-template.md` |
| Pattern | `workflow-plugin/memory/patterns/{slug}.md` | `workflow-plugin/templates/pattern-template.md` |

## 质量门

### ADR 三重门（三门全过才写）

1. **难以逆转** — 改成本高，不是随时能改回来的决策
2. **无上下文惊讶** — 未来读者不会问"为什么这样做"（反面：会问的才需要 ADR）
3. **真权衡** — 存在genuine alternatives，不是一边倒的选择

任一为假 → 跳过。多数决策不配写 ADR。

### Lesson 双重门（两门全过才写）

1. **真踩坑** — 不是第一次就做对的，经历了失败/重试/熔断
2. **有复用价值** — 未来类似场景可参考，不是一次性偶发

### Pattern 双重门（两门全过才写）

1. **2+ 次出现** — 本次工作流中 2 个以上 task 出现相同结构/做法
2. **可模板化** — 能抽象为通用做法，不是过于具体

## Process

1. **扫描 ADR 候选**：
   - 回顾本次工作中涉及的技术决策（架构选择、库选型、接口设计等）
   - 逐个过三重门

2. **扫描 Lesson 候选**：
   - `state.json.execution.fix_count > 0` 的 task → 分析失败原因
   - 工作流中经历 STOP 后恢复的情况
   - SDD 模式中 subagent BLOCKED 的原因
   - 逐个过双重门

3. **扫描 Pattern 候选**：
   - 2+ task 中重复出现的代码结构/文件组织/约定
   - 逐个过双重门

4. **输出候选列表**：
   - 每个候选附带：类型、标题、一句话摘要、门槛判定依据
   - 询问用户："以下知识条目通过了质量门，是否写入？可逐条选择保留/丢弃"

5. **用户确认后写入**：
   - 用户选择保留的 → 读取对应模板 → 填充内容 → 写入对应路径
   - ADR 编号自增（读取 `memory/adr/` 下最大编号 +1）

6. **无候选时**：
   - 全部被门槛过滤 → 静默跳过，输出"本次无新增知识条目"，不打扰用户

## Interface with orchestrator（中文适配层）

- **入口**：orchestrator STATE 7（KNOWLEDGE_CAPTURE），前提 COMMIT 完成或跳过。
- **退出**：写入完成 → 置 `state.json.knowledge.adrs[]` / `.lessons[]` / `.patterns[]` 追加新增条目路径 → 进 DONE。
- **澄清阶段已写的 ADR 不重复写**：检查 `state.json.knowledge.adrs[]` 避免重复。
