#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

if command -v rg >/dev/null 2>&1; then
  search() { rg -n "$@"; }
  search_pcre() { rg -nUP "$@"; }
else
  search() { grep -REn --exclude-dir=node_modules --exclude-dir=target -- "$@"; }
  search_pcre() { grep -REnE --exclude-dir=node_modules --exclude-dir=target -- "$@"; }
fi

pnpm test:run
pnpm check
pnpm build
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo test --manifest-path src-tauri/Cargo.toml -- --test-threads=1
cargo check --manifest-path src-tauri/Cargo.toml
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings

if search "legacy/" \
  package.json tsconfig.json vite.config.ts vitest.config.ts \
  src src-tauri/Cargo.toml src-tauri/tauri.conf.json 2>/dev/null; then
  echo "legacy/ entered the shipped graph" >&2
  exit 1
fi

if search "shell:|fs:|allow-execute" \
  src-tauri/capabilities src-tauri/tauri.conf.json 2>/dev/null; then
  echo "broad Tauri capability detected" >&2
  exit 1
fi

if search_pcre 'catch[[:space:]]*\{[[:space:]]*\}' src 2>/dev/null; then
  echo "empty catch block detected" >&2
  exit 1
fi
