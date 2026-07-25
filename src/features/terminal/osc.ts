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

const MAX_OSC_NOTIFICATION_LENGTH = 512;

function validNotificationText(value: string): boolean {
  return (
    value.length > 0 &&
    value.length <= MAX_OSC_NOTIFICATION_LENGTH &&
    !Array.from(value).some((char) => {
      const code = char.charCodeAt(0);
      return code < 0x20 && char !== "\t";
    })
  );
}

export function isSupportedOscNotification(
  code: 9 | 777,
  data: string,
): boolean {
  if (code === 9) return validNotificationText(data);
  const [kind, ...parts] = data.split(";");
  return kind === "notify" && validNotificationText(parts.join(";"));
}
