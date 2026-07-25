import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function json(path: string): Record<string, any> {
  return JSON.parse(readFileSync(resolve(process.cwd(), path), "utf8"));
}

describe("desktop platform configuration", () => {
  it("keeps the shared window configuration native and portable", () => {
    const config = json("src-tauri/tauri.conf.json");
    const window = config.app.windows[0];

    expect(config.version).toBe("0.2.0");
    expect(config.app.macOSPrivateApi).toBeUndefined();
    expect(window.titleBarStyle).toBeUndefined();
    expect(window.hiddenTitle).toBeUndefined();
    expect(window.trafficLightPosition).toBeUndefined();
    expect(config.bundle.targets).toBe("all");
  });

  it("isolates macOS overlay chrome from Linux and Windows bundles", () => {
    const mac = json("src-tauri/tauri.macos.conf.json");
    const linux = json("src-tauri/tauri.linux.conf.json");
    const windows = json("src-tauri/tauri.windows.conf.json");

    expect(mac.app.macOSPrivateApi).toBe(true);
    expect(mac.app.windows[0].titleBarStyle).toBe("Overlay");
    expect(mac.bundle.targets).toEqual(["app", "dmg"]);
    expect(linux.bundle.targets).toEqual(["deb", "appimage"]);
    expect(windows.bundle.targets).toEqual(["msi", "nsis"]);
  });

  it("keeps all package manifests on the v0.2 product version", () => {
    const packageJson = json("package.json");
    const cargo = readFileSync(
      resolve(process.cwd(), "src-tauri/Cargo.toml"),
      "utf8",
    );

    expect(packageJson.version).toBe("0.2.0");
    expect(cargo).toMatch(/^version = "0\.2\.0"$/m);
    expect(cargo).toContain(
      'tauri = { version = "2", features = ["macos-private-api"] }',
    );
  });
});
