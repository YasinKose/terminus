# Phase 1: Foundation (Tauri + Svelte)

## Overview
Establish the high-performance Tauri application structure. Configure the Rust backend and Svelte frontend with Bits UI to create a polished, native-feeling application shell.

## Goals
1.  Initialize Tauri v2 project with Svelte 5 and TypeScript.
2.  Setup Tailwind CSS and Bits UI for headless, customizable components.
3.  Build the custom, frameless UI shell and Sidebar.

## Tasks

### Architecture & Setup
- [ ] Initialize Tauri project (`npm create tauri-app@latest`).
- [ ] Configure `tauri.conf.json` for frameless window (`decorations: false`, `transparent: true`).
- [ ] Setup Svelte 5 with Vite.
- [ ] Install and configure Tailwind CSS.
- [ ] Install Bits UI (`npm install bits-ui`).
- [ ] Setup `lucide-svelte` for icons.

### Native Shell UI
- [ ] Create `TitleBar` component with window controls (minimize, maximize, close) using Tauri APIs.
- [ ] Implement "Drag Regions" (`data-tauri-drag-region`) for window movement.
- [ ] Apply global styles for native feel (system fonts, no text selection, custom scrollbars).

### Sidebar & Navigation
- [ ] Create `Sidebar` component using Bits UI primitives (collapsible sections).
- [ ] Define Project Store (Svelte Rune/Store) to manage list of projects.
- [ ] Create `ProjectItem` component with active/inactive states.
- [ ] Implement smooth transitions for sidebar collapse/expand.

## Deliverables
*   A running Tauri app with Svelte 5.
*   Frameless window with working custom title bar.
*   Sidebar with dummy project list, styled with Bits UI + Tailwind.
