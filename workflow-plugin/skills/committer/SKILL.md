---
name: committer
description: Generate and execute a git commit with Conventional Commits format. Used by orchestrator COMMIT state (STATE 6).
allowed-tools: Read, Bash, Glob, Grep
---

# committer

> 中文备注：整合 cc-best `/commit` 规范。
> 由 orchestrator STATE 6（COMMIT）调用。
> 用户确认后才执行 git commit。

## Process

1. **检查工作区**：运行 `git status`
2. **Stage 变更**：若无 staged 文件 → `git add` 本次工作流涉及的变更文件
   - 变更文件来源：从 plan 的各 task `Files` 字段提取
   - 若无法确定，`git add -A`（仅限工作流产出的文件）
3. **分析变更**：`git diff --staged --stat` 了解变更范围
4. **选择 type prefix**：
   - `feat`: 新功能
   - `fix`: bug 修复
   - `refactor`: 重构（无功能变化）
   - `docs`: 文档
   - `test`: 测试
   - `chore`: 构建/工具/配置
   - `perf`: 性能优化
5. **选择 scope**：从主要修改目录推断（如 `auth`, `api`, `ui`），无明确 scope 可省略
6. **生成 commit message**：
   - 格式：`<type>(<scope>): <subject>`
   - subject ≤ 72 字符，小写开头，不加句号
   - 多行变更时可选生成 body（空行分隔，解释 what/why）
7. **输出给用户预览**：展示完整 commit message，等待确认
8. **执行 commit**：用户确认后运行 `git commit -m "<message>"`
9. **返回 sha**：`git rev-parse --short HEAD`

## 用户覆盖

- 用户提供自定义 message → 直接使用（跳过步骤 4-6）
- 用户说 "n" / "跳过" → 不执行 commit，返回

## 禁止规则

- 禁止 `--force` / `--amend`（已推送的 commit）
- 禁止 `--no-verify`（跳过 hooks）
- 禁止 commit message 中添加 Co-Authored-By
- 原子提交：每个 commit 只做一件事（一个 feature/fix/refactor）
- 禁止在 main/master 分支直接 push

## Interface with orchestrator（中文适配层）

- **入口**：orchestrator STATE 6（COMMIT），前提 `verification.passed = true`。
- **退出**：commit 成功 → 置 `state.json.commit.committed = true` / `.sha = <short-sha>`；跳过 → 置 `.asked = true, .committed = false`。
- **交还**：→ STATE 7（KNOWLEDGE_CAPTURE）。
