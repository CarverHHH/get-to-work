#!/bin/bash
# review-package.sh — 生成 task 的 diff 供 reviewer 审查
# 用法: review-package.sh [base-ref]
# 输出: files changed + full diff
#
# 示例: bash workflow-plugin/scripts/review-package.sh HEAD~1

set -euo pipefail

BASE_REF="${1:-HEAD}"

echo "=== FILES CHANGED ==="
git diff --name-only "$BASE_REF" 2>/dev/null || git diff --name-only --cached
echo ""
echo "=== STATS ==="
git diff --stat "$BASE_REF" 2>/dev/null || git diff --stat --cached
echo ""
echo "=== DIFF ==="
git diff "$BASE_REF" 2>/dev/null || git diff --cached
