# Snippet System Design Document

**Tarih:** 2026-02-03
**Proje:** Terminus Terminal
**Onaylayan:** Kullanıcı

---

## Özet

Terminal komutlarını yedekleyebileceğimiz bir snippet yönetim sistemi. Global veya proje bazlı saklama, açık workspace'lerde veya yeni workspace'te komutu çalıştırma butonu.

---

## Tasarım Kararları

| Karar | Seçim | Gerekçe |
|-------|-------|---------|
| Kapsam | Global + Proje bazlı | Hem paylaşımlı hem özel snippet'ler |
| Oluşturma | History + Manuel | Esneklik |
| Çalıştırma | Dropdown menü | Hedef workspace seçimi |
| UI Konumu | Sidebar tab | Kolay erişim |
| Özellikler | Kategoriler, Favoriler | Organizasyon |
| Depolama | localStorage | Mevcut yapıyla uyumlu |

---

## Veri Modeli

### Snippet Interface

```typescript
// src/lib/types/snippet.ts

export interface Snippet {
  id: string;
  name: string;           // Snippet başlığı
  command: string;        // Terminal komutu
  description?: string;   // Opsiyonel açıklama
  category: string;       // Kategori ID
  isFavorite: boolean;    // Favori mi?
  scope: 'global' | 'project';  // Kapsam
  projectId?: string;     // scope='project' ise hangi proje
  createdAt: number;      // Timestamp
  updatedAt: number;
}

export interface SnippetCategory {
  id: string;
  name: string;
  icon: string;           // Lucide icon adı
}

export const DEFAULT_CATEGORIES: SnippetCategory[] = [
  { id: 'build', name: 'Build', icon: 'Hammer' },
  { id: 'deploy', name: 'Deploy', icon: 'Rocket' },
  { id: 'git', name: 'Git', icon: 'GitBranch' },
  { id: 'test', name: 'Test', icon: 'FlaskConical' },
  { id: 'docker', name: 'Docker', icon: 'Container' },
  { id: 'other', name: 'Diğer', icon: 'Terminal' }
];
```

### Depolama Anahtarları

- `terminus_snippets` → Tüm snippet'ler (global + proje bazlı)
- `terminus_snippet_categories` → Özel kategoriler (opsiyonel)

---

## Bileşenler

### 1. snippetStore.ts

```typescript
// Temel metodlar:
- addSnippet(snippet: Omit<Snippet, 'id' | 'createdAt' | 'updatedAt'>)
- updateSnippet(id: string, updates: Partial<Snippet>)
- deleteSnippet(id: string)
- toggleFavorite(id: string)
- getGlobalSnippets(): Snippet[]
- getProjectSnippets(projectId: string): Snippet[]
```

### 2. Sidebar.svelte Değişiklikleri

Mevcut sidebar'a iki tab eklenecek:
- **Projects** (mevcut)
- **Snippets** (yeni)

Tab switching için basit state.

### 3. SnippetList.svelte (Yeni)

- Kategori filtreleme
- Favori filtreleme
- Global/Proje toggle
- Her snippet için:
  - İsim ve komut önizleme
  - Favori yıldızı
  - Çalıştır dropdown butonu
  - Düzenle/Sil butonları

### 4. SnippetForm.svelte (Yeni)

- İsim input
- Komut textarea
- Açıklama (opsiyonel)
- Kategori seçimi
- Kapsam seçimi (Global/Proje)

### 5. RunSnippetDropdown.svelte (Yeni)

Açık workspace'leri listeler + "Yeni Workspace" seçeneği.

---

## Akış

### Snippet Oluşturma

```
1. Sidebar'da Snippets tab'ına git
2. "+" butonuna tıkla VEYA Terminal'de sağ tık → "Save as Snippet"
3. Form doldur (isim, komut, kategori, kapsam)
4. Kaydet
```

### Snippet Çalıştırma

```
1. Snippet satırındaki "▶" butonuna tıkla
2. Dropdown açılır:
   - Workspace 1
   - Workspace 2
   - ---
   - + Yeni Workspace
3. Hedef seç
4. Komut ilgili terminal'e yazılır ve çalıştırılır
```

---

## Dokunulacak Dosyalar

| Dosya | İşlem |
|-------|-------|
| `src/lib/types/snippet.ts` | Yeni |
| `src/lib/stores/snippetStore.ts` | Yeni |
| `src/lib/components/Sidebar.svelte` | Güncelle (tab ekle) |
| `src/lib/components/SnippetList.svelte` | Yeni |
| `src/lib/components/SnippetForm.svelte` | Yeni |
| `src/lib/components/SnippetItem.svelte` | Yeni |

---

## Validation Kriterleri

- [ ] Snippet ekleme/düzenleme/silme çalışıyor
- [ ] Global ve proje bazlı filtreleme çalışıyor
- [ ] Kategori filtreleme çalışıyor
- [ ] Favori toggle çalışıyor
- [ ] Dropdown ile workspace seçimi çalışıyor
- [ ] Yeni workspace'te çalıştırma çalışıyor
- [ ] localStorage persistence çalışıyor
