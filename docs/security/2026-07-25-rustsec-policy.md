# Terminus v0.1 RustSec policy

Date: 2026-07-25
Scope: `src-tauri/Cargo.lock`, shipped target `aarch64-apple-darwin`

## Failing conditions

- Any RustSec vulnerability.
- Any yanked crate.
- Any unsound advisory except the target-excluded `RUSTSEC-2024-0429`.
- Any previously excluded advisory that becomes reachable from the macOS target graph.

## Target-excluded exception

- `RUSTSEC-2024-0429` (`glib`): unsound iterator implementation. Current
  `cargo tree --target aarch64-apple-darwin -i glib` has no path; the crate
  is present only through non-macOS GTK dependencies in the lockfile.

## Accepted unmaintained transitives

- GTK3 family: `RUSTSEC-2024-0411` through `RUSTSEC-2024-0420` as reported
  by cargo-audit; absent from the macOS target graph.
- `RUSTSEC-2024-0370` (`proc-macro-error`); absent from the macOS target graph.
- `RUSTSEC-2025-0075`, `RUSTSEC-2025-0080`, `RUSTSEC-2025-0081`,
  `RUSTSEC-2025-0098`, and `RUSTSEC-2025-0100` (`unic-*`); reachable through
  `urlpattern -> tauri-utils`, unmaintained rather than vulnerable/unsound.

## Review triggers

- Every Tauri dependency update.
- Every new cargo-audit advisory database result.
- Any change to the macOS target dependency paths above.
- Every release candidate security review.

## Executable gate

```bash
pnpm audit:rust
```

See `scripts/audit-rust.sh`.
