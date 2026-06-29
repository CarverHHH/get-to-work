#!/bin/bash
# task-brief.sh — 从 plan 文件中提取指定 task 的完整文本
# 用法: task-brief.sh <plan-path> <task-index>
# 输出: task 全文（从 "## Task N" 到下一个 "## Task" 或文件结尾）
#
# 示例: bash workflow-plugin/scripts/task-brief.sh workflow-plugin/memory/plans/2024-01-15-login.md 1

set -euo pipefail

PLAN_PATH="${1:?用法: task-brief.sh <plan-path> <task-index>}"
TASK_INDEX="${2:?用法: task-brief.sh <plan-path> <task-index>}"

if [ ! -f "$PLAN_PATH" ]; then
  echo "ERROR: Plan file not found: $PLAN_PATH" >&2
  exit 1
fi

# 提取 "## Task N" 到下一个 "## Task" 之间的内容（不含下一个标题行）
awk "
  /^## Task ${TASK_INDEX}[^0-9]/ { found=1 }
  found && /^## Task [0-9]/ && !/^## Task ${TASK_INDEX}[^0-9]/ { exit }
  found { print }
" "$PLAN_PATH"
