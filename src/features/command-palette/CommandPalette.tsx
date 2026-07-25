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
      <DialogContent className="gap-2 p-3 sm:max-w-md">
        <DialogHeader className="sr-only">
          <DialogTitle>Command palette</DialogTitle>
        </DialogHeader>
        <Input
          autoFocus
          placeholder="Type a command…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              void run(active);
            }
          }}
        />
        <ul className="max-h-64 overflow-auto">
          {filtered.length === 0 && (
            <li className="px-2 py-2 text-xs text-muted-foreground">
              No matching commands
            </li>
          )}
          {filtered.map((cmd, i) => (
            <li key={cmd.id}>
              <button
                type="button"
                className={`w-full rounded px-2 py-1.5 text-left text-sm ${
                  i === active
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-muted"
                }`}
                onMouseEnter={() => setActive(i)}
                onClick={() => void run(i)}
              >
                {cmd.label}
              </button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
