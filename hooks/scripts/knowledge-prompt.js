#!/usr/bin/env node
/**
 * knowledge-prompt.js
 * Stop hook (matcher: .*)
 * When workflow had fix_count > 0, suggest recording a Lesson.
 */

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.resolve(process.cwd(), ".get-to-work");
const STATE_FILE = path.join(DATA_DIR, "state.json");

function main() {
  try {
    const state = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
    const fixCount = (state.execution && state.execution.fix_count) || 0;
    const currentState = state.current_state || "IDLE";

    if (
      fixCount > 0 &&
      ["DONE", "KNOWLEDGE_CAPTURE", "STOPPED"].includes(currentState)
    ) {
      const result = {
        hookSpecificOutput: {
          hookEventName: "Stop",
          additionalContext: `本次工作流有 ${fixCount} 次修复尝试（踩坑经历），建议记录 Lesson。使用 knowledge-capture skill 或在下次 /to-work 中自动触发。`,
        },
      };
      process.stdout.write(JSON.stringify(result));
    }
  } catch {
    // state.json not found or invalid — silent
  }
}

main();
