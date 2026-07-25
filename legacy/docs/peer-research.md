# Peer Research Synthesis

> **Date:** 2026-07-18  
> **Method:** Firecrawl search + local clones under `.peer-research/` (gitignored)  
> **Use:** Intake into PRD — patterns only, not product clones  

---

## 1. Research goal

Find open-source tools with overlapping concerns:

* Project-centric terminal multiplexers  
* Tauri + web terminal (xterm + PTY)  
* Light Git / task adjacency  
* Split pane UX  

Then extract **what Terminus should absorb** vs **what to refuse**.

---

## 2. Landscape map

```text
Pure emulator          Tab multiplexer         Project workbench      Agent IDE
     │                       │                        │                    │
 Alacritty              Tabby / Wave              dispatcher            panes /
                        (Electron)                termul                2code…
                                                   maiterm
                                                   ★ Terminus (here)
```

Terminus sits in **project workbench**: more than a pure emulator, less than an agent IDE.

---

## 3. Peer dossier

### 3.1 dispatcher (`bobrenjc93/dispatcher`) — **closest peer**

| Field | Detail |
|-------|--------|
| Stack | **Tauri + React + xterm + portable-pty** (same destination stack as us) |
| Strengths | Projects, splits, notes, activity dots, PTY pool thinking, tmux-CC research |
| Absorb | Activity indicators; notes/scratch pattern; PTY pooling ideas; React layout reference |
| Skip | Blind feature parity; any scope beyond our MoSCoW |

**Why it matters:** Validates Tauri+React terminal product shape.

### 3.2 termul

| Field | Detail |
|-------|--------|
| Stack | Tauri + React |
| Strengths | Project/workspace-first information architecture |
| Absorb | IA: project → workspace navigation clarity |
| Skip | Unrelated modules |

### 3.3 maiterm

| Field | Detail |
|-------|--------|
| Stack | Tauri + **Svelte 5** + xterm + portable-pty (like current Terminus) |
| Strengths | Backend scrollback via alacritty_terminal + SQLite ideas |
| Absorb | Scrollback persistence as **Could**; PTY reliability patterns |
| Skip | Staying on Svelte (we migrate to React) |

### 3.4 panes / 2code / cc-pane class

| Field | Detail |
|-------|--------|
| Focus | Agent + git + tasks workbenches |
| Absorb | Composition of side tools next to terminal; pane kinds |
| Skip | **Agent runtime product**; multi-agent orchestration |

### 3.5 Tabby (historically “Terminus”)

| Field | Detail |
|-------|--------|
| Stack | Electron |
| Strengths | Mature terminal tabs, profiles, plugins |
| Absorb | UX polish inspiration only |
| Skip | Electron; name confusion — brand carefully |
| Risk | Historical name collision with “Terminus” |

### 3.6 Wave

| Field | Detail |
|-------|--------|
| Stack | Electron, AI-oriented terminal |
| Absorb | Command blocks / modern terminal UX ideas (selective) |
| Skip | Electron; AI-first pivot |

### 3.7 Alacritty

| Field | Detail |
|-------|--------|
| Stack | Rust GPU terminal |
| Absorb | Performance expectations; nothing to embed wholesale |
| Skip | Rebuilding emulator core |

### 3.8 sandboxed.sh

| Field | Detail |
|-------|--------|
| Focus | Cloud agent runtime |
| Absorb | — |
| Skip | **Out of scope** for Terminus desktop command center |

---

## 4. Cross-cutting lessons

### 4.1 Product

1. **Project-first** navigation beats “random terminal windows”.  
2. **Splits + persistence** are table stakes.  
3. **Activity dots** reduce anxiety (“is something running?”).  
4. **Notes** next to terminals appear often — cheap Should.  
5. Agent features are a **different product**.  

### 4.2 Technical

1. **Tauri + xterm + portable-pty** is a proven trio (dispatcher, maiterm, us).  
2. **React** is a proven FE for this class (dispatcher, termul).  
3. Shelling out for everything (git, tools) scales poorly → **git2** decision reinforced.  
4. Backend scrollback (maiterm) is optional sophistication — not MVP blocker.  
5. Multi-window git (our experiment) adds complexity; peers often keep **in-pane**.  

### 4.3 UX

1. Dense, dark, keyboard-first.  
2. Command palette common.  
3. Zen/focus mode common in workbench apps.  

---

## 5. Intake → PRD mapping

| Learning | PRD destination |
|----------|-----------------|
| Stay Tauri, move React | Stack lock |
| Activity dots | Should Have |
| Notes/scratch | Should Have |
| Slim git in pane | Must Git (simplified) |
| No agent IDE | Won't Have |
| PTY pool / tmux-CC | Could Have |
| Scrollback DB | Could Have |
| Brand vs Tabby name | Positioning section |

---

## 6. What we explicitly will not copy

* Electron architecture  
* Full plugin marketplaces (v1)  
* Cloud-first agent sandboxes  
* Full IDE editors  
* GitHub-centric social coding clients as core  

---

## 7. Local research artifacts

* Clones: `.peer-research/*` (gitignored)  
* Do not commit peer trees into main repo  
* Re-clone if needed for implementation reference  

---

## 8. Follow-up research (optional)

* Deep-read dispatcher PTY session manager when implementing R4  
* Compare Radix usage patterns in dispatcher UI  
* Revisit maiterm scrollback only if users demand persistent history  

---

## 9. Changelog

| Date | Change |
|------|--------|
| 2026-07-18 | Initial synthesis from Firecrawl + clone review |
