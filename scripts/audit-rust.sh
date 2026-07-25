#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

cargo audit \
  --file src-tauri/Cargo.lock \
  --deny unsound \
  --deny yanked \
  --ignore RUSTSEC-2024-0429

tree_out="$(
  cargo tree --manifest-path src-tauri/Cargo.toml \
    --target aarch64-apple-darwin -i glib 2>&1 || true
)"

if printf '%s\n' "$tree_out" | grep -vE 'nothing to print|To find dependencies|warning:|^$'; then
  echo "glib became reachable on the macOS target" >&2
  printf '%s\n' "$tree_out" >&2
  exit 1
fi
