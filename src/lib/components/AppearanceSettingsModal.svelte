<script lang="ts">
  import { Check, Settings2, X } from 'lucide-svelte';
  import { isAppearanceSettingsOpen } from '../stores/uiStore';
  import {
    appearanceSettings,
    appearanceTemplates,
    setAppearanceTemplate,
    updateAppearanceSettings,
    resetAppearanceSettings,
    resolveAppearance
  } from '../stores/appearanceStore';

  function closeModal() {
    isAppearanceSettingsOpen.set(false);
  }

  function handleBorderWidthInput(value: string) {
    updateAppearanceSettings({ paneBorderWidth: Number(value) });
  }

  function handleBorderRadiusInput(value: string) {
    updateAppearanceSettings({ paneBorderRadius: Number(value) });
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      closeModal();
    }
  }

  function handleOverlayClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      closeModal();
    }
  }
</script>

{#if $isAppearanceSettingsOpen}
  <div
    class="overlay"
    role="button"
    tabindex="0"
    aria-label="Close appearance settings"
    on:click={handleOverlayClick}
    on:keydown={handleKeydown}
  >
    <div class="modal" role="dialog" tabindex="-1" aria-modal="true" aria-labelledby="appearance-title">
      <div class="modal-header">
        <div class="title-block">
          <Settings2 size={16} />
          <h2 id="appearance-title">Appearance Settings</h2>
        </div>
        <button class="icon-btn" on:click={closeModal} aria-label="Close settings">
          <X size={16} />
        </button>
      </div>

      <section class="section">
        <h3>Templates</h3>
        <p class="section-description">Select a ready-made visual style for terminal panes.</p>
        <div class="template-grid">
          {#each appearanceTemplates as template}
            {@const preview = resolveAppearance({ ...$appearanceSettings, templateId: template.id })}
            <button
              class="template-card"
              class:selected={$appearanceSettings.templateId === template.id}
              on:click={() => setAppearanceTemplate(template.id)}
              type="button"
            >
              <div
                class="template-preview"
                style="
                  --preview-bg: {preview.paneBackground};
                  --preview-toolbar-bg: {preview.toolbarBackground};
                  --preview-border: {preview.paneBorderColor};
                  --preview-active-border: {preview.effectiveActiveBorderColor};
                "
              >
                <div class="preview-toolbar"></div>
                <div class="preview-pane"></div>
              </div>
              <div class="template-meta">
                <div class="template-title">
                  <span>{template.name}</span>
                  {#if $appearanceSettings.templateId === template.id}
                    <Check size={14} />
                  {/if}
                </div>
                <p>{template.description}</p>
              </div>
            </button>
          {/each}
        </div>
      </section>

      <section class="section">
        <h3>Pane Border</h3>
        <p class="section-description">Control border visibility and corner style for each terminal pane.</p>
        <label class="control-row">
          <span>Border width</span>
          <div class="control-inputs">
            <input
              type="range"
              min="0"
              max="4"
              step="1"
              value={$appearanceSettings.paneBorderWidth}
              on:input={(e) => handleBorderWidthInput((e.currentTarget as HTMLInputElement).value)}
            />
            <span class="value-badge">{$appearanceSettings.paneBorderWidth}px</span>
          </div>
        </label>

        <label class="control-row">
          <span>Corner radius</span>
          <div class="control-inputs">
            <input
              type="range"
              min="0"
              max="16"
              step="1"
              value={$appearanceSettings.paneBorderRadius}
              on:input={(e) => handleBorderRadiusInput((e.currentTarget as HTMLInputElement).value)}
            />
            <span class="value-badge">{$appearanceSettings.paneBorderRadius}px</span>
          </div>
        </label>

        <label class="toggle-row">
          <input
            type="checkbox"
            checked={$appearanceSettings.highlightActivePane}
            on:change={(e) => updateAppearanceSettings({ highlightActivePane: (e.currentTarget as HTMLInputElement).checked })}
          />
          <span>Highlight active terminal border</span>
        </label>
      </section>

      <div class="modal-actions">
        <button class="secondary" on:click={resetAppearanceSettings} type="button">Reset to defaults</button>
        <button class="primary" on:click={closeModal} type="button">Done</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    z-index: 80;
    background: rgba(0, 0, 0, 0.55);
    backdrop-filter: blur(3px);
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 20px;
  }

  .modal {
    width: min(760px, 100%);
    max-height: min(720px, 100%);
    overflow: auto;
    border: 1px solid #3f3f46;
    border-radius: 14px;
    background: #111115;
    box-shadow: 0 24px 56px rgba(0, 0, 0, 0.45);
    padding: 18px;
    color: #e4e4e7;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
  }

  .title-block {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: #f4f4f5;
  }

  .title-block h2 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
  }

  .icon-btn {
    width: 28px;
    height: 28px;
    border: 1px solid #3f3f46;
    border-radius: 6px;
    background: #18181b;
    color: #d4d4d8;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .icon-btn:hover {
    border-color: #71717a;
    color: #fafafa;
  }

  .section {
    padding: 12px;
    border: 1px solid #27272a;
    border-radius: 10px;
    background: #0f0f13;
  }

  .section + .section {
    margin-top: 12px;
  }

  .section h3 {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    color: #f4f4f5;
  }

  .section-description {
    margin: 6px 0 12px;
    color: #a1a1aa;
    font-size: 12px;
  }

  .template-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 10px;
  }

  .template-card {
    border: 1px solid #3f3f46;
    border-radius: 10px;
    padding: 10px;
    background: #18181b;
    color: inherit;
    cursor: pointer;
    text-align: left;
  }

  .template-card:hover {
    border-color: #71717a;
  }

  .template-card.selected {
    border-color: #60a5fa;
    box-shadow: 0 0 0 1px rgba(96, 165, 250, 0.4);
  }

  .template-preview {
    height: 68px;
    border: 1px solid #3f3f46;
    border-radius: 8px;
    overflow: hidden;
    background: #09090b;
    margin-bottom: 8px;
    display: flex;
    flex-direction: column;
  }

  .preview-toolbar {
    height: 18px;
    border-bottom: 1px solid var(--preview-border);
    background: var(--preview-toolbar-bg);
  }

  .preview-pane {
    flex: 1;
    border-left: 3px solid var(--preview-active-border);
    background: var(--preview-bg);
  }

  .template-meta {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .template-title {
    display: inline-flex;
    align-items: center;
    justify-content: space-between;
    font-size: 12px;
    font-weight: 600;
    color: #f4f4f5;
  }

  .template-meta p {
    margin: 0;
    font-size: 11px;
    color: #a1a1aa;
    line-height: 1.35;
  }

  .control-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 10px;
    font-size: 12px;
  }

  .control-inputs {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-width: 230px;
  }

  .control-inputs input[type='range'] {
    flex: 1;
    accent-color: #60a5fa;
  }

  .value-badge {
    min-width: 44px;
    text-align: right;
    color: #a1a1aa;
    font-size: 11px;
  }

  .toggle-row {
    margin-top: 10px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: #d4d4d8;
  }

  .toggle-row input[type='checkbox'] {
    accent-color: #60a5fa;
  }

  .modal-actions {
    margin-top: 14px;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }

  .modal-actions button {
    border: 1px solid #3f3f46;
    border-radius: 8px;
    padding: 7px 12px;
    font-size: 12px;
    cursor: pointer;
  }

  .modal-actions .secondary {
    background: #18181b;
    color: #d4d4d8;
  }

  .modal-actions .secondary:hover {
    border-color: #71717a;
  }

  .modal-actions .primary {
    background: #2563eb;
    border-color: #2563eb;
    color: #eff6ff;
  }

  .modal-actions .primary:hover {
    background: #1d4ed8;
    border-color: #1d4ed8;
  }
</style>
