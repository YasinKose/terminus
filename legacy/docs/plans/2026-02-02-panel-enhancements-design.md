# Panel Enhancements Design Document

**Tarih:** 2026-02-02
**Proje:** Terminus Terminal
**Onaylayan:** Kullanıcı

---

## Özet

Bu döküman, Terminus terminal uygulaması için 3 yeni özelliğin tasarımını içerir:
1. Keyboard Navigation
2. Gelişmiş Drag & Drop (5-zone overlay)
3. Zen Mode

---

## 1. Keyboard Navigation

### Gereksinimler
- Paneller arası klavye ile geçiş
- Terminal word-jump kısayollarıyla çakışma olmaması
- Sezgisel yön bazlı navigasyon

### Tasarım Kararları

| Karar | Seçim | Gerekçe |
|-------|-------|---------|
| Kısayol | `Ctrl+Option+Arrow` | macOS'ta terminal çakışması yok |
| Algoritma | Geometrik hesaplama | Görsel konuma göre en yakın komşuyu bulur |

### Teknik Yaklaşım

#### 1.1 Layout Utility Fonksiyonları

Yeni dosya: `src/lib/utils/layoutUtils.ts`

```typescript
interface PaneRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

// Tree'den tüm terminal'lerin görsel rect'lerini hesapla
function calculatePaneRects(
  node: PaneNode,
  containerRect: { x: number; y: number; width: number; height: number }
): PaneRect[];

// Belirli yönde en yakın komşuyu bul
function findAdjacentPane(
  currentId: string,
  direction: 'left' | 'right' | 'up' | 'down',
  rects: PaneRect[]
): string | null;
```

#### 1.2 Komşu Bulma Algoritması

```
1. Tüm terminal rect'lerini hesapla (sizes[] yüzdelerinden)
2. Aktif terminal'in rect'ini bul
3. Hedef yönde:
   - left/right: Y ekseni overlap kontrolü + en yakın X mesafesi
   - up/down: X ekseni overlap kontrolü + en yakın Y mesafesi
4. Overlap yüzdesi > %50 olan, en yakın komşuyu seç
```

#### 1.3 App.svelte Değişiklikleri

```typescript
// Ctrl+Option+Arrow handling
if (e.ctrlKey && e.altKey && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
  e.preventDefault();
  const direction = e.key.replace('Arrow', '').toLowerCase();
  navigateToPane(direction);
}
```

### Dokunulacak Dosyalar
- `src/lib/utils/layoutUtils.ts` (yeni)
- `src/App.svelte` (keydown handler)
- `src/lib/stores/projectStore.ts` (rect hesaplama helper)

---

## 2. Gelişmiş Drag & Drop (5-Zone Overlay)

### Gereksinimler
- Terminal'leri panel içine sürükleyerek split yapabilme
- Görsel feedback ile drop bölgelerini gösterme
- Cross-workspace ve same-workspace desteği

### Tasarım Kararları

| Karar | Seçim | Gerekçe |
|-------|-------|---------|
| Zone sayısı | 5 (sol, sağ, üst, alt, merkez) | Maksimum esneklik |
| Merkez davranışı | Swap (yer değiştir) | Kullanıcı beklentisi |
| Görsel feedback | Highlight + preview | Profesyonel his |

### Zone Davranışları

```
┌─────────────────────────────┐
│           TOP               │  → Vertical split (üste ekle)
│  ┌─────┐─────────┌─────┐   │
│  │     │         │     │   │
│  │LEFT │ CENTER  │RIGHT│   │  → LEFT/RIGHT: Horizontal split
│  │     │ (SWAP)  │     │   │  → CENTER: Terminal swap
│  └─────┘─────────└─────┘   │
│          BOTTOM             │  → Vertical split (alta ekle)
└─────────────────────────────┘
```

### Teknik Yaklaşım

#### 2.1 DropZoneOverlay Component

Yeni dosya: `src/lib/components/DropZoneOverlay.svelte`

```svelte
<script lang="ts">
  export let visible: boolean = false;
  export let activeZone: 'left' | 'right' | 'top' | 'bottom' | 'center' | null = null;

  function getZoneFromPosition(x: number, y: number, rect: DOMRect): string {
    const relX = (x - rect.left) / rect.width;
    const relY = (y - rect.top) / rect.height;

    // Merkez bölge: %30-%70 arası
    if (relX > 0.3 && relX < 0.7 && relY > 0.3 && relY < 0.7) return 'center';

    // Kenar bölgeleri
    if (relX < 0.3) return 'left';
    if (relX > 0.7) return 'right';
    if (relY < 0.3) return 'top';
    return 'bottom';
  }
</script>
```

#### 2.2 SplitPaneContainer Değişiklikleri

```svelte
<!-- Terminal leaf içinde -->
<div
  class="terminal-pane"
  on:dragover={handleDragOver}
  on:dragleave={handleDragLeave}
  on:drop={handleDrop}
>
  <Terminal ... />

  {#if isDragOver}
    <DropZoneOverlay {activeZone} />
  {/if}
</div>
```

#### 2.3 projectStore Yeni Metodlar

```typescript
// Terminal swap
swapTerminals(projectId, wsId1, termId1, wsId2, termId2): void;

// Belirli yöne split ile ekleme
insertTerminalAtDirection(
  projectId: string,
  workspaceId: string,
  targetTerminalId: string,
  sourceTerminalId: string,
  direction: 'left' | 'right' | 'top' | 'bottom'
): void;
```

### Dokunulacak Dosyalar
- `src/lib/components/DropZoneOverlay.svelte` (yeni)
- `src/lib/components/SplitPaneContainer.svelte` (drag handlers)
- `src/lib/stores/projectStore.ts` (swap, insertAtDirection)

---

## 3. Zen Mode

### Gereksinimler
- Tek tuşla tam odaklanma modu
- Tüm UI chrome'larının gizlenmesi
- Aktif terminal'in maximize edilmesi
- Kolay çıkış (Escape)

### Tasarım Kararları

| Karar | Seçim | Gerekçe |
|-------|-------|---------|
| Gizlenecekler | Sidebar, tabs, titlebar | Tam odaklanma |
| Kısayol | `Cmd+Shift+Z` veya `Cmd+\` | Kolay erişim |
| Çıkış | `Escape` | Standart pattern |

### Teknik Yaklaşım

#### 3.1 uiStore Değişiklikleri

```typescript
// src/lib/stores/uiStore.ts
export const isZenMode = writable<boolean>(false);
```

#### 3.2 App.svelte Değişiklikleri

```svelte
<script>
  import { isZenMode } from './lib/stores/uiStore';

  function handleKeydown(e: KeyboardEvent) {
    // Zen mode toggle: Cmd+Shift+Z
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      isZenMode.update(v => !v);
    }

    // Escape to exit zen mode
    if (e.key === 'Escape' && $isZenMode) {
      e.preventDefault();
      isZenMode.set(false);
    }
  }
</script>

<div class="flex flex-col h-screen" class:zen-mode={$isZenMode}>
  {#if !$isZenMode}
    <TitleBar />
  {/if}

  <div class="flex flex-1">
    {#if !$isZenMode && $isSidebarOpen}
      <Sidebar />
    {/if}

    <main class="flex-1">
      {#if !$isZenMode}
        <WorkspaceTabs ... />
      {/if}

      <!-- Panel container - zen modda full height -->
      <div class="flex-1" class:zen-fullscreen={$isZenMode}>
        <SplitPaneContainer ... />
      </div>
    </main>
  </div>
</div>

<style>
  .zen-mode {
    /* Sadece aktif terminal görünür */
  }

  .zen-fullscreen {
    position: fixed;
    inset: 0;
    z-index: 100;
  }
</style>
```

#### 3.3 Zen Mode'da Panel Davranışı

**Seçenek A (Önerilen):** CSS overlay ile maximize
- Aktif terminal `position: fixed` ile tam ekran
- Diğer paneller DOM'da kalır (xterm instance'lar korunur)
- Çıkışta anında restore

**Seçenek B:** State-based maximize
- `workspace.presentation: { mode: 'zen', terminalId }` state'i
- Daha karmaşık ama daha kontrollü

### Dokunulacak Dosyalar
- `src/lib/stores/uiStore.ts` (isZenMode)
- `src/App.svelte` (conditional rendering, keydown)
- `src/app.css` (zen mode stilleri)

---

## Uygulama Sırası

### Phase 1: Keyboard Navigation
1. `layoutUtils.ts` oluştur
2. Rect hesaplama fonksiyonları
3. App.svelte keydown handler
4. Test: Çoklu split layout'ta navigasyon

### Phase 2: Zen Mode
1. `uiStore.ts` güncelle
2. App.svelte conditional rendering
3. CSS stilleri
4. Test: Toggle + Escape

### Phase 3: Drag & Drop
1. `DropZoneOverlay.svelte` oluştur
2. SplitPaneContainer drag handlers
3. projectStore yeni metodlar (swap, insertAtDirection)
4. Test: Same-workspace + cross-workspace DnD

---

## Validation Kriterleri

- [ ] Keyboard nav: Ctrl+Option+Arrow ile tüm yönlerde geçiş çalışıyor
- [ ] Keyboard nav: Terminal içi komutlarla çakışma yok
- [ ] Drag & Drop: 5 zone görsel feedback çalışıyor
- [ ] Drag & Drop: Swap işlemi doğru çalışıyor
- [ ] Drag & Drop: Split işlemleri doğru yöne ekleme yapıyor
- [ ] Zen Mode: Cmd+Shift+Z ile toggle çalışıyor
- [ ] Zen Mode: Escape ile çıkış çalışıyor
- [ ] Zen Mode: Çıkışta layout korunuyor
- [ ] Tüm özellikler localStorage persistence ile uyumlu

---

## Notlar

- xterm.js `attachCustomKeyEventHandler` ile Ctrl+Option+Arrow yakalanabilir
- Drag & Drop için `svelte-dnd-action` mevcut, ancak custom overlay için native API tercih edilebilir
- Zen mode animasyonu için `svelte/transition` kullanılabilir
