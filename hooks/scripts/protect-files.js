#!/usr/bin/env node
// protect-files.js — PreToolUse(Write|Edit) hook
// 检查目标路径是否匹配保护规则
const PROTECTED = [
  /\.env($|\.)/,
  /\.(key|pem|cert|p12)$/,
  /^\.git\//,
  /id_rsa/,
  /\.ssh\//,
  /\.secrets/
];

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const filePath = data.tool_input?.file_path || data.tool_input?.path || '';

    for (const pattern of PROTECTED) {
      if (pattern.test(filePath)) {
        console.log(JSON.stringify({
          hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            permissionDecision: 'deny',
            permissionDecisionReason: `保护文件不可修改: ${filePath} (匹配规则: ${pattern.source})`
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
