# Phase 1: Foundation (Updated)

## Overview
Establish the high-performance Electron application structure using **React Server Components (RSC)** architecture. Configure the build pipeline for **Cross-Platform** support (Mac, Windows, Linux) and implement the "Native App" shell UI using pure HeroUI components.

## Goals
1.  Set up Electron with React 19 RSC support (using Vite/Waku or similar RSC-compatible bundler).
2.  Ensure `node-pty` and native modules compile correctly for all platforms.
3.  Build the custom, frameless UI shell and Sidebar using only HeroUI atoms.

## Tasks

### Architecture & Build (RSC + Cross-Platform)
- [x] Initialize project with React 19 RSC architecture.
- [x] Configure IPC to act as the "Server Action" bridge securely.
- [ ] Setup `electron-builder` with multi-platform configuration (dmg, nsis, AppImage).
- [ ] Configure `electron-rebuild` hook to handle `node-pty` compilation automatically after install.
- [ ] Configure ESLint/Prettier for RSC patterns (separating client/server components).

### Native Shell UI
- [ ] Implement `BrowserWindow` with `frame: false` and platform-specific window controls.
- [ ] Apply global CSS: `user-select: none`, custom scrollbars, system font integration.
- [ ] Implement "Drag Regions" carefully to allow window movement without blocking clicks.

### Custom Sidebar (HeroUI)
- [ ] Design `Sidebar` component using HeroUI `Accordion` (for collapsible projects) and `Listbox`.
- [ ] Create `ProjectItem` component with status badges and active states.
- [ ] Implement smooth collapse/expand animations (using Framer Motion if HeroUI built-in isn't enough).
- [ ] Ensure the Sidebar is accessible via keyboard navigation.

## Deliverables
*   A running Electron app with React Server Components architecture.
*   Cross-platform build scripts confirmed working (or ready for CI).
*   A polished, native-feeling Sidebar built with HeroUI.

