#!/usr/bin/env bash
# Resolve a real node binary, bypassing the nvm lazy-load node() shell function.
# Claude Code's shell snapshot captures node() but drops its dependency
# _nvm_lazy_load, so bare node recurses into itself until FUNCNEST crashes.
# This wrapper finds the binary directly and execs it.

nb="${NODE_BIN:-}"

# 1. A real node binary already on PATH (bash non-interactive has no node() fn).
if [ -z "$nb" ]; then
  if command -v node >/dev/null 2>&1; then
    cand="$(command -v node)"
    case "$cand" in /*) nb="$cand" ;; esac
  fi
fi

# 2. Scan nvm-managed versions (covers lazy-load users with no node on PATH).
if [ -z "$nb" ] && [ -n "${NVM_DIR:-}" ]; then
  nb="$(ls -1d "$NVM_DIR"/versions/node/*/bin/node 2>/dev/null | sort -V | tail -1)"
fi

# 3. Common Homebrew locations (Intel + Apple Silicon).
if [ -z "$nb" ]; then
  for p in /opt/homebrew/bin/node /usr/local/bin/node; do
    [ -x "$p" ] && { nb="$p"; break; }
  done
fi

if [ -z "$nb" ]; then
  echo "run-node.sh: node binary not found (checked PATH, NVM_DIR=${NVM_DIR:-<unset>}, Homebrew)" >&2
  exit 1
fi

exec "$nb" "$@"
