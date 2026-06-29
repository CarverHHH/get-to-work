#!/usr/bin/env node
/**
 * observe-patterns.js
 * PostToolUse hook (matcher: Write|Edit|Bash)
 * Appends tool call records to workflow-plugin/memory/observations.jsonl
 */

const fs = require('fs');
const path = require('path');

const OBSERVATIONS_FILE = path.resolve(__dirname, '../../workflow-plugin/memory/observations.jsonl');
const MAX_LINES = 500;
const KEEP_LINES = 200;

function rotate() {
  try {
    if (!fs.existsSync(OBSERVATIONS_FILE)) return;
    const content = fs.readFileSync(OBSERVATIONS_FILE, 'utf8');
    const lines = content.split('\n').filter(l => l.length > 0);
    if (lines.length <= MAX_LINES) return;

    // Archive older portion
    const archiveFile = OBSERVATIONS_FILE + '.old';
    const oldLines = lines.slice(0, lines.length - KEEP_LINES);
    fs.appendFileSync(archiveFile, oldLines.join('\n') + '\n');

    // Keep only the most recent KEEP_LINES
    fs.writeFileSync(OBSERVATIONS_FILE, lines.slice(-KEEP_LINES).join('\n') + '\n');
  } catch {
    // Silent — rotation is best-effort
  }
}

function main() {
  let input = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk => { input += chunk; });
  process.stdin.on('end', () => {
    try {
      const toolUse = JSON.parse(input);
      const record = {
        timestamp: new Date().toISOString(),
        tool: toolUse.tool_name || toolUse.tool || 'unknown',
        file: toolUse.tool_input?.file_path || toolUse.tool_input?.path || null,
        command: toolUse.tool_input?.command ? toolUse.tool_input.command.substring(0, 120) : null
      };

      // Ensure directory exists
      const dir = path.dirname(OBSERVATIONS_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.appendFileSync(OBSERVATIONS_FILE, JSON.stringify(record) + '\n');

      // Rotate if exceeded threshold
      rotate();
    } catch {
      // Silent fail — observation is best-effort
    }
  });
}

main();
