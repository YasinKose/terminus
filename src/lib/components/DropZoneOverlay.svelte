<script lang="ts">
  import { ArrowLeftRight, ChevronsDown, ChevronsLeft, ChevronsRight, ChevronsUp } from 'lucide-svelte';
  export let visible: boolean = false;
  export let activeZone: 'left' | 'right' | 'top' | 'bottom' | 'center' | null = null;
</script>

{#if visible}
  <div class="drop-overlay">
    <!-- Left zone -->
    <div
      class="zone zone-left"
      class:active={activeZone === 'left'}
    >
      <div class="zone-indicator">
        <ChevronsLeft class="w-6 h-6" />
      </div>
    </div>

    <!-- Right zone -->
    <div
      class="zone zone-right"
      class:active={activeZone === 'right'}
    >
      <div class="zone-indicator">
        <ChevronsRight class="w-6 h-6" />
      </div>
    </div>

    <!-- Top zone -->
    <div
      class="zone zone-top"
      class:active={activeZone === 'top'}
    >
      <div class="zone-indicator">
        <ChevronsUp class="w-6 h-6" />
      </div>
    </div>

    <!-- Bottom zone -->
    <div
      class="zone zone-bottom"
      class:active={activeZone === 'bottom'}
    >
      <div class="zone-indicator">
        <ChevronsDown class="w-6 h-6" />
      </div>
    </div>

    <!-- Center zone -->
    <div
      class="zone zone-center"
      class:active={activeZone === 'center'}
    >
      <div class="zone-indicator">
        <ArrowLeftRight class="w-8 h-8" />
        <span class="text-xs mt-1">Swap</span>
      </div>
    </div>
  </div>
{/if}

<style>
  .drop-overlay {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 20;
  }

  .zone {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
    pointer-events: auto;
  }

  .zone-indicator {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 0.5rem;
    border-radius: 0.5rem;
    background: color-mix(in srgb, var(--ui-accent, #3b82f6) 16%, transparent);
    border: 2px dashed color-mix(in srgb, var(--ui-accent, #3b82f6) 34%, transparent);
    color: color-mix(in srgb, var(--ui-accent, #3b82f6) 56%, transparent);
    opacity: 0;
    transform: scale(0.9);
    transition: all 0.15s ease;
  }

  .zone.active .zone-indicator {
    opacity: 1;
    transform: scale(1);
    background: color-mix(in srgb, var(--ui-accent, #3b82f6) 24%, transparent);
    border-color: color-mix(in srgb, var(--ui-accent, #3b82f6) 70%, transparent);
    color: var(--ui-accent, rgb(59, 130, 246));
  }

  .zone-left {
    left: 0;
    top: 20%;
    bottom: 20%;
    width: 25%;
  }

  .zone-right {
    right: 0;
    top: 20%;
    bottom: 20%;
    width: 25%;
  }

  .zone-top {
    top: 0;
    left: 25%;
    right: 25%;
    height: 20%;
  }

  .zone-bottom {
    bottom: 0;
    left: 25%;
    right: 25%;
    height: 20%;
  }

  .zone-center {
    top: 30%;
    left: 30%;
    right: 30%;
    bottom: 30%;
  }

  .zone:hover .zone-indicator,
  .zone.active .zone-indicator {
    opacity: 1;
    transform: scale(1);
  }
</style>
