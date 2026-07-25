# Terminus V2 — Electron + React Rewrite Plan

## Overview
**Goal**: Rewrite Terminus from scratch, migrating from Tauri + Svelte to Electron + React 19 + TypeScript. Build a Warp-like modern terminal application with project workspaces, AI integration, Git workbench, Blocks (command segmentation), and snippets.

**Stack**: Electron + React 19 + TypeScript + electron-vite + pnpm workspaces + Zustand + SQLite (better-sqlite3) + shadcn/ui + Tailwind CSS

**Architecture**: Monorepo with 6 packages
**Timeline**: ~12 weeks (7 phases)
**Team**: Internal only (closed source)

## Workspace Strategy

**Location**: Yeni proje mevcut repo içinde `terminus-v2/` alt klasöründe oluşturulacak.

```
terminus/                          # Mevcut repo kökü (git root)
├── src/                           # Eski Tauri+Svelte kodu (referans olarak korunur)
├── src-tauri/                     # Eski Rust backend (referans olarak korunur)
├── docs/                          # Mevcut dökümanlar
├── .sisyphus/                     # Plan dosyaları
└── terminus-v2/                   # ✅ YENİ PROJE BURAYA KURULACAK
    ├── package.json               # Monorepo root
    ├── pnpm-workspace.yaml
    ├── electron.vite.config.ts
    ├── packages/                  # 6 paket
    ├── shell-integration/
    └── resources/
```

**Kurallar:**
- `terminus-v2/` içindeki tüm işlemler mevcut kodu etkilemez
- Eski Tauri+Svelte kodu referans olarak kullanılabilir (özellikle `src-tauri/src/makefile.rs`, `src/lib/stores/`, `src/lib/components/`)
- Geçiş tamamlandığında eski kod silinip `terminus-v2/` içeriği repo köküne taşınır
- **Bu plandaki tüm dosya yolları `terminus-v2/` köküne göredir** (örn. `packages/shared/src/...` = `terminus-v2/packages/shared/src/...`)

> ⚠️ Mevcut repodaki `package.json`, `vite.config.ts`, `tsconfig.json` vb. dosyalara DOKUNULMAZ.
> Eski koddan referans alınacak dosyalar:
> - `src-tauri/src/makefile.rs` → Makefile parser mantığı (TODO-6.2'de TypeScript'e çevrilecek)
> - `src/lib/stores/snippetStore.ts` → Snippet store yapısı (TODO-6.1'de Zustand'a çevrilecek)
> - `src-tauri/src/git.rs` → Git operasyonları (TODO-5.2'de simple-git'e çevrilecek)
> - `src/lib/components/` → 16 Svelte bileşeni (React bileşenlerine dönüştürülecek)

## Key Design Decisions

| Decision | Choice | Rationale |
|:---|:---|:---|
| Framework | Electron (not Tauri) | 145K+ stars ecosystem, mature node-pty, more reference code |
| Frontend | React 19 + TypeScript | Industry standard, React 19 Compiler, largest talent pool |
| Build tool | electron-vite | Recommended over Webpack for 2025, fast HMR |
| Monorepo | pnpm workspaces (6 packages) | Clean separation without Nx/Turborepo overhead |
| State | Zustand | Lightweight, no boilerplate, perfect for Electron renderer |
| Blocks | Multi-xterm (Warp-style) | One active xterm + frozen completed blocks as `<pre>` |
| Storage | SQLite (better-sqlite3) | Sync API, no ORM overhead, FTS5 for search |
| AI | Multi-provider BYOK | OpenAI, Claude, Ollama via backend proxy + Vercel AI SDK |
| UI | shadcn/ui + Tailwind CSS | Accessible, customizable, copy-paste components |
| Plugin system | NONE | Closed source, internal team only |
| Git profiles | Settings JSON + auto-detect | NOT a DB table; stored as JSON in settings, auto-detect from .gitconfig includeIf |
| Makefile targets | On-the-fly discovery | NOT stored in DB; scanned at project open, "save as snippet" if user wants |

## Monorepo Structure

```
terminus-v2/
├── package.json                    # Root workspace config
├── pnpm-workspace.yaml
├── electron.vite.config.ts
├── packages/
│   ├── shared/                     # @terminus/shared
│   │   ├── package.json
│   │   └── src/
│   │       ├── types/              # All TypeScript interfaces/types
│   │       │   ├── ipc.ts          # IPC channel names & payload types
│   │       │   ├── terminal.ts     # Terminal, Block, Session types
│   │       │   ├── ai.ts           # AI provider, conversation, message types
│   │       │   ├── git.ts          # Git status, diff, branch types
│   │       │   ├── project.ts      # Project, workspace types
│   │       │   └── snippet.ts      # Snippet types
│   │       ├── constants/          # Shared constants (IPC channels, defaults)
│   │       └── utils/              # Pure utility functions
│   │
│   ├── electron/                   # @terminus/electron (Main Process)
│   │   ├── package.json
│   │   └── src/
│   │       ├── main.ts             # Electron app entry, window creation
│   │       ├── preload.ts          # Typed ContextBridge (window.terminus.*)
│   │       ├── services/
│   │       │   ├── pty.service.ts          # node-pty spawn, write, resize, kill
│   │       │   ├── db.service.ts           # better-sqlite3 wrapper, migrations
│   │       │   ├── ai-proxy.service.ts     # Provider registry, API key management
│   │       │   ├── git.service.ts          # simple-git wrapper
│   │       │   ├── fs.service.ts           # File system operations
│   │       │   ├── makefile.service.ts     # Makefile parser (rewrite from Rust)
│   │       │   ├── secret.service.ts       # keytar wrapper for OS keychain
│   │       │   └── shell-integration.service.ts  # Install shell scripts
│   │       ├── ipc/
│   │       │   ├── pty.handler.ts          # PTY IPC handlers
│   │       │   ├── db.handler.ts           # DB IPC handlers
│   │       │   ├── ai.handler.ts           # AI IPC handlers
│   │       │   ├── git.handler.ts          # Git IPC handlers
│   │       │   └── fs.handler.ts           # FS IPC handlers
│   │       └── migrations/
│   │           ├── 001_initial.sql
│   │           └── ...
│   │
│   ├── core/                       # @terminus/core (UI Shell)
│   │   ├── package.json
│   │   └── src/
│   │       ├── App.tsx             # Root component
│   │       ├── layouts/
│   │       │   ├── MainLayout.tsx          # Sidebar + Main + Bottom Panel
│   │       │   └── SplitContainer.tsx      # Recursive split pane component
│   │       ├── components/
│   │       │   ├── Sidebar.tsx             # Project list, navigation
│   │       │   ├── TabBar.tsx              # Terminal tabs
│   │       │   ├── CommandPalette.tsx       # Cmd+K unified search
│   │       │   ├── Settings/               # Settings panel components
│   │       │   └── ui/                     # shadcn/ui components
│   │       ├── stores/
│   │       │   ├── projectStore.ts         # Zustand: projects, active project
│   │       │   ├── uiStore.ts              # Zustand: panels, theme, layout
│   │       │   └── settingsStore.ts        # Zustand: app settings
│   │       └── hooks/
│   │           ├── useIPC.ts               # Typed IPC invoke/send hooks
│   │           └── useTheme.ts
│   │
│   ├── terminal/                   # @terminus/terminal
│   │   ├── package.json
│   │   └── src/
│   │       ├── TerminalPanel.tsx           # Terminal container with blocks
│   │       ├── components/
│   │       │   ├── XTermInstance.tsx        # xterm.js wrapper component
│   │       │   ├── Block.tsx               # Single block (prompt + output)
│   │       │   ├── BlockList.tsx           # Scrollable list of completed blocks
│   │       │   ├── ActivePrompt.tsx        # Current live xterm prompt
│   │       │   └── BlockActions.tsx        # Copy, re-run, collapse actions
│   │       ├── engine/
│   │       │   ├── block-parser.ts         # OSC 133 parser (A/B/C/D)
│   │       │   ├── block-state-machine.ts  # PROMPT → EXECUTING → COMPLETED
│   │       │   └── xterm-manager.ts        # Max 2 live xterm instances
│   │       ├── stores/
│   │       │   └── terminalStore.ts        # Zustand: sessions, blocks, active terminal
│   │       └── shell-integration/
│   │           ├── bash.sh                 # precmd/preexec with OSC 133
│   │           ├── zsh.sh                  # precmd/preexec with OSC 133
│   │           └── fish.fish              # fish_prompt/fish_preexec with OSC 133
│   │
│   ├── ai/                         # @terminus/ai
│   │   ├── package.json
│   │   └── src/
│   │       ├── AIChatPanel.tsx            # AI chat panel container
│   │       ├── components/
│   │       │   ├── MessageList.tsx         # Chat message list
│   │       │   ├── MessageInput.tsx        # Input with context attachments
│   │       │   ├── CodeBlock.tsx           # Code block with "Run" button
│   │       │   ├── ProviderSelector.tsx    # Switch AI provider
│   │       │   └── ModeSelector.tsx        # Switch AI mode/profile
│   │       ├── providers/
│   │       │   ├── registry.ts            # ProviderRegistry (Wave-style)
│   │       │   ├── openai.ts              # OpenAI provider
│   │       │   ├── anthropic.ts           # Claude provider
│   │       │   └── ollama.ts              # Ollama provider
│   │       ├── stores/
│   │       │   └── aiStore.ts             # Zustand: conversations, active chat, modes
│   │       └── hooks/
│   │           └── useAIChat.ts           # Vercel AI SDK useChat wrapper
│   │
│   └── git/                        # @terminus/git
│       ├── package.json
│       └── src/
│           ├── GitPanel.tsx               # Git workbench container
│           ├── components/
│           │   ├── StatusView.tsx          # Changed files list
│           │   ├── DiffViewer.tsx          # Side-by-side diff
│           │   ├── CommitForm.tsx          # Stage + commit + push
│           │   ├── BranchManager.tsx       # Branch list, create, switch, merge
│           │   └── ProfileSwitcher.tsx     # Git identity switcher
│           ├── stores/
│           │   └── gitStore.ts            # Zustand: status, branches, diff
│           └── hooks/
│               └── useGit.ts              # Git operations hook
│
├── shell-integration/              # Standalone shell scripts (installed to ~/.terminus/)
│   ├── bash-integration.sh
│   ├── zsh-integration.sh
│   └── fish-integration.fish
│
└── resources/                      # Electron app resources (icons, etc.)
```

## IPC Architecture

### Bridge Shape (window.terminus.*)

```typescript
// preload.ts — Typed ContextBridge
interface TerminusBridge {
  pty: {
    spawn(config: PtySpawnConfig): Promise<string>;      // Returns sessionId
    write(sessionId: string, data: string): void;         // send (fast, one-way)
    resize(sessionId: string, cols: number, rows: number): void;
    kill(sessionId: string): Promise<void>;
    onData(sessionId: string, callback: (data: string) => void): () => void;  // Returns unsubscribe
    onExit(sessionId: string, callback: (code: number) => void): () => void;
  };
  db: {
    query<T>(sql: string, params?: any[]): Promise<T[]>;
    run(sql: string, params?: any[]): Promise<{ changes: number; lastInsertRowid: number }>;
    get<T>(sql: string, params?: any[]): Promise<T | null>;
  };
  ai: {
    stream(config: AIStreamConfig): void;                 // send (starts streaming)
    cancelStream(conversationId: string): void;
    onChunk(callback: (chunk: AIChunk) => void): () => void;
    onStreamEnd(callback: (result: AIStreamResult) => void): () => void;
  };
  git: {
    status(projectPath: string): Promise<GitStatus>;
    diff(projectPath: string, filePath?: string): Promise<string>;
    commit(projectPath: string, message: string, files: string[]): Promise<void>;
    checkout(projectPath: string, branch: string): Promise<void>;
    log(projectPath: string, limit?: number): Promise<GitLogEntry[]>;
    branches(projectPath: string): Promise<GitBranch[]>;
    createBranch(projectPath: string, name: string): Promise<void>;
    push(projectPath: string): Promise<void>;
    pull(projectPath: string): Promise<void>;
  };
  fs: {
    readDir(dirPath: string): Promise<FileEntry[]>;
    readFile(filePath: string): Promise<string>;
    watchDir(dirPath: string, callback: (event: FSEvent) => void): () => void;
  };
  app: {
    getVersion(): Promise<string>;
    getPlatform(): string;
    onDeepLink(callback: (url: string) => void): () => void;
  };
}
```

### Data Flow Patterns

1. **PTY Data**: `Main → send('pty:data') → Renderer` (fast, one-way, no await)
2. **Commands**: `Renderer → invoke('pty:spawn') → Main → Promise<result>` (request-response)
3. **AI Streaming**: `Renderer → send('ai:stream') → Main → [chunks via send('ai:chunk')] → send('ai:end')`
4. **Backpressure**: Tabby-style `ackData` — Main pauses PTY if Renderer hasn't acknowledged previous batch

## SQLite Schema (Final)

```sql
-- Projects
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  path TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_opened_at TEXT,
  settings_json TEXT DEFAULT '{}'
);

-- Terminal Sessions
CREATE TABLE terminal_sessions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT,
  shell TEXT NOT NULL,                    -- /bin/zsh, /bin/bash, etc.
  cwd TEXT NOT NULL,
  env_json TEXT DEFAULT '{}',
  tab_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  closed_at TEXT
);

-- Blocks (command segments)
CREATE TABLE blocks (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES terminal_sessions(id) ON DELETE CASCADE,
  command TEXT,                            -- The command that was typed
  output TEXT,                            -- Serialized output text
  exit_code INTEGER,
  cwd TEXT,                               -- Working directory at time of execution
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at TEXT,
  duration_ms INTEGER
);

-- AI Conversations
CREATE TABLE ai_conversations (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  title TEXT,
  provider TEXT NOT NULL,                 -- 'openai', 'anthropic', 'ollama'
  model TEXT NOT NULL,                    -- 'gpt-4o', 'claude-3.5-sonnet', etc.
  mode TEXT,                              -- User-defined AI mode name
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- AI Messages
CREATE TABLE ai_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  context_json TEXT,                      -- Attached context (terminal buffer, file, git diff)
  tokens_used INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Snippets (also used for user-saved tasks)
CREATE TABLE snippets (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,  -- NULL = global
  title TEXT NOT NULL,
  content TEXT NOT NULL,                  -- The snippet/command text
  description TEXT,
  language TEXT,                          -- Language scope (bash, python, etc.)
  tags TEXT DEFAULT '[]',                 -- JSON array of tags
  type TEXT NOT NULL DEFAULT 'snippet' CHECK (type IN ('snippet', 'command')),
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Settings (key-value with JSON values)
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,                    -- JSON-encoded value
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Default settings include:
-- 'git.profiles' → JSON array: [{name, email, signingKey?}]
-- 'ai.providers' → JSON object: {openai: {enabled, models}, anthropic: {...}, ollama: {...}}
-- 'ai.modes' → JSON array: [{name, provider, model, systemPrompt?}]
-- 'terminal.defaultShell' → string
-- 'terminal.fontSize' → number
-- 'theme.mode' → 'dark' | 'light'
-- 'theme.colorScheme' → string

-- Full-Text Search indices
CREATE VIRTUAL TABLE blocks_fts USING fts5(command, output, content=blocks, content_rowid=rowid);
CREATE VIRTUAL TABLE snippets_fts USING fts5(title, content, description, content=snippets, content_rowid=rowid);

-- Triggers to keep FTS in sync
CREATE TRIGGER blocks_ai AFTER INSERT ON blocks BEGIN
  INSERT INTO blocks_fts(rowid, command, output) VALUES (NEW.rowid, NEW.command, NEW.output);
END;
CREATE TRIGGER blocks_ad AFTER DELETE ON blocks BEGIN
  INSERT INTO blocks_fts(blocks_fts, rowid, command, output) VALUES ('delete', OLD.rowid, OLD.command, OLD.output);
END;
CREATE TRIGGER blocks_au AFTER UPDATE ON blocks BEGIN
  INSERT INTO blocks_fts(blocks_fts, rowid, command, output) VALUES ('delete', OLD.rowid, OLD.command, OLD.output);
  INSERT INTO blocks_fts(rowid, command, output) VALUES (NEW.rowid, NEW.command, NEW.output);
END;

CREATE TRIGGER snippets_ai AFTER INSERT ON snippets BEGIN
  INSERT INTO snippets_fts(rowid, title, content, description) VALUES (NEW.rowid, NEW.title, NEW.content, NEW.description);
END;
CREATE TRIGGER snippets_ad AFTER DELETE ON snippets BEGIN
  INSERT INTO snippets_fts(snippets_fts, rowid, title, content, description) VALUES ('delete', OLD.rowid, OLD.title, OLD.content, OLD.description);
END;
CREATE TRIGGER snippets_au AFTER UPDATE ON snippets BEGIN
  INSERT INTO snippets_fts(snippets_fts, rowid, title, content, description) VALUES ('delete', OLD.rowid, OLD.title, OLD.content, OLD.description);
  INSERT INTO snippets_fts(rowid, title, content, description) VALUES (NEW.rowid, NEW.title, NEW.content, NEW.description);
END;

-- Indexes
CREATE INDEX idx_terminal_sessions_project ON terminal_sessions(project_id);
CREATE INDEX idx_blocks_session ON blocks(session_id);
CREATE INDEX idx_ai_conversations_project ON ai_conversations(project_id);
CREATE INDEX idx_ai_messages_conversation ON ai_messages(conversation_id);
CREATE INDEX idx_snippets_project ON snippets(project_id);
CREATE INDEX idx_snippets_type ON snippets(type);
```

## Blocks Engine Design

### OSC 133 Protocol
Shell integration scripts emit escape sequences:
- `\e]133;A\a` — Prompt start
- `\e]133;B\a` — Prompt end (command start)
- `\e]133;C\a` — Command output start
- `\e]133;D;{exit_code}\a` — Command finished

### Block State Machine
```
PROMPT → (user presses Enter) → EXECUTING → (OSC 133;D received) → COMPLETED
```

### Memory Optimization
- Max 2 live xterm instances: 1 active prompt + 1 executing command
- Completed blocks serialize to `<pre>` text after 5 seconds
- Blocks beyond viewport are virtualized (react-virtuoso or react-window)

### Shell Integration Scripts
Auto-installed to `~/.terminus/shell-integration/` on first launch.

**zsh.sh example:**
```bash
__terminus_precmd() {
  local exit_code=$?
  printf '\e]133;D;%d\a' "$exit_code"  # Command finished
  printf '\e]133;A\a'                    # Prompt start
}
__terminus_preexec() {
  printf '\e]133;B\a'                    # Prompt end
  printf '\e]133;C\a'                    # Output start
}
precmd_functions+=(__terminus_precmd)
preexec_functions+=(__terminus_preexec)
```

## AI Integration Design

### Provider Registry (Main Process)
```typescript
interface AIProvider {
  id: string;                    // 'openai', 'anthropic', 'ollama'
  name: string;
  models: string[];
  stream(config: StreamConfig): AsyncIterable<string>;
  validateKey(key: string): Promise<boolean>;
}

class ProviderRegistry {
  private providers: Map<string, AIProvider>;
  register(provider: AIProvider): void;
  get(id: string): AIProvider;
  listAvailable(): AIProviderInfo[];
}
```

### Secret Management
- API keys stored in OS keychain via `keytar`
- NEVER sent to Renderer process
- Main process proxies all API calls

### Context Awareness
- Terminal buffer scraping (last N lines or active block output)
- File attachment (user drags file or uses @ mention)
- Git diff feeding (current changes as context)
- System prompt includes: OS, shell, cwd, project info

### Mode System
User-defined AI profiles stored in settings:
```json
{
  "ai.modes": [
    { "name": "Code Review", "provider": "anthropic", "model": "claude-3.5-sonnet", "systemPrompt": "You are a code reviewer..." },
    { "name": "Quick Q&A", "provider": "openai", "model": "gpt-4o-mini" },
    { "name": "Offline", "provider": "ollama", "model": "llama3" }
  ]
}
```

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
**Goal**: Empty shell that opens, renders, and has the IPC bridge working.

#### TODO-1.1: Scaffold monorepo with electron-vite
- **What**: Mevcut repo içinde `terminus-v2/` klasörü oluştur. İçinde `npm create electron-vite@latest -- --template react-ts` çalıştır, ardından 6-paketli pnpm monorepo yapısına dönüştür.
- **Files**: `terminus-v2/package.json`, `terminus-v2/pnpm-workspace.yaml`, `terminus-v2/electron.vite.config.ts`, tüm `terminus-v2/packages/*/package.json`
- **Pattern**: Follow electron-vite official React-TS template structure. `mkdir terminus-v2 && cd terminus-v2 && npm create electron-vite@latest . -- --template react-ts`
- **Critical**: Mevcut repo kökündeki `package.json` ve diğer dosyalara DOKUNMA. Tüm scaffold `terminus-v2/` içinde olacak.
- **Acceptance**: `cd terminus-v2 && pnpm install` başarılı, `pnpm dev` boş Electron penceresi açar
- **QA**: Hot-reload renderer'da çalışıyor mu? Main process değişiklikte restart oluyor mu? Mevcut repo kökü etkilenmedi mi?

#### TODO-1.2: Create @terminus/shared package
- **What**: TypeScript types, IPC channel constants, utility functions
- **Files**: `packages/shared/src/types/*.ts`, `packages/shared/src/constants/ipc-channels.ts`
- **Pattern**: Pure TypeScript, no runtime dependencies, exported as ESM
- **Acceptance**: Other packages can `import { PtySpawnConfig } from '@terminus/shared'`
- **QA**: `tsc --noEmit` passes with strict mode

#### TODO-1.3: Create @terminus/electron main process shell
- **What**: Main process with typed ContextBridge (preload.ts), window creation, IPC handler registration
- **Files**: `packages/electron/src/main.ts`, `packages/electron/src/preload.ts`, `packages/electron/src/ipc/*.handler.ts`
- **Pattern**: Typed ContextBridge exposing `window.terminus.*` namespace. Each IPC domain (pty, db, ai, git, fs) gets its own handler file.
- **Acceptance**: `window.terminus` is available in renderer with full TypeScript types
- **QA**: Call `window.terminus.app.getVersion()` from renderer DevTools console, verify it returns correct version

#### TODO-1.4: Create @terminus/core UI shell
- **What**: React app with MainLayout (sidebar + main area + bottom panel), Zustand stores, shadcn/ui setup, Tailwind CSS
- **Files**: `packages/core/src/App.tsx`, `packages/core/src/layouts/MainLayout.tsx`, `packages/core/src/stores/*.ts`, `packages/core/src/components/ui/*`
- **Pattern**: shadcn/ui with Tailwind CSS. Zustand stores with `create()`. Layout uses CSS Grid for sidebar/main/bottom split.
- **Dependencies**: `react@19`, `zustand`, `tailwindcss`, `@radix-ui/*`, `lucide-react`
- **Acceptance**: App renders with sidebar showing "Projects" header, empty main area, collapsible bottom panel
- **QA**: Verify dark theme applies, sidebar collapses/expands, responsive to window resize

#### TODO-1.5: SQLite setup with migrations
- **What**: `better-sqlite3` integration in main process, migration runner, full initial schema
- **Files**: `packages/electron/src/services/db.service.ts`, `packages/electron/src/migrations/001_initial.sql`
- **Pattern**: Sync API. Migration runner reads `.sql` files from migrations/ dir, applies in order, tracks applied migrations in a `_migrations` table.
- **Schema**: Full schema as defined in "SQLite Schema" section above
- **Acceptance**: On app start, SQLite DB is created at `~/.terminus/terminus.db`, all tables exist
- **QA**: Insert a test project, verify it persists across app restart. Run `PRAGMA table_info(projects)` to verify columns.

### Phase 2: Terminal Engine (Week 3-4)
**Goal**: A working terminal that spawns shells, handles I/O, and supports tabs/splits.

#### TODO-2.1: Basic terminal with xterm.js + node-pty
- **What**: Single terminal instance that spawns user's default shell, sends input, displays output
- **Files**: `packages/terminal/src/components/XTermInstance.tsx`, `packages/electron/src/services/pty.service.ts`, `packages/electron/src/ipc/pty.handler.ts`
- **Dependencies**: `xterm`, `@xterm/addon-fit`, `@xterm/addon-webgl`, `node-pty`
- **Pattern**: Renderer creates xterm.js instance → calls `window.terminus.pty.spawn()` → gets sessionId → subscribes to `onData` → pipes to xterm.write(). User keystrokes → `window.terminus.pty.write(sessionId, data)`.
- **Acceptance**: Open app → terminal appears → type `ls` → see output → type `echo hello` → see "hello"
- **QA**: Test with zsh and bash. Test `Ctrl+C` kills running process. Test unicode characters render correctly.

#### TODO-2.2: Tab system for multiple terminals
- **What**: Tab bar showing terminal sessions, create new tab, close tab, switch tabs
- **Files**: `packages/core/src/components/TabBar.tsx`, `packages/terminal/src/stores/terminalStore.ts`
- **Pattern**: Zustand store tracks `sessions: Map<id, Session>`, `activeSessionId`. TabBar renders from store. Each tab has its own xterm instance (lazy-mounted, hidden tabs unmount xterm but keep PTY alive).
- **Acceptance**: Click "+" to create new terminal tab, each has independent shell session, closing tab kills PTY
- **QA**: Rapidly create 10 tabs, verify no memory leak. Switch between tabs, verify output doesn't bleed between sessions.

#### TODO-2.3: Split panes (vertical/horizontal)
- **What**: Split current terminal pane vertically or horizontally, recursive splits
- **Files**: `packages/core/src/layouts/SplitContainer.tsx`
- **Pattern**: Recursive `SplitContainer` component (like Tabby's `SplitTabComponent`). Tree data structure: `SplitNode = { type: 'terminal', sessionId } | { type: 'split', direction: 'h'|'v', children: [SplitNode, SplitNode], ratio: number }`. Draggable divider for resize.
- **Dependencies**: No external lib — custom implementation with CSS flexbox + drag handlers
- **Acceptance**: `Cmd+D` splits vertical, `Cmd+Shift+D` splits horizontal, each pane has independent terminal, draggable divider
- **QA**: Split 4 ways, verify all panes receive independent I/O. Close one pane, verify others remain. Verify resize handles work smoothly.

#### TODO-2.4: PTY backpressure (Tabby-style)
- **What**: Flow control to prevent memory explosion when PTY outputs faster than renderer can process
- **Files**: Modify `packages/electron/src/services/pty.service.ts` and `packages/terminal/src/components/XTermInstance.tsx`
- **Pattern**: Tabby's `ackData` pattern. Main sends data chunk → pauses PTY. Renderer processes chunk → sends ack back. Main resumes PTY. Configurable buffer size (default: 65536 bytes).
- **Acceptance**: `cat /dev/urandom | head -c 100000000` doesn't crash app or consume >500MB RAM
- **QA**: Run `yes | head -1000000`, verify smooth scrolling without freeze. Verify ack mechanism works with `console.log` timing.

#### TODO-2.5: Terminal session persistence
- **What**: Save/restore terminal sessions per project in SQLite
- **Files**: Modify `packages/terminal/src/stores/terminalStore.ts`, `packages/electron/src/ipc/db.handler.ts`
- **Pattern**: On tab create → insert into `terminal_sessions`. On tab close → set `closed_at`. On project open → restore sessions where `closed_at IS NULL`. Don't restore PTY process (respawn shell), but restore tab order and name.
- **Acceptance**: Open project → create 3 tabs with custom names → close app → reopen → same 3 tabs appear (with fresh shells)
- **QA**: Verify tab order persists. Verify closed sessions don't reappear. Verify session count doesn't grow unbounded.

### Phase 3: Blocks Engine (Week 5-6)
**Goal**: Warp-style command segmentation.

#### TODO-3.1: Shell integration scripts
- **What**: Create bash/zsh/fish scripts that emit OSC 133 escape sequences, auto-install to `~/.terminus/`
- **Files**: `shell-integration/bash-integration.sh`, `shell-integration/zsh-integration.sh`, `shell-integration/fish-integration.fish`, `packages/electron/src/services/shell-integration.service.ts`
- **Pattern**: Scripts use precmd/preexec hooks. Service copies scripts to `~/.terminus/shell-integration/` and adds `source` line to user's shell rc file (with user permission). Detection: check if `TERMINUS_SHELL_INTEGRATION` env var is set.
- **Acceptance**: Open terminal in Terminus → shell integration auto-loads → OSC 133 sequences appear in raw PTY output
- **QA**: Test with zsh, bash, and fish. Verify scripts don't break existing user shell config. Verify cleanup on uninstall.

#### TODO-3.2: OSC 133 parser
- **What**: Parse OSC 133 escape sequences from PTY output to detect block boundaries
- **Files**: `packages/terminal/src/engine/block-parser.ts`
- **Pattern**: Use `xterm.js` `parser.registerOscHandler(133, ...)`. Parse A (prompt start), B (prompt end / command start), C (output start), D (command finished + exit code). Emit events: `onPromptStart`, `onCommandStart`, `onOutputStart`, `onCommandFinished(exitCode)`.
- **Acceptance**: Type command → parser emits correct sequence of events → events carry correct metadata (exit code, timing)
- **QA**: Test with commands that output OSC sequences themselves (e.g., `printf '\e]133;A\a'`). Verify parser doesn't get confused.

#### TODO-3.3: Block state machine
- **What**: Manage block lifecycle: PROMPT → EXECUTING → COMPLETED
- **Files**: `packages/terminal/src/engine/block-state-machine.ts`
- **Pattern**: State machine with transitions triggered by OSC 133 events. Each block: `{ id, state, command, output, exitCode, cwd, startedAt, finishedAt }`. New block created on `onPromptStart`. Command captured on `onCommandStart`. Output accumulated on data between C and D. Block finalized on `onCommandFinished`.
- **Acceptance**: Each command creates a distinct block with correct metadata
- **QA**: Test rapid commands (`ls && pwd && date`). Test empty commands (just pressing Enter). Test Ctrl+C during execution.

#### TODO-3.4: Multi-xterm block rendering
- **What**: Active prompt = live xterm, completed blocks = frozen `<pre>` elements
- **Files**: `packages/terminal/src/TerminalPanel.tsx`, `packages/terminal/src/components/Block.tsx`, `packages/terminal/src/components/BlockList.tsx`, `packages/terminal/src/components/ActivePrompt.tsx`, `packages/terminal/src/engine/xterm-manager.ts`
- **Pattern**: XTermManager maintains max 2 live xterm instances. When block completes: wait 5 seconds → serialize xterm buffer to ANSI text → render as styled `<pre>` → destroy xterm instance. Active prompt always has live xterm. Use `react-virtuoso` for block list to handle 1000+ blocks.
- **Dependencies**: `react-virtuoso` (or `@tanstack/react-virtual`)
- **Acceptance**: Type 5 commands → see 5 visual blocks stacked → only bottom block has live cursor → completed blocks are static text
- **QA**: Verify completed blocks preserve colors (ANSI). Verify scrolling through 100+ blocks is smooth. Verify memory doesn't grow with block count.

#### TODO-3.5: Block actions
- **What**: Action buttons on each block: copy output, re-run command, collapse/expand, search within
- **Files**: `packages/terminal/src/components/BlockActions.tsx`, modify `Block.tsx`
- **Pattern**: Hover or click block → action bar appears. Copy → clipboard API. Re-run → pipe command to active terminal. Collapse → toggle output visibility. Search → highlight matches within block output.
- **Acceptance**: Hover block → see action buttons → copy works → re-run executes command in current terminal
- **QA**: Test copy with multiline output. Test re-run with commands containing special characters. Test collapse state persists during scroll.

#### TODO-3.6: Block persistence
- **What**: Save completed blocks to SQLite with FTS5 search
- **Files**: Modify `packages/terminal/src/engine/block-state-machine.ts`, add block persistence logic
- **Pattern**: On block COMPLETED → insert into `blocks` table (async, don't block UI). FTS5 index auto-updates via triggers. Provide search API: `window.terminus.db.query("SELECT * FROM blocks_fts WHERE blocks_fts MATCH ?", [searchTerm])`.
- **Acceptance**: Search across all past commands and outputs using `Cmd+Shift+F`
- **QA**: Insert 10000 blocks, verify search returns results in <100ms. Verify FTS handles special characters.

### Phase 4: AI Integration (Week 7-8)
**Goal**: Chat with AI, feed terminal context, run suggested commands.

#### TODO-4.1: AI chat panel UI
- **What**: Side panel with message list, input box, streaming text display
- **Files**: `packages/ai/src/AIChatPanel.tsx`, `packages/ai/src/components/MessageList.tsx`, `packages/ai/src/components/MessageInput.tsx`
- **Pattern**: Panel slides in from right side. Messages rendered with Markdown support (`react-markdown`). User messages show attached context badges. Streaming text appends character by character.
- **Dependencies**: `react-markdown`, `remark-gfm`, `rehype-highlight`
- **Acceptance**: Open AI panel → see empty chat → type message → see it appear as user message → loading indicator shows
- **QA**: Verify panel doesn't affect terminal performance. Verify markdown renders correctly (code blocks, lists, links).

#### TODO-4.2: Provider proxy in main process
- **What**: Backend proxy with ProviderRegistry, keytar secret storage, streaming support
- **Files**: `packages/electron/src/services/ai-proxy.service.ts`, `packages/electron/src/services/secret.service.ts`, `packages/electron/src/ipc/ai.handler.ts`
- **Dependencies**: `openai`, `@anthropic-ai/sdk`, `keytar`
- **Pattern**: ProviderRegistry holds provider instances. On `ai:stream` IPC → get provider → call API → stream chunks back via `send('ai:chunk')`. API keys stored/retrieved via keytar (OS keychain). Never expose keys to renderer.
- **Acceptance**: Configure OpenAI key → send message → receive streaming response → key is in OS keychain (not in any file)
- **QA**: Test with invalid API key (graceful error). Test with network disconnection mid-stream. Test keytar on macOS Keychain.

#### TODO-4.3: Vercel AI SDK integration
- **What**: Use `@ai-sdk/react` `useChat` hook adapted for Electron IPC (not HTTP)
- **Files**: `packages/ai/src/hooks/useAIChat.ts`
- **Dependencies**: `@ai-sdk/react`, `ai`
- **Pattern**: Custom `useChat` wrapper that routes through IPC instead of fetch. Maps IPC events (ai:chunk, ai:end, ai:error) to Vercel AI SDK's stream protocol. Maintains conversation state in Zustand.
- **Acceptance**: Full streaming chat works through IPC bridge with proper state management
- **QA**: Test stream cancellation. Test concurrent streams (should be blocked — one at a time). Test reconnection after error.

#### TODO-4.4: Context awareness
- **What**: Feed terminal buffer, file content, and git diff as AI context
- **Files**: Modify `packages/ai/src/components/MessageInput.tsx`, add context collection logic
- **Pattern**: "Attach context" button in input. Options: (1) Current terminal — scrape last N lines from active block. (2) File — file picker dialog. (3) Git diff — run `git diff` and attach. Context serialized as structured JSON in `ai_messages.context_json`.
- **Acceptance**: Click "attach terminal" → last 50 lines auto-attached → AI response references terminal content
- **QA**: Test with empty terminal (no crash). Test with very long output (truncation). Test file attachment with binary file (should reject).

#### TODO-4.5: Code block "Run" button
- **What**: AI-generated code blocks have a "Run" button that executes command in active terminal
- **Files**: `packages/ai/src/components/CodeBlock.tsx`
- **Pattern**: Detect fenced code blocks in AI response. Add "Run" button to blocks with `bash`/`sh`/`zsh` language tag. On click → `window.terminus.pty.write(activeSessionId, command + '\n')`. Confirmation dialog for destructive commands (rm, sudo).
- **Acceptance**: AI suggests `npm install express` → click Run → command executes in terminal
- **QA**: Test with multi-line commands. Test with dangerous commands (verify confirmation). Test when no terminal is active.

#### TODO-4.6: AI mode system
- **What**: User-defined AI profiles (provider + model + system prompt)
- **Files**: `packages/ai/src/components/ModeSelector.tsx`, modify `packages/ai/src/stores/aiStore.ts`
- **Pattern**: Modes stored in settings (`ai.modes` key). UI dropdown to switch modes. Each mode sets provider, model, and optional system prompt. Default modes: "General" (GPT-4o), "Code Review" (Claude), "Offline" (Ollama).
- **Acceptance**: Create custom mode → select it → AI uses configured provider/model → mode persists across restart
- **QA**: Test switching modes mid-conversation. Test mode with unavailable provider (graceful fallback).

#### TODO-4.7: AI conversation persistence
- **What**: Save conversations and messages to SQLite
- **Files**: Modify `packages/ai/src/stores/aiStore.ts`
- **Pattern**: On new conversation → insert into `ai_conversations`. On each message → insert into `ai_messages`. On app start → load recent conversations from DB. Lazy-load messages on conversation select.
- **Acceptance**: Chat with AI → close app → reopen → conversation history is there → click to continue
- **QA**: Test with 100+ conversations (lazy loading works). Test delete conversation (cascade deletes messages).

### Phase 5: Git Workbench (Week 9-10)
**Goal**: Visual Git management without leaving the terminal.

#### TODO-5.1: Git panel UI
- **What**: Side panel showing file status, staged/unstaged areas
- **Files**: `packages/git/src/GitPanel.tsx`, `packages/git/src/components/StatusView.tsx`
- **Pattern**: Panel shows: changed files grouped by status (modified, added, deleted, untracked). Click file → show diff. Checkbox to stage/unstage individual files. Badge count on sidebar icon.
- **Acceptance**: Open project with git changes → see file list with status icons → click file → see diff
- **QA**: Test with 100+ changed files (virtualized list). Test with binary files. Test with uninitialized git repo (graceful message).

#### TODO-5.2: simple-git integration
- **What**: Backend service wrapping simple-git for all Git operations
- **Files**: `packages/electron/src/services/git.service.ts`, `packages/electron/src/ipc/git.handler.ts`
- **Dependencies**: `simple-git`
- **Pattern**: Each IPC handler calls simple-git methods. Status → `git.status()`. Diff → `git.diff()`. Commit → `git.add(files).commit(message)`. All operations scoped to project path.
- **Acceptance**: All Git IPC endpoints work correctly from renderer
- **QA**: Test with large repos (performance). Test with merge conflicts (error handling). Test with detached HEAD state.

#### TODO-5.3: Git identity switcher
- **What**: Auto-detect profiles from `.gitconfig` includeIf, switch via `git config --local`
- **Files**: `packages/git/src/components/ProfileSwitcher.tsx`
- **Pattern**: On project open → parse user's `~/.gitconfig` for `includeIf` directives → extract identities. Also read profiles from `settings.git.profiles`. UI dropdown to switch. On switch → run `git config --local user.name/email`.
- **Acceptance**: Detect existing git profiles → switch profile → verify `git config user.name` returns new name
- **QA**: Test with no profiles configured. Test with includeIf patterns. Test profile switch persistence.

#### TODO-5.4: Commit workflow
- **What**: Stage files → write message → commit → push
- **Files**: `packages/git/src/components/CommitForm.tsx`
- **Pattern**: CommitForm with: file checkboxes (stage), message textarea (with conventional commit prefix suggestions), "Commit" button, "Commit & Push" button. After commit → refresh status view.
- **Acceptance**: Stage 3 files → write "feat: add login" → commit → see clean status → push succeeds
- **QA**: Test empty commit message (blocked). Test commit with no staged files (blocked). Test push with no remote (error message).

#### TODO-5.5: Branch management
- **What**: Create, switch, delete, merge branches visually
- **Files**: `packages/git/src/components/BranchManager.tsx`
- **Pattern**: Dropdown showing current branch + all branches. Create new branch from current. Switch branch (with stash prompt if dirty). Delete branch (with confirmation). Merge branch into current.
- **Acceptance**: See branch list → create "feature/x" → switch to it → switch back → delete it
- **QA**: Test branch switch with uncommitted changes (stash dialog). Test delete current branch (blocked). Test merge with conflicts (show conflict UI).

### Phase 6: Snippets & Task Discovery (Week 11)
**Goal**: Save, search, and run commands quickly.

#### TODO-6.1: Snippets CRUD
- **What**: Create, edit, delete, tag snippets in SQLite with FTS5 search
- **Files**: Add snippets management to `@terminus/core` or dedicated section
- **Pattern**: Snippet form: title, content (code editor), language, tags. List view with search. Global snippets (project_id=NULL) and project-scoped. FTS5 search on title + content + description.
- **Acceptance**: Create snippet → search by keyword → find it → edit → delete
- **QA**: Test FTS with partial matches. Test with special characters in content. Test project-scoped vs global visibility.

#### TODO-6.2: Makefile scanner
- **What**: Parse Makefile targets on-the-fly at project open
- **Files**: `packages/electron/src/services/makefile.service.ts`
- **Pattern**: Rewrite Rust `makefile.rs` logic in TypeScript. Regex-based parser: find lines matching `/^([a-zA-Z_-]+)\s*:/`. Extract target name, dependencies, and first comment line as description. Return as transient items (not persisted to DB).
- **Acceptance**: Open project with Makefile → targets appear in command palette → select target → `make {target}` runs in terminal
- **QA**: Test with complex Makefiles (includes, conditionals, .PHONY). Test with no Makefile (graceful skip).

#### TODO-6.3: package.json scanner
- **What**: Discover npm scripts from package.json
- **Files**: `packages/electron/src/services/makefile.service.ts` (extend to handle package.json)
- **Pattern**: Read `package.json` → extract `scripts` object → return as transient items. Each item: name, command, source="package.json".
- **Acceptance**: Open Node project → npm scripts appear in command palette → select → `npm run {script}` executes
- **QA**: Test with workspaces (multiple package.json). Test with no package.json. Test with very long script commands.

#### TODO-6.4: Unified command palette
- **What**: `Cmd+K` opens palette combining snippets + discovered tasks + recent commands
- **Files**: `packages/core/src/components/CommandPalette.tsx`
- **Pattern**: Fuzzy search across: (1) snippets from DB, (2) Makefile targets (transient), (3) npm scripts (transient), (4) recent block commands (from blocks DB). Results grouped by source. Select → execute in active terminal or insert as text.
- **Dependencies**: `fuse.js` (fuzzy search)
- **Acceptance**: `Cmd+K` → type "build" → see matching snippets, Makefile targets, and npm scripts → select to run
- **QA**: Test with 500+ items (performance). Test fuzzy matching accuracy. Test keyboard navigation (up/down/enter).

#### TODO-6.5: "Save as Snippet" action
- **What**: From command palette or block action, save any command to snippets
- **Files**: Modify `BlockActions.tsx` and `CommandPalette.tsx`
- **Pattern**: "Save as Snippet" button on blocks and palette items. Opens snippet form pre-filled with command text. User adds title, tags, language. Saves to `snippets` table.
- **Acceptance**: Run `docker compose up -d` → hover block → "Save as Snippet" → add title "Start Docker" → find it in palette later
- **QA**: Test saving discovered Makefile target as snippet. Test saving multi-line command.

### Phase 7: Polish & Settings (Week 12)
**Goal**: Themes, settings UI, keybindings, packaging.

#### TODO-7.1: Settings UI
- **What**: Visual settings panel with categories
- **Files**: `packages/core/src/components/Settings/SettingsPanel.tsx`, `SettingsGeneral.tsx`, `SettingsTerminal.tsx`, `SettingsAI.tsx`, `SettingsKeybindings.tsx`
- **Pattern**: Full-page settings with sidebar navigation. Categories: General, Terminal, AI, Git, Keybindings, About. Each setting maps to SQLite `settings` table key. Changes apply immediately (no "save" button).
- **Acceptance**: Open settings → change font size → terminal updates immediately → restart → setting persists
- **QA**: Test all settings persist. Test invalid values (validation). Test reset to defaults.

#### TODO-7.2: Theming
- **What**: Dark/light themes, custom terminal color schemes
- **Files**: `packages/core/src/hooks/useTheme.ts`, CSS variables
- **Pattern**: CSS custom properties for all colors. Theme stored in settings. Terminal themes: xterm.js `ITheme` object. Prebuilt themes: Terminus Dark, Terminus Light, Dracula, One Dark, Solarized.
- **Acceptance**: Switch theme → entire app updates → terminal colors change → persists across restart
- **QA**: Test each prebuilt theme. Test theme with all UI states (modals, dropdowns, etc.).

#### TODO-7.3: Customizable keybindings
- **What**: Keyboard shortcut customization
- **Files**: `packages/core/src/components/Settings/SettingsKeybindings.tsx`, keybinding manager
- **Pattern**: Default keybindings defined in code. User overrides stored in settings. Keybinding manager listens for key events, checks for conflicts. Visual editor to record new keybindings.
- **Acceptance**: Change "New Tab" from `Cmd+T` to `Cmd+N` → works immediately → persists
- **QA**: Test key conflicts (warning). Test platform-specific keys (Cmd vs Ctrl). Test in terminal vs UI contexts.

#### TODO-7.4: App packaging
- **What**: Package for macOS, Windows, Linux
- **Files**: `electron-builder.yml` or `forge.config.ts`
- **Dependencies**: `electron-builder` or `@electron-forge/cli`
- **Pattern**: macOS: DMG + universal binary (arm64 + x64). Windows: NSIS installer. Linux: AppImage + deb.
- **Acceptance**: Build produces installable packages for all 3 platforms
- **QA**: Install on clean machine. Verify auto-launch works. Verify file associations.

#### TODO-7.5: Auto-updater
- **What**: Automatic update checking and installation
- **Files**: Add update service to main process
- **Dependencies**: `electron-updater`
- **Pattern**: Check for updates on launch (and every 6 hours). Download in background. Prompt user to restart. Support for staging/beta channels.
- **Acceptance**: Publish new version → app detects update → downloads → installs on restart
- **QA**: Test update from v1.0.0 to v1.0.1. Test rollback on failed update. Test offline behavior.

## Final Verification Wave

After all phases complete:
1. Full `npm run check` passes (TypeScript + React)
2. All Zustand stores hydrate correctly from SQLite on fresh launch
3. Terminal works with zsh, bash, and fish
4. Blocks engine correctly segments commands with all 3 shells
5. AI streaming works with at least OpenAI and Ollama
6. Git operations work on repos with 10K+ commits
7. Command palette search returns results in <50ms with 500+ items
8. App memory stays under 500MB with 10 tabs open
9. Cold start time is under 3 seconds
10. Package installs and runs on clean macOS machine

## Reference Projects

| Project | Stars | Use For |
|:---|:---|:---|
| [Tabby](https://github.com/Eugeny/tabby) | 69K | Terminal core, SSH/SFTP, split panes, backpressure |
| [Wave Terminal](https://github.com/wavetermdev/waveterm) | 17K | AI integration, provider proxy, streaming |
| [Hyper](https://github.com/vercel/hyper) | 44K | Electron terminal patterns (reference only, no plugin system) |
| [Frame](https://github.com/nicedoc/frame) | - | Project management, workspace switching |
| [electron-vite](https://github.com/alex8088/electron-vite) | - | Build tool, project scaffolding |
| [VS Code Terminal](https://github.com/microsoft/vscode) | - | OSC 133/633 shell integration reference |
| [iTerm2 Shell Integration](https://github.com/gnachman/iterm2-shell-integration) | - | Shell hook scripts reference |
