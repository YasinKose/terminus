<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { SplitDirection } from '../types/workspace';

  export let direction: SplitDirection;
  export let containerId: string;
  export let index: number; // Index of the divider (between child[index] and child[index+1])

  const dispatch = createEventDispatcher<{
    resize: { containerId: string; index: number; delta: number };
    resizeEnd: { containerId: string };
  }>();

  let isDragging = false;
  let startPos = 0;

  function handleMouseDown(e: MouseEvent) {
    e.preventDefault();
    isDragging = true;
    startPos = direction === 'horizontal' ? e.clientX : e.clientY;

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = direction === 'horizontal' ? 'ew-resize' : 'ns-resize';
    document.body.style.userSelect = 'none';
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isDragging) return;

    const currentPos = direction === 'horizontal' ? e.clientX : e.clientY;
    const delta = currentPos - startPos;
    startPos = currentPos;

    dispatch('resize', { containerId, index, delta });
  }

  function handleMouseUp() {
    isDragging = false;
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    dispatch('resizeEnd', { containerId });
  }
</script>

<div
  class="divider {direction}"
  class:dragging={isDragging}
  on:mousedown={handleMouseDown}
  role="separator"
  aria-orientation={direction === 'horizontal' ? 'vertical' : 'horizontal'}
  tabindex="0"
></div>

<style>
  .divider {
    flex-shrink: 0;
    background-color: transparent;
    transition: background-color 0.15s ease;
    z-index: 10;
  }

  .divider:hover,
  .divider.dragging {
    background-color: #3b82f6;
  }

  .divider.horizontal {
    width: 4px;
    cursor: ew-resize;
    margin: 0 -2px;
  }

  .divider.vertical {
    height: 4px;
    cursor: ns-resize;
    margin: -2px 0;
  }
</style>
