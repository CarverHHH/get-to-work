#!/usr/bin/env node
/**
 * pre-compact.js
 * PreCompact hook (matcher: .*)
 * Saves state.json snapshot + git status info before context compaction.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const STATE_FILE = path.resolve(__dirname, '../../workflow-plugin/state.json');
const SNAPSHOT_FILE = path.resolve(__dirname, '../../.pre-compact-state.json');

function safeExec(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', timeout: 5000 }).trim();
  } catch {
    return null;
  }
}

function main() {
  const snapshot = {
    saved_at: new Date().toISOString(),
    state_json: null,
    git: {
      branch: null,
      status: null,
      stash_list: null,
      uncommitted_count: 0
    }
  };

  // Save state.json
  try {
    snapshot.state_json = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    // no state to save
  }

  // Git info
  snapshot.git.branch = safeExec('git rev-parse --abbrev-ref HEAD');
  snapshot.git.status = safeExec('git status --short');
  snapshot.git.stash_list = safeExec('git stash list');

  if (snapshot.git.status) {
    snapshot.git.uncommitted_count = snapshot.git.status.split('\n').filter(l => l.trim()).length;
  }

  fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(snapshot, null, 2));
}

main();
