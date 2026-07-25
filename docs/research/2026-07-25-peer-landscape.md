# Peer landscape research (2026-07-25)

**Method:** Firecrawl CLI search + scrape (outputs under `.firecrawl/`, gitignored).  
**Purpose:** Inform v0.1 UX/architecture decisions for Terminus Terminal Core.  
**Binding?** No — approved design remains SoT. This note only records absorb / skip.

## Closest peer: Dispatcher

- **Repo:** historically `bobrenjc93/dispatcher` / community builds as “Dispatcher” terminal multiplexer  
- **Stack overlap:** Tauri + React + xterm.js (same broad shape as Terminus)  
- **Product:** project sidebar, tabs, split panes, activity status dots, local PTY, optional tmux `-CC` bridge, per-tab notes, cross-platform packages  

### Absorb for Terminus v0.1

- Project-first sidebar + tab organization  
- Activity status dots (active / unseen / idle family of signals)  
- Split-pane mental model with resizable dividers  
- Local-first PTY feel (“new tab should feel immediate”)  

### Explicitly skip for v0.1

- tmux `-CC` integration and tmux-aware shortcuts  
- Restart-safe tmux placeholders / reconnect flows  
- Per-tab notes as a product surface  
- Multi-OS distribution polish as a release goal (we only need local macOS bundle)  

## Tabby (tabby.sh)

- Electron-era modern terminal: local + SSH + serial, profiles, theming, nested panes, activity notifications, remembers tabs/splits, highly configurable shortcuts  
- **Absorb:** profiles UX vocabulary; configurable multi-chord shortcuts; “remembers layout” expectation (we implement via SQLite, not Tabby’s model)  
- **Skip:** SSH/serial/SFTP, quake mode, encrypted secret container, plugin marketplace, Electron stack  

## Wave Terminal (waveterm.dev)

- AI-native terminal workspace: widgets, file preview/editor, web browser, remote managers  
- **Absorb:** almost nothing for v0.1 scope (workspace organization metaphor is already covered)  
- **Skip:** AI pivot, embedded browser/editor, remote file workflows — conflicts with approved exclusions  

## Termul / other Tauri terminal experiments

- Search surfaced “Termul” and various Tauri+React local workspace experiments  
- Treat as inspiration-only; no dependency  
- portable-pty multi-session lessons exist in WezTerm discussions — relevant to SessionManager design, not product scope  

## Tauri v2

- Official project structure docs confirm standard `src` + `src-tauri` layout, capabilities model, Channel recommendation for high-throughput ordered events  
- Aligns with approved architecture (typed commands + Channels for PTY output)  

## Synthesis vs Terminus design

| Concern | Peer signal | Terminus v0.1 decision |
|---------|-------------|-------------------------|
| Shell | Tauri+React+xterm is proven | Keep |
| Organization | Project → tabs/panes | Project → Workspace → n-ary panes |
| Activity | Dots / unread common | active/quiet/unread + OSC attention |
| Persistence | Remember tabs | SQLite SoT + protected recovery |
| Remote | Common in peers | **Out of scope** |
| AI | Wave differentiates | **Out of scope** |
| tmux bridge | Dispatcher differentiates | **Out of scope** |
| Runtime stability | Hard part in all peers | Registry separates runtime from React mounts |

## Raw artifacts

| File | Content |
|------|---------|
| `.firecrawl/search-*.json` | Search result sets |
| `.firecrawl/dispatcher-readme.md` | Dispatcher README extract |
| `.firecrawl/tabby-home.md` | Tabby marketing/features |
| `.firecrawl/wave-home.md` | Wave marketing |
| `.firecrawl/tauri-v2-structure.md` | Tauri project structure |

Do not commit `.firecrawl/`. Promote only durable conclusions here.
