#!/usr/bin/env node
// session-start.js — SessionStart hook
// 检测中断的工作流并提示恢复；新 session 时重置工具调用计数器
const fs = require('fs');
const path = require('path');

const statePath = path.join(process.cwd(), 'workflow-plugin', 'state.json');
const counterPath = path.resolve(__dirname, '../../.tool-call-counter.json');

try {
  // Parse stdin to determine session source
  let stdinData = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk => { stdinData += chunk; });
  process.stdin.on('end', () => {
    let source = 'startup';
    try {
      const hookInput = JSON.parse(stdinData);
      source = hookInput.source || 'startup';
    } catch { /* not JSON — treat as startup */ }

    // Reset tool call counter on new sessions (not resume/compact/clear)
    if (source === 'startup') {
      try {
        if (fs.existsSync(counterPath)) fs.unlinkSync(counterPath);
      } catch { /* silent */ }
    }

    // Detect interrupted workflow
    if (!fs.existsSync(statePath)) return;
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    const { current_state, mode, plan, stop_reason } = state;

    if (!current_state || current_state === 'IDLE' || current_state === 'DONE') return;

    const taskInfo = plan && plan.total_tasks > 0
      ? ` task ${(plan.current_task_index || 0) + 1}/${plan.total_tasks}`
      : '';
    const modeInfo = mode ? ` [${mode}]` : '';

    if (current_state === 'STOPPED' && stop_reason) {
      console.log(
        `⚠️ 检测到阻塞的工作流：STATE=STOPPED\n` +
        `   阻塞原因：${stop_reason}\n` +
        `   请先解决阻塞问题，再运行 /to-work --resume 恢复。`
      );
    } else {
      console.log(
        `检测到中断的工作流：STATE=${current_state}${modeInfo}${taskInfo}，使用 /to-work --resume 恢复`
      );
    }
  });
} catch (e) {
  // Silent fail — don't block session start
}
