import { AlertTriangle, Braces, FileCode2, LockKeyhole, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSourcePreviewStore } from "./sourcePreviewStore";
import { SourceCodeView, sourceLanguageName } from "./SourceCodeView";

function fileBaseName(path: string): string {
  const parts = path.split(/[/\\]/).filter(Boolean);
  return parts[parts.length - 1] ?? path;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

function sourceLabel(source: "worktree" | "head"): string {
  return source === "head" ? "HEAD snapshot" : "Working tree";
}

export function SourcePreviewWorkspace() {
  const path = useSourcePreviewStore((state) => state.path);
  const status = useSourcePreviewStore((state) => state.status);
  const document = useSourcePreviewStore((state) => state.document);
  const loading = useSourcePreviewStore((state) => state.loading);
  const error = useSourcePreviewStore((state) => state.error);
  const close = useSourcePreviewStore((state) => state.close);

  if (!path) return null;

  return (
    <section
      className="source-lens flex h-full min-h-0 flex-col overflow-hidden bg-background"
      aria-label="Source preview"
      role="region"
    >
      <header className="relative flex min-h-14 shrink-0 items-center gap-3 border-b border-border/80 bg-chrome px-3 py-2 shadow-[0_1px_0_rgb(255_255_255/0.025)_inset] sm:px-4">
        <span
          className="absolute inset-y-2 left-0 w-0.5 rounded-r-full bg-primary"
          aria-hidden
        />
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/75 bg-surface-raised text-primary shadow-[0_1px_0_rgb(255_255_255/0.04)_inset]">
          <FileCode2 className="size-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="truncate text-[13px] font-semibold tracking-[-0.01em]">
              {fileBaseName(path)}
            </h2>
            {status ? (
              <span className="shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-primary ring-1 ring-inset ring-primary/20">
                {status}
              </span>
            ) : null}
          </div>
          <p
            className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground"
            translate="no"
          >
            {path}
          </p>
        </div>
        <div className="hidden items-center gap-1.5 text-[10px] text-muted-foreground md:flex">
          <span className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-background/45 px-2 py-1">
            <Braces className="size-3" aria-hidden />
            {sourceLanguageName(path)}
          </span>
          <span className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-background/45 px-2 py-1">
            <LockKeyhole className="size-3" aria-hidden />
            Read only
          </span>
        </div>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className="shrink-0"
          aria-label="Close source preview"
          onClick={close}
        >
          <X className="size-4" aria-hidden />
        </Button>
      </header>

      <div className="relative min-h-0 flex-1 bg-surface-sunken/45">
        {loading ? (
          <div
            className="grid h-full grid-cols-[3.25rem_1fr] overflow-hidden"
            aria-label="Loading source file"
          >
            <div className="border-r border-border/60 bg-surface-sunken/70" />
            <div className="space-y-3 p-6">
              {[72, 46, 88, 62, 79, 38, 91, 54].map((width, index) => (
                <span
                  key={`${width}:${index}`}
                  className="block h-2 animate-pulse rounded-full bg-muted motion-reduce:animate-none"
                  style={{ width: `${width}%`, animationDelay: `${index * 35}ms` }}
                />
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center p-6">
            <div className="max-w-sm rounded-xl border border-status-warning/25 bg-surface-raised p-5 text-center shadow-panel">
              <span className="mx-auto flex size-9 items-center justify-center rounded-lg bg-status-warning/10 text-status-warning">
                <AlertTriangle className="size-4" aria-hidden />
              </span>
              <h3 className="mt-3 text-sm font-semibold">
                Could not preview file
              </h3>
              <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                {error}
              </p>
              <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
                Choose a UTF-8 text file smaller than 2 MiB from Source control.
              </p>
            </div>
          </div>
        ) : document ? (
          <SourceCodeView value={document.content} path={document.path} />
        ) : null}
      </div>

      <footer className="flex h-7 shrink-0 items-center justify-between gap-3 overflow-hidden border-t border-border/70 bg-chrome px-3 font-mono text-[9px] uppercase tracking-[0.08em] text-muted-foreground sm:px-4">
        <span className="shrink-0">
          {document ? sourceLabel(document.source) : "Source lens"}
        </span>
        <span
          className="flex min-w-0 items-center gap-3 whitespace-nowrap"
          translate="no"
        >
          <span className="hidden sm:inline">{sourceLanguageName(path)}</span>
          <span className="hidden md:inline">UTF-8</span>
          {document ? <span>{formatBytes(document.byteSize)}</span> : null}
          <span>Read only</span>
        </span>
      </footer>
    </section>
  );
}
