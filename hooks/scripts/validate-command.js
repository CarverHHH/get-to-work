#!/usr/bin/env node
// validate-command.js — PreToolUse(Bash) hook
// 正则匹配危险命令，block 或 allow
const DANGEROUS = [
  /rm\s+(-rf?|--recursive)\s+[\/~]/,
  /git\s+push\s+.*--force/,
  /git\s+reset\s+--hard/,
  /DROP\s+(TABLE|DATABASE)/i,
  /truncate\s+table/i,
  /:\s*>\s*\//,
  /mkfs\./,
  /dd\s+if=/,
  /sudo\s+rm/,
  /chmod\s+-R\s+777/
];

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const command = data.tool_input?.command || data.command || '';

    for (const pattern of DANGEROUS) {
      if (pattern.test(command)) {
        console.log(JSON.stringify({
          hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            permissionDecision: 'deny',
            permissionDecisionReason: `危险命令被阻止: ${command.substring(0, 80)}... (匹配规则: ${pattern.source})`
          }
        }));
        return;
      }
    }
    // Allow
  } catch (e) {
    // Parse error — allow by default
  }
});
