#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

./scripts/verify-v01.sh

cargo test --manifest-path src-tauri/Cargo.toml 'tmux::' --lib -- --test-threads=1
cargo test --manifest-path src-tauri/Cargo.toml 'git::' --lib -- --test-threads=1
