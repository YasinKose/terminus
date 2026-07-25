export type DesktopPlatform = "macos" | "windows" | "linux" | "unknown";

export type NavigatorPlatformHint = {
  platform?: string;
  userAgent?: string;
};

export function detectDesktopPlatform(
  hint: NavigatorPlatformHint | undefined =
    typeof navigator === "undefined" ? undefined : navigator,
): DesktopPlatform {
  const value = `${hint?.platform ?? ""} ${hint?.userAgent ?? ""}`.toLowerCase();
  if (value.includes("mac")) return "macos";
  if (value.includes("win")) return "windows";
  if (value.includes("linux") || value.includes("x11")) return "linux";
  return "unknown";
}

export function isAppleDesktop(hint?: NavigatorPlatformHint): boolean {
  return detectDesktopPlatform(
    hint ?? (typeof navigator === "undefined" ? undefined : navigator),
  ) === "macos";
}
