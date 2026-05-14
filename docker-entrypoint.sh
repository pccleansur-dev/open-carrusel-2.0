#!/bin/sh
set -e

# Claude CLI needs to write back auth tokens and session data.
# The host files are mounted read-only at /run/claude-host/* so we copy them
# to writable locations that Claude expects (/root/.claude.json, /root/.claude/).

if [ -f /run/claude-host/claude.json ]; then
  cp /run/claude-host/claude.json /root/.claude.json
fi

if [ -d /run/claude-host/claude-dir ]; then
  cp -a /run/claude-host/claude-dir/. /root/.claude/
fi

# Codex auth — if OPENAI_API_KEY is set, use API key auth (avoids OAuth token expiry)
# Otherwise copy the host auth files (chatgpt OAuth mode)
mkdir -p /root/.codex
if [ -n "$OPENAI_API_KEY" ]; then
  printf '{"auth_mode":"apikey","OPENAI_API_KEY":"%s","tokens":null}\n' "$OPENAI_API_KEY" \
    > /root/.codex/auth.json
  if [ -f /run/codex-host/codex-dir/config.toml ]; then
    cp /run/codex-host/codex-dir/config.toml /root/.codex/config.toml
  fi
else
  if [ -f /run/codex-host/codex-dir/auth.json ]; then
    cp /run/codex-host/codex-dir/auth.json /root/.codex/auth.json
  fi
  if [ -f /run/codex-host/codex-dir/config.toml ]; then
    cp /run/codex-host/codex-dir/config.toml /root/.codex/config.toml
  fi
fi

exec "$@"
