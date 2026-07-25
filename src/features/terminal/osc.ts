export function parseOsc7Cwd(payload: string): string | null {
  const raw = payload.trim();
  if (!raw) return null;

  if (raw.startsWith("file://")) {
    try {
      const url = new URL(raw);
      if (url.protocol !== "file:") return null;
      let path = decodeURIComponent(url.pathname);
      if (/^\/[A-Za-z]:\//.test(path)) {
        path = path.slice(1);
      }
      return path || null;
    } catch {
      return null;
    }
  }

  if (raw.startsWith("/")) {
    return raw;
  }

  return null;
}

export function sanitizeTitle(title: string, maxLen = 200): string {
  const cleaned = title.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  if (!cleaned) return "Terminal";
  if (cleaned.length <= maxLen) return cleaned;
  return cleaned.slice(0, maxLen);
}
