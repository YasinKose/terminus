import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { buildCommands, filterCommands } from "./commandRegistry";
import type { CommandContext } from "./commandRegistry";
import { Command, CornerDownLeft, Search } from "lucide-react";
import { useSettingsStore } from "@/features/settings/settingsStore";
import {
  formatChordMac,
  type ShortcutMap,
} from "@/features/settings/shortcutModel";

export type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: CommandContext;
};

export function CommandPalette({
  open,
  onOpenChange,
  context,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const shortcuts = useSettingsStore((s) => s.shortcuts);

  const commands = useMemo(() => buildCommands(context), [context]);
  const filtered = useMemo(
    () => filterCommands(commands, query),
    [commands, query],
  );

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
    }
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  const run = async (index: number) => {
    const cmd = filtered[index];
    if (!cmd) return;
    onOpenChange(false);
    await cmd.run();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="gap-0 overflow-hidden p-0 sm:max-w-[34rem]"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Command palette</DialogTitle>
        </DialogHeader>
        <div className="flex h-13 items-center gap-2 border-b border-border/90 px-3">
          <Search
            aria-hidden
            className="size-4 shrink-0 text-muted-foreground"
          />
          <Input
            autoFocus
            name="command-search"
            autoComplete="off"
            spellCheck={false}
            aria-label="Search commands"
            placeholder="Search commands…"
            className="h-11 border-0 bg-transparent px-0 shadow-none hover:border-0 focus-visible:border-0 focus-visible:bg-transparent focus-visible:ring-0"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((i) =>
                  Math.min(i + 1, Math.max(filtered.length - 1, 0)),
                );
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                void run(active);
              }
            }}
          />
          <kbd className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground shadow-[0_1px_0_rgb(255_255_255/0.04)_inset]">
            esc
          </kbd>
        </div>
        <ul className="max-h-80 overflow-auto p-2">
          {filtered.length === 0 && (
            <li className="flex flex-col items-center px-4 py-10 text-center">
              <Command
                aria-hidden
                className="mb-2 size-5 text-muted-foreground"
              />
              <span className="text-sm font-medium text-foreground">
                No matching commands
              </span>
              <span className="mt-1 text-xs text-muted-foreground">
                Try a project, workspace, or action name.
              </span>
            </li>
          )}
          {filtered.map((cmd, i) => {
            const shortcut =
              cmd.id in shortcuts
                ? formatChordMac(shortcuts[cmd.id as keyof ShortcutMap])
                : null;
            return (
              <li key={cmd.id}>
                <button
                  type="button"
                  className={`flex h-9 w-full items-center gap-3 rounded-lg px-2.5 text-left text-sm outline-none transition-colors duration-100 focus-visible:ring-2 focus-visible:ring-ring/35 ${
                    i === active
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => void run(i)}
                >
                  <Command
                    aria-hidden
                    className={`size-3.5 shrink-0 ${
                      i === active ? "text-primary" : "text-muted-foreground"
                    }`}
                  />
                  <span className="min-w-0 flex-1 truncate">{cmd.label}</span>
                  {shortcut ? (
                    <kbd className="shrink-0 font-mono text-[10px] text-muted-foreground">
                      {shortcut}
                    </kbd>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="flex h-9 items-center justify-between border-t border-border/80 bg-chrome px-3 text-[10px] text-muted-foreground">
          <span className="font-mono tabular-nums">
            {filtered.length} {filtered.length === 1 ? "command" : "commands"}
          </span>
          <span className="flex items-center gap-2">
            <span>↑↓ Navigate</span>
            <span className="flex items-center gap-1">
              <CornerDownLeft aria-hidden className="size-3" />
              Run
            </span>
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
