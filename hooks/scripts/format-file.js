#!/usr/bin/env node
// format-file.js — PostToolUse(Write|Edit) hook
// 检测写入文件扩展名，调用对应 formatter（静默执行）
const { execSync } = require('child_process');
const path = require('path');

const FORMATTERS = {
  '.js': 'npx prettier --write',
  '.ts': 'npx prettier --write',
  '.tsx': 'npx prettier --write',
  '.jsx': 'npx prettier --write',
  '.json': 'npx prettier --write',
  '.css': 'npx prettier --write',
  '.scss': 'npx prettier --write',
  '.html': 'npx prettier --write',
  '.py': 'ruff format',
  '.go': 'gofmt -w',
  '.rs': 'rustfmt',
};

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const filePath = data.tool_input?.file_path || data.tool_input?.path || '';
    if (!filePath) return;

    const ext = path.extname(filePath).toLowerCase();
    const formatter = FORMATTERS[ext];
    if (!formatter) return;

    // Check if formatter is available, run silently
    try {
      execSync(`${formatter} "${filePath}"`, { stdio: 'ignore', timeout: 30000 });
    } catch (e) {
      // Formatter not available or failed — silent, don't block
    }
  } catch (e) {
    // Parse error — ignore
  }
});
