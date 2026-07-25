<script lang="ts">
  import { fade, scale } from 'svelte/transition';
  import { AlertTriangle, Trash2, X } from 'lucide-svelte';

  interface Props {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    kind?: 'warning' | 'danger' | 'info';
    onConfirm: () => void;
    onCancel: () => void;
  }

  let {
    title = 'Onay',
    message,
    confirmText = 'Evet',
    cancelText = 'İptal',
    kind = 'warning',
    onConfirm,
    onCancel
  }: Props = $props();

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      onConfirm();
    }
  }

  const iconColors = {
    warning: 'text-amber-400',
    danger: 'text-red-400',
    info: 'text-blue-400'
  };

  const buttonColors = {
    warning: 'bg-amber-600 hover:bg-amber-500',
    danger: 'bg-red-600 hover:bg-red-500',
    info: 'bg-blue-600 hover:bg-blue-500'
  };
</script>

<svelte:window on:keydown={handleKeydown} />

<div
  class="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
  transition:fade={{ duration: 150 }}
  onclick={onCancel}
  onkeydown={handleKeydown}
  role="dialog"
  aria-modal="true"
  aria-labelledby="dialog-title"
  aria-describedby="dialog-message"
  tabindex="-1"
>
  <div
    class="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden"
    transition:scale={{ duration: 200, start: 0.95 }}
    onclick={(e) => e.stopPropagation()}
    role="presentation"
  >
    <!-- Header -->
    <div class="flex items-center gap-3 px-5 py-4 border-b border-zinc-800">
      <div class="p-2 rounded-full bg-zinc-800 {iconColors[kind]}">
        {#if kind === 'danger'}
          <Trash2 class="w-5 h-5" />
        {:else}
          <AlertTriangle class="w-5 h-5" />
        {/if}
      </div>
      <h2 id="dialog-title" class="text-lg font-semibold text-zinc-100 flex-1">
        {title}
      </h2>
      <button
        onclick={onCancel}
        class="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
        aria-label="Kapat"
      >
        <X class="w-5 h-5" />
      </button>
    </div>

    <!-- Content -->
    <div class="px-5 py-4">
      <p id="dialog-message" class="text-sm text-zinc-300 leading-relaxed">
        {message}
      </p>
    </div>

    <!-- Actions -->
    <div class="flex items-center justify-end gap-3 px-5 py-4 bg-zinc-950/50 border-t border-zinc-800">
      <button
        onclick={onCancel}
        class="px-4 py-2 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
      >
        {cancelText}
      </button>
      <button
        onclick={onConfirm}
        class="px-4 py-2 text-sm font-medium text-white {buttonColors[kind]} rounded-lg transition-colors"
      >
        {confirmText}
      </button>
    </div>
  </div>
</div>
