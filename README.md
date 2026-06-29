# get-to-work — Workflow OS Plugin for Claude Code

> 仓库地址：https://github.com/CarverHHH/get-to-work

一个轻量、**状态机驱动**的 Claude Code 工作流系统。把一句自然语言需求，
按 14 个状态严格推进成：澄清的共识 → 确认的 spec → 依赖有序的 task list →
TDD 执行的代码 → fresh-evidence 验证 → 沉淀的知识。

- ✅ 纯 Markdown + JSON + Shell，**零外部依赖**
- ✅ 14 态状态机，四场景分流（bug / simple / moderate / complex）
- ✅ 双模式自动执行：Inline（≤ 2 tasks）/ SDD（≥ 3 tasks，subagent 驱动）
- ✅ 8 个 Hook 守护：安全拦截、自动格式化、上下文监控、知识提醒
- ✅ 三重知识沉淀：ADR（架构决策）+ Lesson（踩坑教训）+ Pattern（最佳实践）
- ✅ 可恢复：中断 / 压缩后 `--resume` 继续，STOPPED 状态支持交互恢复

---

## 安装

### 方式 A：Claude Code 插件（推荐）

```bash
# 获取项目
git clone https://github.com/CarverHHH/get-to-work.git

# 用户级安装
cp -r get-to-work ~/.claude/plugins/get-to-work
# 或项目级（在目标项目目录执行，软链到 clone 的绝对路径）
ln -s /abs/path/to/get-to-work .claude/get-to-work
```

安装后 `/to-work` slash command 即可用。

### 方式 B：手动引用

把 `workflow-plugin/` 复制到项目，手动让 Claude 读取 `workflow-plugin/orchestrator.md`。

---

## 运行

```
/to-work 给登录页加一个"记住我"复选框，记住 7 天
```

| 命令 | 行为 |
|------|------|
| `/to-work <需求>` | 正常启动，INPUT_ANALYSIS 自动判断场景 |
| `/to-work --lite <需求>` | 强制 lite 模式（跳 spec，直接 plan） |
| `/to-work --inline <需求>` | 强制 Inline 执行（即使 tasks ≥ 3） |
| `/to-work --sdd <需求>` | 强制 SDD 执行（即使 tasks ≤ 2） |
| `/to-work --resume` | 从 state.json 恢复中断的工作流 |
| `/to-work --status` | 输出当前 state.json 摘要（不启动流程） |

---

## 文件结构

```
get-to-work/
├── .claude-plugin/plugin.json          # 插件清单 + hooks 注册
├── commands/
│   └── to-work.md                     # /to-work 入口（轻量壳）
├── hooks/
│   ├── hooks.json                      # 8 hooks 配置（5 种事件）
│   └── scripts/
│       ├── session-start.js            # SessionStart — 检测中断/STOPPED，重置计数器
│       ├── validate-command.js         # PreToolUse(Bash) — 危险命令拦截
│       ├── protect-files.js            # PreToolUse(Write|Edit) — 敏感文件保护
│       ├── format-file.js              # PostToolUse(Write|Edit) — 自动格式化
│       ├── suggest-compact.js          # PostToolUse(*) — 工具调用计数监控
│       ├── observe-patterns.js         # PostToolUse(Write|Edit|Bash) — 操作记录
│       ├── knowledge-prompt.js         # Stop — 踩坑经历提醒
│       └── pre-compact.js              # PreCompact — 状态快照保存
├── workflow-plugin/                    # 核心引擎
│   ├── orchestrator.md                 # ★ 状态机调度器（14 STATE + 验证门 + 熔断）
│   ├── state.json                      # 工作流状态真源（schema v2）
│   ├── skills/                         # 能力层（由 orchestrator 显式调用）
│   │   ├── spec-writer/SKILL.md        # PRD 综合
│   │   ├── task-planner/SKILL.md       # 任务拆解（纵向切片 + 依赖序）
│   │   ├── executor/SKILL.md           # TDD 执行（Inline/SDD 双模式）
│   │   ├── verifier/SKILL.md           # Gate Function: lint/test/build
│   │   ├── committer/SKILL.md          # Conventional Commits 提交
│   │   ├── bug-diagnostician/SKILL.md  # 六阶段 bug 诊断
│   │   └── knowledge-capture/SKILL.md  # ADR + Lesson + Pattern 沉淀
│   ├── engines/                        # 可复用引擎（不注册，显式路径引用）
│   │   ├── grilling/SKILL.md           # 质询引擎（一次一问 + 共识表格）
│   │   └── domain-modeling/SKILL.md    # 领域建模（术语表 + ADR 三重门）
│   ├── prompts/                        # SDD subagent prompt 模板
│   │   ├── implementer-prompt.md       # 实现者 subagent
│   │   ├── task-reviewer-prompt.md     # 评审者 subagent
│   │   └── tdd-reference.md            # TDD 纪律参考
│   ├── templates/                      # 文档模板
│   │   ├── spec-template.md            # PRD 字段 + 测试接缝
│   │   ├── task-template.md            # 纵向切片 + TDD 五步
│   │   ├── adr-template.md             # 架构决策记录
│   │   ├── lesson-template.md          # 踩坑教训
│   │   └── pattern-template.md         # 最佳实践
│   ├── scripts/                        # 辅助 shell 脚本
│   │   ├── task-brief.sh               # SDD task 摘要
│   │   └── review-package.sh           # SDD 评审打包
│   └── memory/
│       ├── adr/                        # ADR 知识库
│       ├── lessons/                    # Lesson 知识库
│       ├── patterns/                   # Pattern 知识库
│       ├── specs/                      # PRD 输出
│       ├── plans/                      # 计划输出
│       └── context.md                  # 项目上下文
├── CLAUDE.md                           # 项目宪法
└── README.md                           # 本文件
```

---

## 状态机

```
IDLE → INPUT_ANALYSIS → [四场景分支]
  ├─ bug      → BUG_DIAGNOSIS → VERIFICATION → COMMIT → KNOWLEDGE_CAPTURE → DONE
  ├─ simple   → PLANNING → CONFIRM_PLAN → EXECUTION_LOOP → VERIFICATION → COMMIT → KNOWLEDGE_CAPTURE → DONE
  ├─ moderate → REQUIREMENT_REFINEMENT → CONFIRM_SPEC → PLANNING → ... → DONE
  └─ complex  → [CLARIFICATION →] REQUIREMENT_REFINEMENT → CONFIRM_SPEC → PLANNING → ... → DONE
```

**14 个状态**：`IDLE` · `INPUT_ANALYSIS` · `CLARIFICATION` · `REQUIREMENT_REFINEMENT` ·
`CONFIRM_SPEC` · `PLANNING` · `CONFIRM_PLAN` · `EXECUTION_LOOP` · `BUG_DIAGNOSIS` ·
`VERIFICATION` · `COMMIT` · `KNOWLEDGE_CAPTURE` · `DONE` · `STOPPED`

**两个用户确认点**（铁律：必须停下等用户）：
- `CONFIRM_SPEC` — spec 确认
- `CONFIRM_PLAN` — plan 确认

**熔断机制**：`fix_count ≥ 3` → 回退 PLANNING 重新评审

---

## Hook 系统

| # | Hook | 事件 | 作用 |
|---|------|------|------|
| 1 | session-start | SessionStart | 检测中断工作流，新 session 重置计数器 |
| 2 | validate-command | PreToolUse(Bash) | 正则拦截危险命令（rm -rf, force push 等） |
| 3 | protect-files | PreToolUse(Write\|Edit) | 保护 .env / *.key / .git/ 等敏感文件 |
| 4 | format-file | PostToolUse(Write\|Edit) | 按扩展名调用 formatter（prettier/ruff/gofmt） |
| 5 | suggest-compact | PostToolUse(*) | 工具调用 ≥ 40 次时提醒压缩 |
| 6 | observe-patterns | PostToolUse(Write\|Edit\|Bash) | 操作记录追加 JSONL（500 行自动轮转） |
| 7 | knowledge-prompt | Stop | 有踩坑经历时提醒记录 Lesson |
| 8 | pre-compact | PreCompact | 保存状态快照 + git 信息供恢复用 |

PreToolUse hooks 使用 Claude Code 标准输出格式：
`{ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: "..." } }`

---

## 示例：一次完整运行

```
用户: /to-work 给登录页加"记住我"复选框，记住 7 天

[INPUT_ANALYSIS] 分析：需求有技术决策点（存储方式、过期策略）
  → complexity = complex, mode = full, needs_clarification = true

[CLARIFICATION] grilling 引擎质询：
  Q1(建议): token 存 cookie 还是 localStorage？建议 httpOnly cookie。→ 用户确认
  Q2(建议): 过期 7 天用滑动还是绝对？建议滑动续期。→ 用户确认
  → 共识写入表格，flags.clarification_done = true

[REQUIREMENT_REFINEMENT] spec-writer 综合 → 输出 spec 摘要
  → CONFIRM_SPEC：停下等用户。用户："✅"

[PLANNING] task-planner 拆解（纵向切片，按依赖序）：
  T1 记住我复选框端到端最小链路(被依赖)
  T2 滑动续期逻辑
  T3 过期边界测试
  → CONFIRM_PLAN：停下等用户。用户："✅"
  → total_tasks = 3 → 自动选择 SDD 模式

[EXECUTION_LOOP] SDD subagent 驱动：
  T1: implementer subagent → TDD 五步 → reviewer subagent APPROVED
  T2: ... APPROVED
  T3: ... APPROVED

[VERIFICATION] Gate Function：lint ✓ / test ✓ / build ✓（fresh 证据）

[COMMIT] "验证通过，是否提交？" → 用户："y" → feat(auth): add remember-me checkbox

[KNOWLEDGE_CAPTURE] 扫描决策 → ADR-0001（token 存储选型）→ DONE
```

---

## 能力来源

| 能力 | 整合自 | 关键模式 |
|------|--------|----------|
| grilling 引擎 | mattpocock `grilling` | 一次一问 / 提供建议答案 / 能查代码就别问 / 7 轮自动收敛 |
| domain-modeling 引擎 | mattpocock `domain-modeling` | 术语表 + ADR 三重门 + 场景探测 |
| spec-writer | mattpocock `to-prd` | 不质询只综合 / 测试接缝 / 验收可测量 |
| task-planner | mattpocock `to-issues` | 纵向切片 / 依赖序 / 收敛测验 |
| executor | superpowers `test-driven-development` + `executing-plans` | RED→verify→GREEN→verify→REFACTOR / Inline+SDD 双模式 |
| verifier | superpowers `verification-before-completion` | Gate Function: IDENTIFY/RUN/READ/VERIFY/CLAIM |
| knowledge-capture | cc-best `learn` + superpowers `writing-skills` | ADR 三重门 / Lesson 双重门 / Pattern 双重门 |
| committer | superpowers `committing-code` | Conventional Commits / 分类统计 |

---

## 设计取舍

- **orchestrator 为唯一调度者**：所有 skill 由 orchestrator 显式 `读取 …/SKILL.md` 调用，
  禁止 `@` 强加载（烧 context），禁止跳 STATE、跳验证门。
- **入口/引擎分层**：`skills/` 放能力模块（由 orchestrator 调用），
  `engines/` 放可复用引擎（grilling / domain-modeling，不注册自动发现，靠显式路径引用）。
- **state.json 纯指令式**：每个状态转移点由 orchestrator 指示 Claude 用 Read/Write 维护，
  零脚本、跨平台无忧。Write 后必须 Read back 验证 JSON 有效性。
- **Hook 层守护**：安全拦截（PreToolUse）、自动格式化（PostToolUse）、
  上下文监控（工具计数 + JSONL 轮转）、知识提醒（Stop）——与状态机互补。
- **完成即继续**：task 完成 → 立即取下一个，禁止总结等待。
  只在确认点 / 熔断 / STOP 时停下。

---

## 扩展（未来）

- STATE 5 的 Gate Function 可替换为 MCP 工具（`mcp__linter__run` 等）
- STATE 1 的代码库探索可接 MCP 查外部库文档
- state.json 预留 `external_tools` 字段位
