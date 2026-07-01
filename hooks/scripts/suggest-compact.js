#!/usr/bin/env node
/**
 * suggest-compact.js
 * PostToolUse hook (matcher: Bash|Write|Edit)
 * Tracks tool call count; suggests context compaction when ≥ 40 calls.
 */

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.resolve(process.cwd(), ".get-to-work");
const COUNTER_FILE = path.join(DATA_DIR, ".tool-call-counter.json");
const THRESHOLD = 40;

function readCounter() {
  try {
    const data = JSON.parse(fs.readFileSync(COUNTER_FILE, "utf8"));
    return data.count || 0;
  } catch {
    return 0;
  }
}

function writeCounter(count) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(
    COUNTER_FILE,
    JSON.stringify({ count, updated_at: new Date().toISOString() }),
  );
}

function main() {
  const count = readCounter() + 1;
  writeCounter(count);

  if (count >= THRESHOLD && count % 5 === 0) {
    // Inject into model context via stdout so the orchestrator's compact
    // trigger (orchestrator.md §7.1) actually receives the signal.
    const result = {
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: `[suggest-compact] 工具调用已达 ${count} 次，建议压缩上下文（/compact 或走 orchestrator §7 压缩恢复协议）。`,
      },
    };
    process.stdout.write(JSON.stringify(result));
  }
}

main();
