<script lang="ts">
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
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
        </svg>
      </div>
    </div>

    <!-- Right zone -->
    <div
      class="zone zone-right"
      class:active={activeZone === 'right'}
    >
      <div class="zone-indicator">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
        </svg>
      </div>
    </div>

    <!-- Top zone -->
    <div
      class="zone zone-top"
      class:active={activeZone === 'top'}
    >
      <div class="zone-indicator">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 11l7-7 7 7M5 19l7-7 7 7" />
        </svg>
      </div>
    </div>

    <!-- Bottom zone -->
    <div
      class="zone zone-bottom"
      class:active={activeZone === 'bottom'}
    >
      <div class="zone-indicator">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 13l-7 7-7-7m14-8l-7 7-7-7" />
        </svg>
      </div>
    </div>

    <!-- Center zone -->
    <div
      class="zone zone-center"
      class:active={activeZone === 'center'}
    >
      <div class="zone-indicator">
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
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
    background: rgba(59, 130, 246, 0.1);
    border: 2px dashed rgba(59, 130, 246, 0.3);
    color: rgba(59, 130, 246, 0.5);
    opacity: 0;
    transform: scale(0.9);
    transition: all 0.15s ease;
  }

  .zone.active .zone-indicator {
    opacity: 1;
    transform: scale(1);
    background: rgba(59, 130, 246, 0.2);
    border-color: rgba(59, 130, 246, 0.6);
    color: rgb(59, 130, 246);
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
