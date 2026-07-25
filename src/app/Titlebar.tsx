import { useUiStore } from "@/features/ui/uiStore";

export function Titlebar() {
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);

  return (
    <header
      className="flex h-10 shrink-0 items-center border-b border-border bg-card text-sm"
      data-tauri-drag-region
    >
      <div
        className="w-[78px] shrink-0"
        aria-hidden
        data-tauri-drag-region
        data-traffic-light-inset
      />
      <button
        type="button"
        className="ml-1 inline-flex h-7 items-center rounded-md px-2 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        onClick={toggleSidebar}
        aria-label={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
        aria-pressed={!sidebarCollapsed}
      >
        {sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
      </button>
      <div className="flex-1" data-tauri-drag-region />
      <span
        className="pr-3 text-xs font-medium tracking-tight text-muted-foreground"
        data-tauri-drag-region
      >
        Terminus
      </span>
    </header>
  );
}
