# orchestrator.md — Workflow OS 状态机调度器

> 本文件是整个插件的**核心引擎**。`/to-work` 是轻量入口，全部逻辑在此。
> 加载本文件后，**全文遵守**，不得跳读、不得跳 STATE、不得跳验证门。

## 0. 启动协议

1. 读取 `.get-to-work/state.json`（当前状态）。
2. 解析用户输入参数：
   - `--resume` → 跳到 §7 恢复协议
   - `--status` → 输出 state.json 摘要 + 按 `current_state` 的"下一步指引"（见 `commands/to-work.md`），结束
   - `--lite <需求>` → 强制 `mode = "lite"`
   - `--inline <需求>` → 强制 `execution_strategy = "inline"`
   - `--sdd <需求>` → 强制 `execution_strategy = "sdd"`
   - `--spec-only <需求>` → 置 `flags.single_phase = "spec"`（跑到 CONFIRM_SPEC 输出 spec 后结束，不进 PLANNING）
   - `--plan-only` → 前提 `spec.confirmed = true`，置 `flags.single_phase = "plan"`（跑到 CONFIRM_PLAN 输出 plan 后结束）
   - `--execute` → 前提 `plan.confirmed = true`，置 `flags.single_phase = "execute"`（跑 EXECUTION_LOOP → VERIFICATION 后停，不自动 COMMIT）
   - `<需求>` → 正常启动
3. 把用户输入作为 `input` 写入 state.json，`current_state = INPUT_ANALYSIS`，`started_at = now`。
4. **装载历史 Lesson**（防重蹈覆辙）：若 `.get-to-work/memory/lessons/` 非空，Glob 近 5 条，读取各文件的标题与 `tags` 行（不读全文，控 context），作为"本次需避开的已知坑"注入。
5. **探测项目验证命令**（缓存供 verifier/subagent 复用，避免每次猜）：读 `package.json` scripts / `Makefile` / `pyproject.toml` / `Cargo.toml` 等，提取 lint/test/build 命令写入 `state.json.verification.commands`（探测不到则留空，verifier 自行识别）。
6. 从 STATE 1 开始，按下文状态机执行。

**跨 skill 调用约定**：需要某能力时，`读取 workflow-plugin/skills/<name>/SKILL.md 并按其规格执行`。
**禁止用 `@` 强加载**（烧 context）；改用显式 `读取 …/SKILL.md`，可控、可审计。
引擎模块在 `workflow-plugin/engines/<name>/SKILL.md`（`grilling`、`domain-modeling`），
**不注册自动发现、纯 model-invoked**，由 orchestrator 显式引用。

## 1. 铁律（不可违背）

1. **永远结构化输出** — spec/plan/状态都用模板字段，禁止自由散文。
2. **永远单任务执行** — EXECUTION_LOOP 一次只做一个 task。
3. **永远状态机驱动** — 不跳 STATE、不跳验证门。
4. **永远用户确认点** — CONFIRM_SPEC / CONFIRM_PLAN 必须停下等用户。
5. **永远测试驱动验证** — 无失败测试不写实现；无 fresh 证据不声明完成。
6. **永远不能直接跳到 coding** — 必须经 SPEC(确认) → PLAN(确认) 才进 EXECUTION（lite 模式可跳 SPEC）。
7. **完成即继续** — task 完成后立即取下一个，禁止总结等待。

> `Violating the letter of the rules is violating the spirit of the rules.`

## 2. 状态机总览

```
IDLE → INPUT_ANALYSIS → [分支]
  ├─ complexity=bug → BUG_DIAGNOSIS → VERIFICATION → COMMIT → KNOWLEDGE_CAPTURE → DONE
  ├─ complexity=simple → PLANNING → CONFIRM_PLAN → EXECUTION_LOOP → VERIFICATION → COMMIT → KNOWLEDGE_CAPTURE → DONE
  ├─ complexity=moderate → REQUIREMENT_REFINEMENT → CONFIRM_SPEC → PLANNING → CONFIRM_PLAN → EXECUTION_LOOP → VERIFICATION → COMMIT → KNOWLEDGE_CAPTURE → DONE
  └─ complexity=complex → [CLARIFICATION →] REQUIREMENT_REFINEMENT → CONFIRM_SPEC → PLANNING → CONFIRM_PLAN → EXECUTION_LOOP → VERIFICATION → COMMIT → KNOWLEDGE_CAPTURE → DONE
```

### 状态取值（`state.json.current_state`）

`IDLE` · `INPUT_ANALYSIS` · `CLARIFICATION` · `REQUIREMENT_REFINEMENT` · `CONFIRM_SPEC` ·
`PLANNING` · `CONFIRM_PLAN` · `EXECUTION_LOOP` · `BUG_DIAGNOSIS` · `VERIFICATION` ·
`COMMIT` · `KNOWLEDGE_CAPTURE` · `DONE` · `STOPPED`

### 确认信号识别（全局复用）

- ✅ 确认信号：明确肯定意图（✅/确认/继续/可以/OK/通过/没问题/好的/go/LGTM/approve）
- 🔄 修改信号：包含修改意图（"改一下…"/"这里不对…"/"加上…"/"删掉…"）
- ❓ 不确定：追问一次"请确认是否可以进入下一步，或告诉我需要修改的部分"

## 3. state.json 维护协议

**每个状态转移点，你必须执行 Read-Modify-Write：**

1. `Read` `.get-to-work/state.json`；
2. 修改对应字段（见各 STATE 的"state 更新"）；
3. `Write` 回 `state.json`；
4. 在 `history[]` 追加一条 `{"from": <prev>, "to": <next>, "at": <ISO8601>, "action": <一句>}`；
5. `updated_at = now`；
6. **Write 后立即 Read back 验证 JSON 有效性**；若无效，从上一次有效的 history 条目重建字段。

**history[] 约束**：最多保留 **20 条**（超出时删除最旧的）——长流程（complex 多 task）的 CLARIFICATION 决策演进需可回溯，10 条易被挤出。

**无脚本、零依赖**——状态机靠你读写这个文件推进。`state.json` 是唯一状态真源。

**progress.md（人类可读层）**：每次状态转移 Write state.json 后，额外 Write `.get-to-work/memory/progress.md`（checkbox 风格）：标题=需求摘要、Current=state + task i/n、Spec/Plan 路径 + ✅、Tasks 列表带 `[x]`/`[ ]`、Verification/Commit/Knowledge 状态。`cat progress.md` 即可看进度，不替代 state.json。

**EXECUTION_LOOP phase 实时同步**：Inline 模式下每个 phase 切换（RED→GREEN→REFACTOR）立即更新 `state.json.execution.phase`，缩小 resume 窗口——避免"代码已写但 state 停在 RED"导致 resume 重跑覆盖已写实现。

**状态可见性文件**：每次转移同时写 `/tmp/get-to-work-status`（单行：`{current_state} | task {i}/{n} | {mode}`），供 statusline（如 claude-hud）实时读取，零交互可见。

## 4. 各 STATE 详细规格

---

### STATE 1: INPUT_ANALYSIS

- **入口**：`current_state = INPUT_ANALYSIS`。
- **动作**：分析 `input`，判定 **complexity**：
  - `bug`：用户明确说 bug/报错/异常/broken/failing/slow/崩溃/不工作
  - `simple`：typo / 配置调整 / 单文件优化 / 纯文档修改 / 小 bug fix（无复杂复现路径）
  - `moderate`：多文件变更但需求已明确（无模糊词、无技术决策未定）
  - `complex`：新功能 / 重大重构 / 需求模糊 / 涉及新领域概念
- **设置 mode**：
  - `bug` → `mode = "bug"`
  - `simple` → `mode = "lite"`
  - `moderate` / `complex` → `mode = "full"`
- **仅 complex 时额外判定**：
  - `needs_clarification`：需求有模糊词 / 未定技术决策 / 验收不可测量
  - `needs_domain_modeling`：涉及新领域概念 / 术语冲突 / 重大架构决策

- **流程分支**：

| complexity | 下一步 |
|------------|--------|
| bug | → BUG_DIAGNOSIS |
| simple | → PLANNING（lite 模式） |
| moderate | → REQUIREMENT_REFINEMENT |
| complex（needs_clarification/domain_modeling） | → CLARIFICATION |
| complex（无需澄清） | → REQUIREMENT_REFINEMENT |

- **state 更新**：`complexity` / `mode` / `flags.*`

---

### STATE 1.5: CLARIFICATION（仅 complex 且需要澄清时）

- **入口**：`current_state = CLARIFICATION`。
- **动作**：orchestrator 直接调引擎（不经 wrapper skill）：
  - `needs_domain_modeling = true` → 读取 `workflow-plugin/engines/domain-modeling/SKILL.md` 执行
  - 否则 `needs_clarification = true` → 读取 `workflow-plugin/engines/grilling/SKILL.md` 执行
  - 两者都 true → 只调 domain-modeling（含 grilling 能力，不重复）

- **收敛规则**（详见 `engines/grilling/SKILL.md`）：不设轮次上限，走完 design tree 每个分支；不主动问"继续还是够了"；仅当用户显式喊停（停/结束/进入下一步/够了/不用再问）时退出，"OK/差不多/可以"等随口应答不触发退出。

- **退出**：共识写回 `state.json.input`（追加 `## Clarification Consensus` 段）→ STATE 2。
- **state 更新**：`flags.clarification_done = true` / `flags.domain_modeling_done = true`。

---

### STATE 2: REQUIREMENT_REFINEMENT → CONFIRM_SPEC

- **入口**：`current_state = REQUIREMENT_REFINEMENT`。
- **跳过条件**：
  - `mode = "lite"` → 跳过本 STATE，直接进入 STATE 3（PLANNING），不生成 spec 文件。
  - `mode = "bug"` → 不经过本 STATE（已从 STATE 1 跳入 BUG_DIAGNOSIS）。
- **动作**：读取 `workflow-plugin/skills/spec-writer/SKILL.md`，执行综合 spec。
- **验证门 ◇ CONFIRM_SPEC**：spec 全字段填齐？`open_questions` 已标？
  - 输出 spec 摘要 + 确认请求，**置 `current_state = CONFIRM_SPEC`，停下等用户**。
- **出口(yes)**：用户确认 → 若 `flags.single_phase = "spec"`，输出 spec 路径后 → DONE（不进 PLANNING）；否则 → STATE 3。
- **回边(no)**：用户要改 → 回 REQUIREMENT_REFINEMENT 修订 spec。
- **state 更新**：`spec.path` / `spec.confirmed` / `spec.open_questions`。

> **确认点铁律**：CONFIRM_SPEC 必须停下。不得自越进 PLANNING。用户没说确认就当 no。

---

### STATE 3: PLANNING → CONFIRM_PLAN

- **入口**：`current_state = PLANNING`。
- **动作**：
  - `mode = "lite"` → orchestrator 直接生成简化 plan（不调用 task-planner skill）：
    - 1-2 个简单步骤，不写文件到 .get-to-work/memory/plans/
    - 存入 `state.json.plan.inline_tasks`（JSON array）
  - `mode = "full"` → 读取 `workflow-plugin/skills/task-planner/SKILL.md`，执行拆解 task。
  - **熔断重入**（`execution.status = blocked` 且 `fix_count ≥ 3` 进入）：task-planner 只重规划 `current_task_index` 对应的失败 task，传入失败原因（`stop_reason` + fix 历史），**不重生成已完成 task**（`plan.completed_task_indexes` 保留）；重规划后 `plan.confirmed = false` 仍需过 CONFIRM_PLAN，但摘要只呈现改动的 task。
- **验证门 ◇ CONFIRM_PLAN**：plan 纵向切片？依赖序正确？No placeholders？
  - 输出 plan 摘要 + 确认请求，**置 `current_state = CONFIRM_PLAN`，停下等用户**。
- **出口(yes)**：用户确认 → 若 `flags.single_phase = "plan"`，输出 plan 路径后 → DONE（不进 EXECUTION）；`flags.single_phase = "execute"` 时跳过本确认点直接 STATE 4；否则 → STATE 4。
- **回边(no)**：用户要改 → 回 PLANNING 修订。
- **state 更新**：`plan.path` / `plan.confirmed` / `plan.total_tasks` / `plan.current_task_index = 0`。

> **确认点铁律**：CONFIRM_PLAN 必须停下。不得自越进 EXECUTION_LOOP。

---

### STATE 4: EXECUTION_LOOP

- **入口**：`current_state = EXECUTION_LOOP`（前提：`plan.confirmed = true`）。
- **动作**：读取 `workflow-plugin/skills/executor/SKILL.md`，executor 自动选择策略：
  - `plan.total_tasks ≤ 2` → Inline 模式
  - `plan.total_tasks ≥ 3` → SDD 模式
  - 用户指定 `--inline` / `--sdd` 可覆盖

- **验证门（Inline 模式）**：
  - verify green → `current_task_index++`，`fix_count = 0`
  - verify fail, fix_count < 3 → 回 RED
  - verify fail, fix_count ≥ 3 → 🛑 熔断回 STATE 3（PLANNING）

- **验证门（SDD 模式）**：
  - reviewer APPROVED → `current_task_index++`
  - reviewer ISSUES + fix → re-review
  - 2 轮后仍 Critical → 🛑 熔断回 STATE 3

- **next task**：
  - 有 → **立即**取下一个 task 执行（完成即继续）
  - 无 → 全部完成 → STATE 5

- **state 更新**：`execution.current_task_id` / `.phase` / `.fix_count` / `.status` / `.strategy`；
  `plan.completed_task_indexes` 追加。

> **完成即继续铁律**：task 完成 → 更新 state → 立即取下一 task。
> **禁止** "任务完成，需要我继续吗？" / "当前状态如下…"（等待）。只在确认点/熔断/STOP 时停。

#### Stall 检测
- 连续 2 次同 task 同错误 → 缩小范围（隔离更小单元）
- 3 轮无新 task 完成 → 切策略或回 PLANNING
- 同类工具失败 3+ 次 → 停止重试，分析根因或置 STOP

---

### STATE 4.5: BUG_DIAGNOSIS（bug 专用流程）

- **入口**：`current_state = BUG_DIAGNOSIS`（前提：`mode = "bug"`，从 STATE 1 直接跳入）。
- **动作**：读取 `workflow-plugin/skills/bug-diagnostician/SKILL.md`，执行六阶段诊断。
- **退出（正常）**：Fix 完成 + regression test green → STATE 5（VERIFICATION）。
- **退出（熔断）**：Phase 1 无法建立反馈循环 → STOP。Phase 5 fix_count ≥ 3 → STOP。
- **state 更新**：`execution.phase = bug-phase-{1-6}` / `execution.fix_count`。

---

### STATE 5: VERIFICATION

- **入口**：`current_state = VERIFICATION`（前提：所有 task completed / bug fix 完成）。
- **动作**：读取 `workflow-plugin/skills/verifier/SKILL.md`，跑 Gate Function 三件套：lint / test / build。
- **验证门 ◇ all pass**：三件全过（fresh 证据）？
  - **yes**：`verification.passed = true` → STATE 6。
  - **no, fixable**：回 STATE 4（executor 修），`fix_count` 计入。
  - **no, not fixable**：置 `stop_reason` → STOP。
- **state 更新**：`verification.{lint,test,build,passed}`。

> **无证据不声明完成**：`NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE.`

---

### STATE 6: COMMIT

- **入口**：`current_state = COMMIT`（前提：`verification.passed = true`）。
- **动作**：
  1. 输出验证结果摘要 + `git diff --stat` 统计
  2. 询问用户："验证通过，是否提交？(y / n / 自定义 message)"
  3. 路由：
     - `y` / 确认信号 → 读取 `workflow-plugin/skills/committer/SKILL.md` 执行
     - `n` / 跳过信号 → 置 `commit.asked = true, committed = false`
     - 自定义 message → 传给 committer 作为 message
- **退出**：→ STATE 7。
- **state 更新**：`commit.asked` / `commit.committed` / `commit.sha`。

---

### STATE 7: KNOWLEDGE_CAPTURE

- **入口**：`current_state = KNOWLEDGE_CAPTURE`（前提：COMMIT 完成或跳过）。
- **动作**：读取 `workflow-plugin/skills/knowledge-capture/SKILL.md` 执行。
- **退出**：→ DONE。
- **state 更新**：`knowledge.adrs[]` / `knowledge.lessons[]` / `knowledge.patterns[]`。

---

### DONE / STOPPED

- **DONE**：`current_state = DONE`。输出最终摘要：
  - spec/plan 路径
  - 完成的 task 数
  - verification 三件结果
  - commit sha（若已提交）
  - 新增知识条目
  - **重置 state.json**：`current_state = IDLE`，清除 input/complexity/mode/flags/spec/plan/execution/verification/commit/knowledge/stop_reason/stop_resume_state（保留 history 最近 10 条）

- **STOPPED**：`current_state = STOPPED`，`stop_reason` 写明，`stop_resume_state` 记录 STOP 前的状态（供 resume 时回退）。输出阻塞摘要 + 需用户决策的问题。state **不重置**（保持 STOPPED 供 `--resume` 使用）。

## 5. 熔断与 STOP 一览

| 触发 | 动作 |
| --- | --- |
| executor `fix_count ≥ 3` | 熔断 → 回 STATE 3 重新评审该 task |
| bug-diagnostician Phase 1 失败 | STOP，列出已尝试方法 |
| verifier 不可修失败 | STOP，询问用户 |
| Stall 检测命中 | 缩小范围 / 切策略 / 回 PLANNING / STOP |
| blocker / 致命缺口 / 指令不清 | STOP（`Ask, don't guess`） |

## 6. 可扩展点（未来）

- STATE 5 的 Gate Function 可替换为 MCP 工具（`mcp__linter__run` 等）。
- STATE 1 的代码库探索可接 MCP 查外部库文档。
- state.json 预留字段位（`external_tools`）。

## 7. 压缩与恢复协议

### 7.1 压缩触发

满足任一条件：
- `suggest-compact` hook 输出提醒（工具调用 ≥ 40 次）
- 系统提示上下文不足
- 用户手动触发

### 7.2 压缩前自动保存（由 pre-compact hook 完成）

1. state.json 已是最新（每次状态转移都实时写入）
2. hook 额外保存 `{ git_status, git_stash_list, branch, uncommitted_count }` → `.get-to-work/.pre-compact-state.json`

### 7.3 压缩后恢复（`/to-work --resume`）

1. Read `.get-to-work/state.json`
2. Read `.get-to-work/.pre-compact-state.json`（若存在）
3. 输出恢复摘要：
   - 工作流阶段：{current_state}
   - 当前模式：{mode}（lite/full/bug）
   - 执行策略：{execution.strategy}（inline/sdd）
   - 当前 task：{plan.current_task_index + 1} / {plan.total_tasks}
   - 已完成：{completed_task_indexes.length} 个
   - Git 状态：{branch} / {uncommitted_count} 个未提交文件

4. **若 `current_state = STOPPED`**：
   - 输出 `stop_reason`，问用户：
     - `"阻塞原因：{stop_reason}。\n选项：(1) 我已解决，继续 (2) 重新规划 (3) 放弃"`
     - 用户选 (1) → 清除 `stop_reason`，从 `stop_resume_state`（即 STOP 前的状态）继续
     - 用户选 (2) → 回 STATE 3（PLANNING）重新拆解
     - 用户选 (3) → 重置为 IDLE，结束
   - 用户未回答前不得自动继续

5. 其他状态：从 current_state 继续执行状态机

