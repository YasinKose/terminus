PNPM ?= pnpm
CARGO ?= cargo
TAURI_MANIFEST := src-tauri/Cargo.toml

.DEFAULT_GOAL := help

.PHONY: help install dev tauri-dev check test test-watch build tauri-build \
	tauri-build-ci verify verify-v01 verify-v02 audit audit-rust \
	audit-frontend cargo-check cargo-test cargo-clippy cargo-fmt \
	format-check ci

# List the available development commands
help:
	@awk 'BEGIN {FS = ":.*"} /^# / {description = substr($$0, 3); next} /^[a-zA-Z0-9][a-zA-Z0-9_.-]*:/ {printf "  %-20s %s\n", $$1, description; description = ""}' $(MAKEFILE_LIST)

# Install JavaScript dependencies from the lockfile
install:
	$(PNPM) install --frozen-lockfile

# Start the Vite frontend development server
dev:
	$(PNPM) dev

# Start the complete Tauri application in development mode
tauri-dev:
	$(PNPM) tauri:dev

# Run the TypeScript type-check
check:
	$(PNPM) check

# Run the frontend test suite once
test:
	$(PNPM) test:run

# Run frontend tests in watch mode
test-watch:
	$(PNPM) test

# Build the production frontend
build:
	$(PNPM) build

# Build platform-native Tauri bundles
tauri-build:
	$(PNPM) tauri:build

# Build the optimized Tauri binary without packaging
tauri-build-ci:
	$(PNPM) tauri build --no-bundle --ci

# Run the current v0.2 release gate
verify: verify-v02

# Run the frozen v0.1 compatibility gate
verify-v01:
	$(PNPM) verify:v01

# Run the complete v0.2 verification gate
verify-v02:
	$(PNPM) verify:v02

# Run all dependency security audits
audit: audit-rust audit-frontend

# Audit Rust dependencies against RustSec
audit-rust:
	$(PNPM) audit:rust

# Audit production JavaScript dependencies
audit-frontend:
	$(PNPM) audit --prod

# Type-check the Rust desktop application
cargo-check:
	$(CARGO) check --manifest-path $(TAURI_MANIFEST)

# Run all Rust tests
cargo-test:
	$(CARGO) test --manifest-path $(TAURI_MANIFEST) -- --test-threads=1

# Run Clippy with warnings treated as errors
cargo-clippy:
	$(CARGO) clippy --manifest-path $(TAURI_MANIFEST) --all-targets --all-features -- -D warnings

# Format Rust sources
cargo-fmt:
	$(CARGO) fmt --manifest-path $(TAURI_MANIFEST)

# Check Rust formatting without changing files
format-check:
	$(CARGO) fmt --manifest-path $(TAURI_MANIFEST) -- --check

# Run verification, audits, linting, and a package-free desktop build
ci: verify-v02 audit cargo-clippy tauri-build-ci
