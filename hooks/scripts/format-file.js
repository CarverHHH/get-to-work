#!/usr/bin/env node
// format-file.js — PostToolUse(Write|Edit) hook
// 检测写入文件扩展名，调用对应 formatter（静默执行）
const { execSync } = require("child_process");
const path = require("path");

const FORMATTERS = {
  ".js": "npx --no-install prettier --write",
  ".ts": "npx --no-install prettier --write",
  ".tsx": "npx --no-install prettier --write",
  ".jsx": "npx --no-install prettier --write",
  ".json": "npx --no-install prettier --write",
  ".css": "npx --no-install prettier --write",
  ".scss": "npx --no-install prettier --write",
  ".html": "npx --no-install prettier --write",
  ".py": "ruff format",
  ".go": "gofmt -w",
  ".rs": "rustfmt",
};

let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  input += chunk;
});
process.stdin.on("end", () => {
  try {
    const data = JSON.parse(input);
    const filePath = data.tool_input?.file_path || data.tool_input?.path || "";
    if (!filePath) return;

    const ext = path.extname(filePath).toLowerCase();
    const formatter = FORMATTERS[ext];
    if (!formatter) return;

    // --no-install prevents npx from fetching packages over the network
    // (which could hang up to the timeout). Failures are ignored silently.
    try {
      execSync(`${formatter} "${filePath}"`, {
        stdio: "ignore",
        timeout: 10000,
      });
    } catch (e) {
      // Formatter not available or failed — silent, don't block
    }
  } catch (e) {
    // Parse error — ignore
  }
});
