#!/bin/sh
set -e

if [ -f /run/claude-host/claude.json ]; then
  cp /run/claude-host/claude.json /root/.claude.json
fi

if [ -d /run/claude-host/claude-dir ]; then
  mkdir -p /root/.claude
  cp -a /run/claude-host/claude-dir/. /root/.claude/
fi

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

mkdir -p /app/data /app/public/uploads /app/posts

exec "$@"
