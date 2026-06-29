#!/usr/bin/env node
/**
 * suggest-compact.js
 * PostToolUse hook (matcher: .*)
 * Tracks tool call count; suggests context compaction when ≥ 40 calls.
 */

const fs = require('fs');
const path = require('path');

const COUNTER_FILE = path.resolve(__dirname, '../../.tool-call-counter.json');
const THRESHOLD = 40;

function readCounter() {
  try {
    const data = JSON.parse(fs.readFileSync(COUNTER_FILE, 'utf8'));
    return data.count || 0;
  } catch {
    return 0;
  }
}

function writeCounter(count) {
  fs.writeFileSync(COUNTER_FILE, JSON.stringify({ count, updated_at: new Date().toISOString() }));
}

function main() {
  const count = readCounter() + 1;
  writeCounter(count);

  if (count >= THRESHOLD && count % 5 === 0) {
    // Log to stderr for visibility; no stdout JSON needed for PostToolUse
    // Claude Code handles compaction internally based on context window usage
    process.stderr.write(`[suggest-compact] 工具调用已达 ${count} 次，建议压缩上下文。\n`);
  }
}

main();
