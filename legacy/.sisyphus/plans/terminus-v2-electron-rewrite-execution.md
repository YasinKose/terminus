# Terminus V2 — Electron + React Yeniden Yazımı: Yürütme Planı

> **Executor için:** Bu dosya, `/start-work` tarafından okunmak üzere tasarlanmıştır. Her görev bir checkbox'tır. Tamamlananları işaretle, sırayla ilerle.

---

## Yürütme Kuralları

- **Çalışma dizini:** `terminus-v2/` (repo kökü DEĞİL)
- **Dokunulmayacak dosyalar:** Repo kökündeki `package.json`, `vite.config.ts`, `tsconfig.json`, `src/`, `src-tauri/` — bunlara hiç dokunma
- **Kaynak plan:** `.sisyphus/plans/terminus-v2-electron-rewrite.md` (sadece okuma)
- **Her görev atomiktir:** Bir kutucuk = bir eylem
- **Commit formatı:** `feat(p{faz}):`, `fix(p{faz}):`, `chore(p{faz}):` (Conventional Commits)
- **Kabul kriteri:** Her TODO'nun kendi "Acceptance" maddesi geçmeden bir sonrakine geçme
- **Kontrol komutu:** `cd terminus-v2 && pnpm check` her fazın sonunda çalıştır

---

## Faz 1: Temel Kurulum (Hafta 1-2)

**Hedef:** Açılan, render eden ve IPC köprüsü çalışan boş bir kabuk.

### TODO-1.1: Monorepo iskeletini kur

- [x] [P1.1] `terminus-v2/` klasörünü repo kökünde oluştur: `mkdir terminus-v2`
- [x] [P1.2] electron-vite şablonunu içine kur: `cd terminus-v2 && npm create electron-vite@latest . -- --template react-ts`
- [x] [P1.3] `pnpm-workspace.yaml` dosyasını oluştur, 6 paketi (`shared`, `electron`, `core`, `terminal`, `ai`, `git`) listele
- [x] [P1.4] Her paket için `packages/{paket}/package.json` dosyalarını oluştur, `@terminus/{paket}` adlandırmasıyla
- [x] [P1.5] Kök `terminus-v2/package.json` dosyasını `pnpm workspaces` kullanacak şekilde düzenle
- [x] [P1.6] `terminus-v2/electron.vite.config.ts` dosyasını oluştur
- [x] [P1.7] cd terminus-v2 && pnpm install komutunun başarıyla çalıştığını doğrula
- [x] [P1.8] `pnpm dev` komutunun boş bir Electron penceresi açtığını doğrula
- [x] [P1.9] Hot-reload'un renderer'da çalıştığını, main process değişikliğinde restart olduğunu doğrula
- [x] [P1.10] Mevcut repo kökünün etkilenmediğini doğrula (`git status` ile)
- [x] [P1.11] `git add terminus-v2/ && git commit -m "chore(p1): scaffold terminus-v2 monorepo with electron-vite"`

### TODO-1.2: @terminus/shared paketi

- [x] [P1.12] packages/shared/src/types/ipc.ts dosyasını oluştur — IPC kanal adları ve payload tipleri
- [x] [P1.13] packages/shared/src/types/terminal.ts dosyasını oluştur — Terminal, Block, Session tipleri
- [x] [P1.14] `packages/shared/src/types/ai.ts` dosyasını oluştur — AIProvider, conversation, message tipleri
- [x] [P1.15] `packages/shared/src/types/git.ts` dosyasını oluştur — GitStatus, diff, branch tipleri
- [x] [P1.16] `packages/shared/src/types/project.ts` dosyasını oluştur — Project, workspace tipleri
- [x] [P1.17] `packages/shared/src/types/snippet.ts` dosyasını oluştur — Snippet tipleri
- [x] [P1.18] `packages/shared/src/constants/ipc-channels.ts` dosyasını oluştur — tüm kanal sabitleri
- [x] [P1.19] `packages/shared/src/utils/` dizini için temel yardımcı fonksiyonları ekle
- [x] [P1.20] `packages/shared/package.json` dosyasını ESM export olacak şekilde yapılandır
- [x] [P1.21] Diğer paketlerin `import { PtySpawnConfig } from '@terminus/shared'` yapabildiğini doğrula
- [x] [P1.22] `tsc --noEmit` komutunun strict modda başarıyla geçtiğini doğrula
- [x] [P1.23] `git commit -m "feat(p1): add @terminus/shared types and IPC constants"`

### TODO-1.3: @terminus/electron main process kabuğu

- [x] [P1.24] `packages/electron/src/main.ts` dosyasını oluştur — Electron app entry, window creation
- [x] [P1.25] `packages/electron/src/preload.ts` dosyasını oluştur — Typed ContextBridge `window.terminus.*`
- [x] [P1.26] `packages/electron/src/ipc/pty.handler.ts` dosyasını oluştur — PTY IPC handler iskelet
- [x] [P1.27] `packages/electron/src/ipc/db.handler.ts` dosyasını oluştur — DB IPC handler iskelet
- [x] [P1.28] `packages/electron/src/ipc/ai.handler.ts` dosyasını oluştur — AI IPC handler iskelet
- [x] [P1.29] `packages/electron/src/ipc/git.handler.ts` dosyasını oluştur — Git IPC handler iskelet
- [x] [P1.30] `packages/electron/src/ipc/fs.handler.ts` dosyasını oluştur — FS IPC handler iskelet
- [x] [P1.31] Renderer DevTools konsolundan `window.terminus.app.getVersion()` çağrısının doğru sürümü döndürdüğünü doğrula
- [x] [P1.32] `window.terminus` nesnesinin renderer'da tam TypeScript tipleriyle erişilebilir olduğunu doğrula
#BT|- [x] [P1.33] `git commit -m "feat(p1): add typed ContextBridge and IPC handler skeletons"`

### TODO-1.4: @terminus/core UI kabuğu

- [x] [P1.34] `cd terminus-v2 && pnpm add -w react@19 zustand tailwindcss @radix-ui/react-dialog lucide-react`
- [x] [P1.35] shadcn/ui'yi yapılandır: npx shadcn-ui@latest init (terminus-v2/ içinde)
- [x] [P1.36] `packages/core/src/App.tsx` dosyasını oluştur — root bileşen
- [x] [P1.37] `packages/core/src/layouts/MainLayout.tsx` dosyasını oluştur — Sidebar + Main + Bottom Panel (CSS Grid)
- [x] [P1.38] `packages/core/src/layouts/SplitContainer.tsx` dosyasını oluştur — iskelet
- [x] [P1.39] `packages/core/src/components/Sidebar.tsx` dosyasını oluştur — "Projects" başlığıyla
- [x] [P1.40] `packages/core/src/components/TabBar.tsx` dosyasını oluştur — iskelet
- [x] [P1.41] `packages/core/src/stores/projectStore.ts` dosyasını oluştur — Zustand store
- [x] [P1.42] `packages/core/src/stores/uiStore.ts` dosyasını oluştur — Zustand store
- [x] [P1.43] `packages/core/src/stores/settingsStore.ts` dosyasını oluştur — Zustand store
- [x] [P1.44] Uygulamanın sidebar, boş ana alan ve daraltılabilir alt panel ile render olduğunu doğrula
- [x] [P1.45] Karanlık temanın uygulandığını, sidebar'ın daraldığını/genişlediğini doğrula
- [x] [P1.46] `git commit -m "feat(p1): add core UI shell with MainLayout and Zustand stores"`

- [ ] [P1.45] Karanlık temanın uygulandığını, sidebar'ın daraldığını/genişlediğini doğrula
- [ ] [P1.46] `git commit -m "feat(p1): add core UI shell with MainLayout and Zustand stores"`

### TODO-1.5: SQLite kurulumu ve migration'lar

- [x] [P1.47] `pnpm add better-sqlite3` komutunu çalıştır
- [x] [P1.48] `packages/electron/src/services/db.service.ts` dosyasını oluştur — sync API wrapper
- [x] [P1.49] `packages/electron/src/migrations/001_initial.sql` dosyasını oluştur — kaynak plandaki tam şemayı içerecek şekilde
- [x] [P1.50] Migration runner'ı `db.service.ts` içine ekle — `_migrations` tablosunu takip eder, `.sql` dosyalarını sırayla uygular
- [x] [P1.51] Tüm tabloları oluştur: `projects`, `terminal_sessions`, `blocks`, `ai_conversations`, `ai_messages`, `snippets`, `settings`
- [x] [P1.52] FTS5 sanal tablolarını ekle: `blocks_fts`, `snippets_fts`
- [x] [P1.53] FTS trigger'larını ekle (INSERT, DELETE, UPDATE için)
- [x] [P1.54] Index'leri ekle (kaynak planda listelenen tüm index'ler)
- [x] [P1.55] Uygulama başlangıcında `~/.terminus/terminus.db` dosyasının oluşturulduğunu doğrula
- [x] [P1.56] `PRAGMA table_info(projects)` ile tüm sütunların varlığını doğrula
- [x] [P1.57] Test projesi ekle, uygulama yeniden başlatıldığında veri kalıcılığını doğrula
- [x] [P1.58] `git commit -m "feat(p1): add SQLite with better-sqlite3 and full schema migration"`

---

## Faz 2: Terminal Motoru (Hafta 3-4)

**Hedef:** Shell açan, I/O işleyen, sekme/bölme destekleyen çalışan bir terminal.

### TODO-2.1: xterm.js + node-pty ile temel terminal

- [x] [P2.1] `pnpm add xterm @xterm/addon-fit @xterm/addon-webgl node-pty` komutunu çalıştır
- [x] [P2.2] `packages/electron/src/services/pty.service.ts` dosyasını oluştur — node-pty spawn, write, resize, kill
- [x] [P2.3] `packages/electron/src/ipc/pty.handler.ts` dosyasını implement et — spawn, write, resize, kill, onData, onExit
- [x] [P2.4] `packages/terminal/src/components/XTermInstance.tsx` dosyasını oluştur — xterm.js wrapper bileşeni
- [x] [P2.5] Renderer'dan `window.terminus.pty.spawn()` çağrısını, sessionId almasını implement et
- [x] [P2.6] `onData` aboneliğini ve `xterm.write()` borulama işlemini implement et
- [x] [P2.7] Kullanıcı tuş vuruşlarını `window.terminus.pty.write(sessionId, data)` ile yönlendir
- [ ] [P2.8] Uygulama açıldığında terminal görüntülendiğini doğrula, `ls` yazınca çıktı geldiğini doğrula
- [ ] [P2.9] `echo hello` komutunun "hello" çıktısı verdiğini doğrula
- [ ] [P2.10] zsh ve bash ile test et
- [ ] [P2.11] `Ctrl+C` tuşunun çalışan süreci durdurduğunu doğrula
- [ ] [P2.12] Unicode karakterlerin doğru render olduğunu doğrula
- [ ] [P2.13] `git commit -m "feat(p2): add basic terminal with xterm.js and node-pty"`

### TODO-2.2: Çoklu terminal sekme sistemi

- [x] [P2.14] `packages/terminal/src/stores/terminalStore.ts` dosyasını oluştur — `sessions: Map<id, Session>`, `activeSessionId`
- [x] [P2.15] `packages/core/src/components/TabBar.tsx` bileşenini tam olarak implement et
- [x] [P2.16] "+" butonuyla yeni terminal sekmesi oluşturma özelliğini ekle
- [x] [P2.17] Sekme kapatma özelliğini implement et — PTY'yi öldürür
- [x] [P2.18] Sekmeler arası geçiş özelliğini implement et — gizli sekmeler xterm'i unmount eder ama PTY canlı tutar
- [ ] [P2.19] "+" butonuyla yeni sekme oluşturmayı doğrula, her sekmenin bağımsız shell oturumu olduğunu doğrula
- [ ] [P2.20] 10 sekme hızlıca aç, bellek sızıntısı olmadığını doğrula
- [ ] [P2.21] Sekmeler arasında geçiş yapınca çıktıların karışmadığını doğrula
- [ ] [P2.22] `git commit -m "feat(p2): add tab system for multiple terminal sessions"`

### TODO-2.3: Bölünmüş paneller (dikey/yatay)

- [x] [P2.23] `packages/core/src/layouts/SplitContainer.tsx` dosyasını tam implement et — özyinelemeli bileşen
- [x] [P2.24] Ağaç veri yapısını implement et: `SplitNode = { type: 'terminal', sessionId } | { type: 'split', direction: 'h'|'v', children, ratio }`
- [x] [P2.25] CSS flexbox ile sürüklenebilir bölücü ekle (harici kütüphane yok)
- [x] [P2.26] `Cmd+D` kısayolunu dikey bölme için bağla
- [x] [P2.27] `Cmd+Shift+D` kısayolunu yatay bölme için bağla
- [ ] [P2.28] 4 yönde bölme yaparak tüm panellerin bağımsız I/O aldığını doğrula
- [ ] [P2.29] Bir panel kapatıldığında diğerlerinin kaldığını doğrula
- [ ] [P2.30] Boyutlandırma tutamaçlarının sorunsuz çalıştığını doğrula
- [ ] [P2.31] `git commit -m "feat(p2): add recursive split pane layout with draggable divider"`

### TODO-2.4: PTY geri basınç kontrolü (Tabby stili)

- [x] [P2.32] `packages/electron/src/services/pty.service.ts` dosyasını güncelle — ackData mekanizması, varsayılan tampon boyutu 65536 byte
- [x] [P2.33] `packages/terminal/src/components/XTermInstance.tsx` dosyasını güncelle — chunk işlenince ack gönder
- [ ] [P2.34] `cat /dev/urandom | head -c 100000000` komutunun uygulamayı çökertemediğini doğrula
- [ ] [P2.35] 500MB RAM sınırının aşılmadığını doğrula
- [ ] [P2.36] `yes | head -1000000` komutunun donma olmadan sorunsuz kaydırma sağladığını doğrula
- [ ] [P2.37] `git commit -m "feat(p2): add Tabby-style ackData backpressure for PTY"`

### TODO-2.5: Terminal oturum kalıcılığı

- [x] [P2.38] Sekme oluşturulduğunda `terminal_sessions` tablosuna kaydet
- [x] [P2.39] Sekme kapatıldığında `closed_at` alanını güncelle
- [x] [P2.40] Proje açıldığında `closed_at IS NULL` olan oturumları geri yükle (PTY değil, sadece sekme düzeni ve adı)
- [ ] [P2.41] 3 özel adlı sekme aç, uygulamayı kapat ve yeniden aç, aynı 3 sekmenin göründüğünü doğrula
- [ ] [P2.42] Sekme sırasının kalıcı olduğunu doğrula
- [ ] [P2.43] Kapatılan oturumların yeniden görünmediğini doğrula
- [ ] [P2.44] `git commit -m "feat(p2): add terminal session persistence via SQLite"`

---

## Faz 3: Bloklar Motoru (Hafta 5-6)

**Hedef:** Warp tarzı komut segmentasyonu.

### TODO-3.1: Shell entegrasyon scriptleri

- [x] [P3.1] `shell-integration/bash-integration.sh` dosyasını oluştur — precmd/preexec hooks ile OSC 133 A/B/C/D
- [x] [P3.2] `shell-integration/zsh-integration.sh` dosyasını oluştur — precmd/preexec hooks ile OSC 133 A/B/C/D
- [x] [P3.3] `shell-integration/fish-integration.fish` dosyasını oluştur — fish_prompt/fish_preexec hooks
- [x] [P3.4] `packages/electron/src/services/shell-integration.service.ts` dosyasını oluştur — `~/.terminus/shell-integration/` dizinine kopyalama, kullanıcı izniyle rc dosyasına `source` satırı ekleme
- [x] [P3.5] `TERMINUS_SHELL_INTEGRATION` env değişkeniyle shell entegrasyonunun yüklenip yüklenmediğini tespit eden mantığı ekle
- [ ] [P3.6] Terminus'ta terminal açıldığında shell entegrasyonunun otomatik yüklendiğini doğrula
- [ ] [P3.7] Ham PTY çıktısında OSC 133 dizilerinin göründüğünü doğrula
- [ ] [P3.8] zsh, bash ve fish ile test et
- [ ] [P3.9] Scriptlerin mevcut kullanıcı shell yapılandırmasını bozmadığını doğrula
- [ ] [P3.10] `git commit -m "feat(p3): add bash/zsh/fish shell integration scripts with OSC 133"`

### TODO-3.2: OSC 133 ayrıştırıcı

- [x] [P3.11] `packages/terminal/src/engine/block-parser.ts` dosyasını oluştur
- [x] [P3.12] `xterm.js parser.registerOscHandler(133, ...)` kullanımını implement et
- [x] [P3.13] A (prompt start), B (prompt end / command start), C (output start), D (command finished + exit code) ayrıştırmasını implement et
- [x] [P3.14] Olayları yayınla: `onPromptStart`, `onCommandStart`, `onOutputStart`, `onCommandFinished(exitCode)`
- [ ] [P3.15] Komut yazınca ayrıştırıcının doğru olay dizisini tetiklediğini doğrula
- [ ] [P3.16] Olayların doğru metadata (çıkış kodu, zamanlama) içerdiğini doğrula
- [ ] [P3.17] OSC dizileri çıkaran komutlarla test et (`printf '\e]133;A\a'`) — ayrıştırıcının karışmadığını doğrula
- [ ] [P3.18] `git commit -m "feat(p3): add OSC 133 block parser for xterm.js"`

### TODO-3.3: Blok durum makinesi

- [x] [P3.19] `packages/terminal/src/engine/block-state-machine.ts` dosyasını oluştur
- [x] [P3.20] Durum geçişlerini implement et: `PROMPT → EXECUTING → COMPLETED`
- [x] [P3.21] Her blok için veri yapısını implement et: `{ id, state, command, output, exitCode, cwd, startedAt, finishedAt }`
- [x] [P3.22] `onPromptStart` olayında yeni blok oluşturmayı implement et
- [x] [P3.23] `onCommandStart` olayında komutu yakalamayı implement et
- [x] [P3.24] C ve D arasındaki veriyle çıktı birikimini implement et
- [x] [P3.25] `onCommandFinished` olayında bloğu sonlandırmayı implement et
- [ ] [P3.26] Her komutun doğru metadata ile ayrı bir blok oluşturduğunu doğrula
- [ ] [P3.27] Hızlı komutlarla test et (`ls && pwd && date`)
- [ ] [P3.28] Boş komutlarla test et (sadece Enter tuşu)
- [ ] [P3.29] Çalışma sırasında `Ctrl+C` ile test et
- [ ] [P3.30] `git commit -m "feat(p3): add block state machine PROMPT→EXECUTING→COMPLETED"`

### TODO-3.4: Çoklu xterm blok render'ı

- [x] [P3.31] `packages/terminal/src/engine/xterm-manager.ts` dosyasını oluştur — maksimum 2 canlı xterm instance
- [x] [P3.32] `packages/terminal/src/components/Block.tsx` dosyasını oluştur — tek blok (prompt + çıktı)
- [x] [P3.33] `packages/terminal/src/components/BlockList.tsx` dosyasını oluştur — `react-virtuoso` ile kaydırılabilir liste
- [x] [P3.34] `packages/terminal/src/components/ActivePrompt.tsx` dosyasını oluştur — canlı xterm prompt
- [x] [P3.35] `packages/terminal/src/TerminalPanel.tsx` dosyasını tam implement et
- [x] [P3.36] `react-virtuoso` bağımlılığını ekle: `pnpm add react-virtuoso`
- [ ] [P3.37] Blok tamamlandıktan 5 saniye sonra xterm tamponunu ANSI metne serialize eden mantığı implement et
- [ ] [P3.38] Serialize edilen metni stillendirilmiş `<pre>` olarak render et, xterm instance'ı yok et
- [ ] [P3.39] 5 komut yaz, 5 görsel bloğun yığıldığını, sadece alt bloğun canlı imlece sahip olduğunu doğrula
- [ ] [P3.40] Tamamlanan blokların renkleri (ANSI) koruduğunu doğrula
- [ ] [P3.41] 100+ blok arasında kaydırmanın sorunsuz olduğunu doğrula
- [ ] [P3.42] Blok sayısıyla belleğin artmadığını doğrula
- [ ] [P3.43] `git commit -m "feat(p3): add multi-xterm block rendering with react-virtuoso"`

### TODO-3.5: Blok eylemleri

- [x] [P3.44] `packages/terminal/src/components/BlockActions.tsx` dosyasını oluştur
- [x] [P3.45] `Block.tsx` dosyasını üzerine gelince/tıklayınca eylem çubuğu gösterecek şekilde güncelle
- [x] [P3.46] "Kopyala" eylemini implement et — clipboard API
- [x] [P3.47] "Yeniden çalıştır" eylemini implement et — komutu aktif terminale ilet
- [x] [P3.48] "Daralt/Genişlet" eylemini implement et — çıktı görünürlüğünü aç/kapa
- [x] [P3.49] "İçinde ara" eylemini implement et — blok çıktısında eşleşmeleri vurgula
- [ ] [P3.50] Üzerine gelince eylem butonlarının göründüğünü, kopyalamanın çalıştığını doğrula
- [ ] [P3.51] Yeniden çalıştırmanın komutu mevcut terminalde çalıştırdığını doğrula
- [ ] [P3.52] Çok satırlı çıktıyla kopyalamayı test et
- [ ] [P3.53] Daraltma durumunun kaydırma sırasında korunduğunu doğrula
- [ ] [P3.54] `git commit -m "feat(p3): add block actions (copy, re-run, collapse, search)"`

### TODO-3.6: Blok kalıcılığı

- [x] [P3.55] Blok `COMPLETED` durumuna geçince `blocks` tablosuna async kaydetmeyi implement et
- [x] [P3.56] FTS5 index'inin trigger'lar aracılığıyla otomatik güncelleneceğini doğrula
- [ ] [P3.57] `window.terminus.db.query("SELECT * FROM blocks_fts WHERE blocks_fts MATCH ?", [searchTerm])` API'sini doğrula
- [ ] [P3.58] `Cmd+Shift+F` kısayoluyla tüm geçmiş komut ve çıktılarda arama yapılabildiğini doğrula
- [ ] [P3.59] 10000 blok ekle, aramanın 100ms içinde sonuç döndürdüğünü doğrula
- [ ] [P3.60] FTS'in özel karakterleri yönettiğini doğrula
- [ ] [P3.61] `git commit -m "feat(p3): add block persistence to SQLite with FTS5 search"`

---

## Faz 4: AI Entegrasyonu (Hafta 7-8)

**Hedef:** AI ile sohbet et, terminal bağlamını aktar, önerilen komutları çalıştır.

### TODO-4.1: AI sohbet paneli UI

- [x] [P4.1] `pnpm add react-markdown remark-gfm rehype-highlight` komutunu çalıştır
- [x] [P4.2] `packages/ai/src/AIChatPanel.tsx` dosyasını oluştur — sağdan kayan yan panel
- [x] [P4.3] `packages/ai/src/components/MessageList.tsx` dosyasını oluştur — Markdown desteğiyle
- [x] [P4.4] `packages/ai/src/components/MessageInput.tsx` dosyasını oluştur — bağlam ekleri için
- [ ] [P4.5] AI panelinin açılınca boş sohbeti gösterdiğini doğrula
- [ ] [P4.6] Mesaj yazınca kullanıcı mesajı olarak göründüğünü, yükleme göstergesinin belirdiğini doğrula
- [ ] [P4.7] Panelin terminal performansını etkilemediğini doğrula
- [ ] [P4.8] Markdown'ın doğru render olduğunu doğrula (kod blokları, listeler, bağlantılar)
- [ ] [P4.9] `git commit -m "feat(p4): add AI chat panel UI with markdown support"`

### TODO-4.2: Main process'te provider proxy

- [x] [P4.10] `pnpm add openai @anthropic-ai/sdk keytar` komutunu çalıştır
- [x] [P4.11] `packages/electron/src/services/secret.service.ts` dosyasını oluştur — keytar wrapper
- [x] [P4.12] `packages/electron/src/services/ai-proxy.service.ts` dosyasını oluştur — ProviderRegistry
- [x] [P4.13] `packages/electron/src/ipc/ai.handler.ts` dosyasını tam implement et — stream, cancelStream, onChunk, onStreamEnd
- [x] [P4.14] OpenAI provider'ını implement et — API key'i keytar'dan al, stream gönder
- [x] [P4.15] Anthropic provider'ını implement et
- [ ] [P4.16] OpenAI key yapılandır, mesaj gönder, streaming yanıt aldığını doğrula
- [ ] [P4.17] Key'in OS keychain'de (herhangi bir dosyada değil) olduğunu doğrula
- [ ] [P4.18] Geçersiz API key ile test et — zarif hata mesajı doğrula
- [ ] [P4.19] Akış ortasında ağ kopukluğuyla test et
- [ ] [P4.20] macOS Keychain'de keytar ile test et
- [ ] [P4.21] `git commit -m "feat(p4): add AI provider proxy with keytar secret storage"`

### TODO-4.3: Vercel AI SDK entegrasyonu

- [x] [P4.22] `pnpm add @ai-sdk/react ai` komutunu çalıştır
- [x] [P4.23] `packages/ai/src/hooks/useAIChat.ts` dosyasını oluştur — IPC üzerinden yönlendiren özel useChat wrapper
- [x] [P4.24] IPC olaylarını (ai:chunk, ai:end, ai:error) Vercel AI SDK'nın stream protokolüne eşle
- [x] [P4.25] Konuşma durumunu Zustand'da yönet
- [ ] [P4.26] IPC köprüsü üzerinden tam streaming sohbetin çalıştığını doğrula
- [ ] [P4.27] Stream iptalini test et
- [ ] [P4.28] Eşzamanlı akışların bloke edildiğini test et (aynı anda yalnızca bir akış)
- [ ] [P4.29] Hatadan sonra yeniden bağlanmayı test et
- [ ] [P4.30] `git commit -m "feat(p4): integrate Vercel AI SDK via custom IPC useChat hook"`

### TODO-4.4: Bağlam farkındalığı

- [x] [P4.31] `packages/ai/src/components/MessageInput.tsx` dosyasına "Bağlam ekle" butonu ekle
- [x] [P4.32] "Mevcut terminal" seçeneğini implement et — aktif bloktan son N satırı kazı
- [x] [P4.33] "Dosya" seçeneğini implement et — dosya seçici diyalogu
- [x] [P4.34] "Git diff" seçeneğini implement et — `git diff` çalıştır ve ekle
- [x] [P4.35] Bağlamı `ai_messages.context_json` alanına yapılandırılmış JSON olarak serialize et
- [ ] [P4.36] "terminal ekle" butonuna tıklayınca son 50 satırın otomatik eklendiğini doğrula
- [ ] [P4.37] AI yanıtının terminal içeriğine atıfta bulunduğunu doğrula
- [ ] [P4.38] Boş terminalle test et (çökme olmamalı)
- [ ] [P4.39] Çok uzun çıktıyla test et (kesilme olmalı)
- [ ] [P4.40] İkili dosya eki ile test et (reddedilmeli)
- [ ] [P4.41] `git commit -m "feat(p4): add context awareness (terminal, file, git diff)"`

### TODO-4.5: Kod bloğu "Çalıştır" butonu

- [x] [P4.42] `packages/ai/src/components/CodeBlock.tsx` dosyasını oluştur
- [x] [P4.43] AI yanıtında çitli kod bloklarını tespit et
- [x] [P4.44] `bash`/`sh`/`zsh` dil etiketli bloklara "Çalıştır" butonu ekle
- [x] [P4.45] Tıklandığında `window.terminus.pty.write(activeSessionId, command + '\n')` çağrısını implement et
- [x] [P4.46] Tehlikeli komutlar (rm, sudo) için onay diyalogu ekle
- [ ] [P4.47] AI'ın `npm install express` önerdiğini, Çalıştır'a tıklayınca terminalde çalıştığını doğrula
- [ ] [P4.48] Çok satırlı komutlarla test et
- [ ] [P4.49] Tehlikeli komutlarla test et — onayı doğrula
- [ ] [P4.50] Aktif terminal yokken test et
- [ ] [P4.51] `git commit -m "feat(p4): add code block Run button with dangerous command confirmation"`

### TODO-4.6: AI mod sistemi

- [x] [P4.52] `packages/ai/src/components/ModeSelector.tsx` dosyasını oluştur
- [x] [P4.53] `packages/ai/src/stores/aiStore.ts` dosyasını güncelle — mod yönetimi ekle
- [x] [P4.54] Modları `settings` tablosunun `ai.modes` anahtarına kaydet
- [x] [P4.55] Varsayılan modları implement et: "General" (GPT-4o), "Code Review" (Claude), "Offline" (Ollama)
- [x] [P4.56] Özel mod oluştur, seç, AI'ın yapılandırılmış provider/modeli kullandığını doğrula
- [x] [P4.57] Modun yeniden başlatmada kalıcı olduğunu doğrula
- [x] [P4.58] Konuşma ortasında mod değiştirmeyi test et
- [x] [P4.59] Kullanılamayan provider'a sahip mod ile test et — zarif geri dönüş doğrula
- [ ] [P4.60] `git commit -m "feat(p4): add AI mode system with user-defined profiles"`

### TODO-4.7: AI konuşma kalıcılığı

- [x] [P4.61] Yeni konuşmada `ai_conversations` tablosuna kaydetmeyi implement et
- [x] [P4.62] Her mesajda `ai_messages` tablosuna kaydetmeyi implement et
- [x] [P4.63] Uygulama başlangıcında son konuşmaları DB'den yüklemeyi implement et
- [x] [P4.64] Konuşma seçildiğinde mesajları tembel yüklemeyi implement et
- [ ] [P4.65] AI ile sohbet et, uygulamayı kapat ve yeniden aç, konuşma geçmişinin varlığını doğrula
- [ ] [P4.66] Devam etmek için tıklamayı doğrula
- [ ] [P4.67] 100+ konuşmayla test et (tembel yükleme çalışıyor mu)
- [ ] [P4.68] Konuşma silme işlemini test et (mesajlar cascade silinmeli)
- [ ] [P4.69] `git commit -m "feat(p4): add AI conversation persistence to SQLite"`

---

## Faz 5: Git Çalışma Masası (Hafta 9-10)

**Hedef:** Terminalden çıkmadan görsel Git yönetimi.

### TODO-5.1: Git panel UI

- [x] [P5.1] `packages/git/src/GitPanel.tsx` dosyasını oluştur — yan panel container
- [x] [P5.2] `packages/git/src/components/StatusView.tsx` dosyasını oluştur — duruma göre gruplanmış dosya listesi
- [x] [P5.3] Dosya durumu simgelerini göster (modified, added, deleted, untracked)
- [x] [P5.4] Dosyaya tıklayınca diff göster
- [x] [P5.5] Dosyaları ayrı ayrı stage/unstage etmek için checkbox ekle
- [x] [P5.6] Sidebar simgesine rozet sayısı ekle
- [ ] [P5.7] Git değişikliği olan proje açınca dosya listesinin göründüğünü doğrula
- [ ] [P5.8] 100+ değiştirilmiş dosyayla test et (sanallaştırılmış liste)
- [ ] [P5.9] İkili dosyalarla test et
- [ ] [P5.10] Başlatılmamış git repo'suyla test et (zarif mesaj)
- [ ] [P5.11] `git commit -m "feat(p5): add Git panel UI with status view and diff display"`

### TODO-5.2: simple-git entegrasyonu

- [x] [P5.12] `pnpm add simple-git` komutunu çalıştır
- [x] [P5.13] `packages/electron/src/services/git.service.ts` dosyasını oluştur — simple-git wrapper
- [x] [P5.14] `packages/electron/src/ipc/git.handler.ts` dosyasını tam implement et — status, diff, commit, checkout, log, branches, createBranch, push, pull
- [ ] [P5.15] Her IPC endpoint'in renderer'dan doğru çalıştığını doğrula
- [ ] [P5.16] Büyük repo'larla test et (performans)
- [ ] [P5.17] Merge conflict'li repo ile test et (hata işleme)
- [ ] [P5.18] Detached HEAD durumunda test et
- [ ] [P5.19] `git commit -m "feat(p5): add simple-git backend service and IPC handlers"`

### TODO-5.3: Git kimlik değiştirici

- [x] [P5.20] `packages/git/src/components/ProfileSwitcher.tsx` dosyasını oluştur
- [x] [P5.21] Proje açılınca `~/.gitconfig` dosyasını `includeIf` direktifleri için ayrıştır
- [x] [P5.22] `settings.git.profiles` alanından profilleri de oku
- [x] [P5.23] Değiştirme UI açılır menüsünü implement et
- [x] [P5.24] Değiştirince `git config --local user.name/email` komutunu çalıştır
- [ ] [P5.25] Mevcut profillerin tespit edildiğini, değiştirince `git config user.name` yeni adı döndürdüğünü doğrula
- [ ] [P5.26] Profil yapılandırılmamışsa test et
- [ ] [P5.27] `includeIf` kalıplarıyla test et
- [ ] [P5.28] `git commit -m "feat(p5): add Git identity switcher with includeIf support"`

### TODO-5.4: Commit iş akışı

- [x] [P5.29] `packages/git/src/components/CommitForm.tsx` dosyasını oluştur
- [x] [P5.30] Dosya checkbox'larıyla stage işlemini implement et
- [x] [P5.31] Conventional commit ön eki önerileriyle mesaj textarea'sı ekle
- [x] [P5.32] "Commit" butonunu implement et
- [x] [P5.33] "Commit ve Push" butonunu implement et
- [x] [P5.34] Commit sonrası durum görünümünü yenile
- [ ] [P5.35] 3 dosya stage et, "feat: add login" yaz, commit et, temiz durumu doğrula
- [ ] [P5.36] Push'un başarılı olduğunu doğrula
- [ ] [P5.37] Boş commit mesajını test et (engellenmeli)
- [ ] [P5.38] Stage'lenmiş dosya yokken commit'i test et (engellenmeli)
- [ ] [P5.39] Remote olmadan push'u test et (hata mesajı göstermeli)
- [ ] [P5.40] `git commit -m "feat(p5): add commit workflow with staging and push support"`

### TODO-5.5: Branch yönetimi

- [x] [P5.41] `packages/git/src/components/BranchManager.tsx` dosyasını oluştur
- [x] [P5.42] Mevcut branch + tüm branch'leri gösteren açılır menü ekle
- [x] [P5.43] Mevcut branch'den yeni branch oluşturmayı implement et
- [x] [P5.44] Branch değiştirmeyi implement et (kirli durum varsa stash sor)
- [x] [P5.45] Onaylamayla branch silmeyi implement et
- [x] [P5.46] Branch'i mevcut'a merge etmeyi implement et
- [ ] [P5.47] Branch listesini gör, "feature/x" oluştur, ona geç, geri dön, sil işlemini doğrula
- [ ] [P5.48] Teslim edilmemiş değişikliklerle branch değiştirmeyi test et (stash diyalogu)
- [ ] [P5.49] Mevcut branch'i silmeyi test et (engellenmeli)
- [ ] [P5.50] Conflict'li merge'i test et (conflict UI göstermeli)
- [ ] [P5.51] `git commit -m "feat(p5): add branch management (create, switch, delete, merge)"`

---

## Faz 6: Snippet'lar ve Görev Keşfi (Hafta 11)

**Hedef:** Komutları hızlıca kaydet, ara ve çalıştır.

### TODO-6.1: Snippet CRUD işlemleri

- [x] [P6.1] `@terminus/core` içine snippet yönetimi bileşeni ekle
- [x] [P6.2] Snippet formu oluştur: başlık, içerik (kod editörü), dil, etiketler
- [x] [P6.3] Liste görünümü ve arama arayüzünü implement et
- [x] [P6.4] Proje kapsamlı snippet'ları implement et (`project_id` belirli) ve global snippet'ları (`project_id=NULL`)
- [x] [P6.5] FTS5 aramasını başlık + içerik + açıklama üzerinde implement et
- [ ] [P6.6] Snippet oluştur, anahtar kelimeyle ara, düzenle, sil işlemlerini doğrula
- [ ] [P6.7] Kısmi eşleşmelerle FTS'i test et
- [ ] [P6.8] İçerikte özel karakterlerle test et
- [ ] [P6.9] Proje kapsamlı ve global görünürlüğü test et
- [ ] [P6.10] `git commit -m "feat(p6): add snippets CRUD with FTS5 search"`

### TODO-6.2: Makefile tarayıcı

- [x] [P6.11] `packages/electron/src/services/makefile.service.ts` dosyasını oluştur
- [x] [P6.12] Rust `makefile.rs` mantığını TypeScript'e yeniden yaz
- [x] [P6.13] Regex tabanlı ayrıştırıcı implement et: `/^([a-zA-Z_-]+)\s*:/` satırlarını bul
- [x] [P6.14] Hedef adı, bağımlılıklar ve açıklama için ilk yorum satırını çıkar
- [x] [P6.15] Geçici öğeler döndür (DB'ye kaydetme)
- [ ] [P6.16] Makefile olan proje aç, hedeflerin komut paletinde göründüğünü doğrula
- [ ] [P6.17] Hedef seçince `make {hedef}` komutunun terminalde çalıştığını doğrula
- [ ] [P6.18] Karmaşık Makefile'larla test et (includes, conditionals, .PHONY)
- [ ] [P6.19] Makefile olmayan proje ile test et (sessizce atla)
- [ ] [P6.20] `git commit -m "feat(p6): add Makefile scanner service (TypeScript port from Rust)"`

### TODO-6.3: package.json tarayıcı

- [x] [P6.21] `packages/electron/src/services/makefile.service.ts` dosyasını package.json'u da işleyecek şekilde genişlet
- [x] [P6.22] `package.json` dosyasını oku, `scripts` nesnesini çıkar
- [x] [P6.23] Her öğe için döndür: ad, komut, `source="package.json"`
- [ ] [P6.24] Node projesi aç, npm script'lerinin komut paletinde göründüğünü doğrula
- [ ] [P6.25] Seçince `npm run {script}` komutunun çalıştığını doğrula
- [ ] [P6.26] Workspace'lerle test et (birden fazla package.json)
- [ ] [P6.27] package.json olmadan test et
- [ ] [P6.28] `git commit -m "feat(p6): add package.json script scanner"`

### TODO-6.4: Birleşik komut paleti

- [x] [P6.29] `pnpm add fuse.js` komutunu çalıştır
- [x] [P6.30] `packages/core/src/components/CommandPalette.tsx` dosyasını tam implement et
- [x] [P6.31] Bulanık arama şunları kapsar: (1) DB'den snippet'lar, (2) Makefile hedefleri (geçici), (3) npm script'leri (geçici), (4) son blok komutları (blocks DB'den)
- [x] [P6.32] Sonuçları kaynağa göre grupla
- [x] [P6.33] Seçim mantığını implement et: aktif terminalde çalıştır veya metin olarak ekle
- [x] [P6.34] `Cmd+K` kısayolunu bağla
- [ ] [P6.35] `Cmd+K` tuşlayıp "build" yazınca eşleşen snippet'lar, Makefile hedefleri ve npm script'lerinin göründüğünü doğrula
- [ ] [P6.36] 500+ öğeyle test et (performans)
- [ ] [P6.37] Bulanık eşleşme doğruluğunu test et
- [ ] [P6.38] Klavye navigasyonunu test et (yukarı/aşağı/enter)
- [ ] [P6.39] `git commit -m "feat(p6): add unified command palette with fuzzy search"`

### TODO-6.5: "Snippet olarak kaydet" eylemi

- [x] [P6.40] `packages/terminal/src/components/BlockActions.tsx` dosyasını güncelle — "Snippet Olarak Kaydet" butonu ekle
- [x] [P6.41] `packages/core/src/components/CommandPalette.tsx` dosyasını güncelle — palette öğelerine "Snippet Olarak Kaydet" ekle
- [x] [P6.42] Komut metniyle önceden doldurulmuş snippet formunu aç
- [x] [P6.43] Kullanıcının başlık, etiket, dil eklemesine izin ver
- [x] [P6.44] `snippets` tablosuna kaydet
- [ ] [P6.45] `docker compose up -d` çalıştır, bloğa üzerine gel, "Snippet Olarak Kaydet" yap, "Docker Başlat" başlığı ekle, sonra paletten bul
- [ ] [P6.46] Keşfedilen Makefile hedefini snippet olarak kaydetmeyi test et
- [ ] [P6.47] Çok satırlı komut kaydetmeyi test et
- [ ] [P6.48] `git commit -m "feat(p6): add Save as Snippet from blocks and command palette"`

---

## Faz 7: Cilalama ve Ayarlar (Hafta 12)

**Hedef:** Temalar, ayarlar UI, kısayollar, paketleme.

### TODO-7.1: Ayarlar UI

- [x] [P7.1] `packages/core/src/components/Settings/SettingsPanel.tsx` dosyasını oluştur — tam sayfa ayarlar, kenar çubuğu navigasyonu
- [x] [P7.2] `SettingsGeneral.tsx` dosyasını oluştur — genel ayarlar kategorisi
- [x] [P7.3] `SettingsTerminal.tsx` dosyasını oluştur — terminal ayarları (font boyutu, shell, renk şeması)
- [x] [P7.4] `SettingsAI.tsx` dosyasını oluştur — AI sağlayıcı API key'leri, modlar
- [x] [P7.5] `SettingsKeybindings.tsx` dosyasını oluştur — kısayol listesi
- [x] [P7.6] Her ayarı SQLite `settings` tablosundaki ilgili anahtarla eşleştir
- [x] [P7.7] Değişikliklerin anında uygulandığını implement et ("kaydet" butonu yok)
- [ ] [P7.8] Ayarları aç, font boyutunu değiştir, terminalin anında güncellendiğini doğrula
- [ ] [P7.9] Yeniden başlatma sonrası ayarın kaldığını doğrula
- [ ] [P7.10] Geçersiz değerlerle test et (doğrulama)
- [ ] [P7.11] Varsayılanlara sıfırlamayı test et
- [ ] [P7.12] `git commit -m "feat(p7): add settings UI with immediate apply and persistence"`

### TODO-7.2: Tema sistemi

- [x] [P7.13] `packages/core/src/hooks/useTheme.ts` dosyasını oluştur
- [x] [P7.14] Tüm renkler için CSS özel özellikleri (custom properties) ekle
- [x] [P7.15] Temayı settings tablosuna kaydet/yükle
- [x] [P7.16] Terminal temasını xterm.js `ITheme` nesnesi olarak implement et
- [x] [P7.17] Hazır temaları ekle: Terminus Dark, Terminus Light, Dracula, One Dark, Solarized
- [ ] [P7.18] Tema değiştirince tüm uygulamanın güncellendiğini doğrula
- [ ] [P7.19] Terminal renklerinin değiştiğini doğrula
- [ ] [P7.20] Yeniden başlatmada kalıcı olduğunu doğrula
- [ ] [P7.21] Her hazır temayı test et
- [ ] [P7.22] `git commit -m "feat(p7): add theming with CSS custom properties and prebuilt themes"`

### TODO-7.3: Özelleştirilebilir kısayollar

- [x] [P7.23] Varsayılan kısayolları kod içinde tanımla
- [x] [P7.24] Kullanıcı geçersiz kılmalarını settings tablosuna kaydet
- [x] [P7.25] Kısayol yöneticisini implement et — key olaylarını dinle, conflict kontrolü yap
- [x] [P7.26] Yeni kısayol kaydetmek için görsel editör ekle
- [ ] [P7.27] "Yeni Sekme" kısayolunu `Cmd+T`'den `Cmd+N`'e değiştir, anında çalıştığını doğrula
- [ ] [P7.28] Yeniden başlatmada kaldığını doğrula
- [ ] [P7.29] Key conflict'leri test et (uyarı göster)
- [ ] [P7.30] Platform bazlı key'leri test et (Cmd vs Ctrl)
- [ ] [P7.31] Terminal vs UI bağlamını test et
- [ ] [P7.32] `git commit -m "feat(p7): add customizable keybindings with conflict detection"`

### TODO-7.4: Uygulama paketleme

- [x] [P7.33] `pnpm add -D electron-builder` komutunu çalıştır
- [x] [P7.34] `terminus-v2/electron-builder.yml` dosyasını oluştur
- [x] [P7.35] macOS yapılandırmasını ekle: DMG + universal binary (arm64 + x64)
- [x] [P7.36] Windows yapılandırmasını ekle: NSIS installer
- [x] [P7.37] Linux yapılandırmasını ekle: AppImage + deb
- [ ] [P7.38] Tüm 3 platform için kurulabilir paket üretildiğini doğrula
- [ ] [P7.39] Temiz makineye kurulumu doğrula
- [ ] [P7.40] Otomatik başlatmanın çalıştığını doğrula
- [ ] [P7.41] `git commit -m "feat(p7): add cross-platform packaging with electron-builder"`

### TODO-7.5: Otomatik güncelleyici

- [ ] [P7.42] `pnpm add electron-updater` komutunu çalıştır
- [ ] [P7.43] Ana process'e güncelleme servisi ekle
- [ ] [P7.44] Başlatmada ve her 6 saatte bir güncelleme kontrolü implement et
- [ ] [P7.45] Arka planda indirmeyi implement et
- [ ] [P7.46] Yeniden başlatma için kullanıcı istemini implement et
- [ ] [P7.47] Staging/beta kanal desteği ekle
- [ ] [P7.48] Yeni sürüm yayınla, uygulamanın güncellemeyi tespit ettiğini, indirdiğini, yeniden başlatmada kurduğunu doğrula
- [ ] [P7.49] v1.0.0'dan v1.0.1'e güncellemeyi test et
- [ ] [P7.50] Çevrimdışı davranışı test et
- [ ] [P7.51] `git commit -m "feat(p7): add auto-updater with background download and beta channel support"`

---

## Son Doğrulama Dalgası

- [ ] [VF.1] Tam `pnpm check` komutunu çalıştır (TypeScript + React) — hatasız geçmeli
- [ ] [VF.2] Tüm Zustand store'larının temiz başlatmada SQLite'tan doğru yüklendiğini doğrula
- [ ] [VF.3] Terminalin zsh, bash ve fish ile çalıştığını doğrula
- [ ] [VF.4] Blok motorunun tüm 3 shell ile komutları doğru segmentlediğini doğrula
- [ ] [VF.5] AI streaming'in en azından OpenAI ve Ollama ile çalıştığını doğrula
- [ ] [VF.6] Git işlemlerinin 10.000+ commit'li repo'larda çalıştığını doğrula
- [ ] [VF.7] Komut paleti aramasının 500+ öğeyle 50ms içinde sonuç döndürdüğünü doğrula
- [ ] [VF.8] Uygulama belleğinin 10 sekme açıkken 500MB altında kaldığını doğrula
- [ ] [VF.9] Soğuk başlatma süresinin 3 saniyenin altında olduğunu doğrula
- [ ] [VF.10] Paketin temiz macOS makinesine kurulup çalıştığını doğrula
