PNPM ?= pnpm
CARGO ?= cargo
TAURI_MANIFEST := src-tauri/Cargo.toml
APP_NAME := Terminus
APP_IDENTIFIER := com.yasinkose.terminus
APPLICATIONS_DIR ?= /Applications
TAURI_APP_BUNDLE := src-tauri/target/release/bundle/macos/$(APP_NAME).app
INSTALLED_APP := $(APPLICATIONS_DIR)/$(APP_NAME).app

.DEFAULT_GOAL := help

.PHONY: help install dev tauri-dev check test test-watch build tauri-build \
	tauri-build-ci verify verify-v01 verify-v02 audit audit-rust \
	audit-frontend cargo-check cargo-test cargo-clippy cargo-fmt \
	format-check ci app-build app-install app-update app-open

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

# Build only the native macOS .app bundle
app-build:
	@test "$$(uname -s)" = "Darwin" || { echo "app-build requires macOS" >&2; exit 1; }
	$(PNPM) tauri build --bundles app

# Install the previously built bundle into /Applications
app-install:
	@test "$$(uname -s)" = "Darwin" || { echo "app-install requires macOS" >&2; exit 1; }
	@test -d "$(TAURI_APP_BUNDLE)" || { echo "Missing bundle: $(TAURI_APP_BUNDLE). Run 'make app-build' first." >&2; exit 1; }
	@test "$$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' '$(TAURI_APP_BUNDLE)/Contents/Info.plist')" = "$(APP_IDENTIFIER)" || { echo "Unexpected application bundle identifier" >&2; exit 1; }
	@if pgrep -x "$(APP_NAME)" >/dev/null; then \
		echo "$(APP_NAME) is running. Quit it before updating the application." >&2; \
		exit 1; \
	fi
	@set -eu; \
	stage="$$(mktemp -d '$(APPLICATIONS_DIR)/.$(APP_NAME).install.XXXXXX')"; \
	trap 'rm -rf "$$stage"' EXIT HUP INT TERM; \
	/usr/bin/ditto "$(TAURI_APP_BUNDLE)" "$$stage/$(APP_NAME).app"; \
	if ! /usr/bin/codesign --verify --deep --strict "$$stage/$(APP_NAME).app" 2>/dev/null; then \
		/usr/bin/codesign --force --deep --sign - "$$stage/$(APP_NAME).app"; \
	fi; \
	/usr/bin/codesign --verify --deep --strict "$$stage/$(APP_NAME).app"; \
	if test -e "$(INSTALLED_APP)"; then \
		mv "$(INSTALLED_APP)" "$$stage/previous.app"; \
	fi; \
	if mv "$$stage/$(APP_NAME).app" "$(INSTALLED_APP)"; then \
		rm -rf "$$stage/previous.app"; \
	else \
		rm -rf "$(INSTALLED_APP)"; \
		if test -e "$$stage/previous.app"; then \
			mv "$$stage/previous.app" "$(INSTALLED_APP)"; \
		fi; \
		exit 1; \
	fi
	@echo "Installed $(INSTALLED_APP)"

# Build and replace the installed macOS application
app-update: app-build app-install

# Open the installed macOS application
app-open:
	@open "$(INSTALLED_APP)"

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
