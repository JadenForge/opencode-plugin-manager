import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test } from "bun:test";
import { generateLatestJson } from "./generate-latest-json";

const fixtureDir = "scripts/__fixtures__/sample-downloads";

describe("generateLatestJson", () => {
  test("generates a static Tauri updater manifest for macOS and Windows", async () => {
    const latest = await generateLatestJson({
      downloads: fixtureDir,
      notes: "Release notes",
      out: null,
      pubDate: "2026-07-07T00:00:00.000Z",
      repo: "JadenForge/opencode-plugin-manager",
      version: "0.4.2",
    });

    expect(latest).toEqual({
      notes: "Release notes",
      pub_date: "2026-07-07T00:00:00.000Z",
      version: "0.4.2",
      platforms: {
        "darwin-aarch64": {
          signature: "MOCK_SIG_MAC",
          url: "https://github.com/JadenForge/opencode-plugin-manager/releases/download/v0.4.2/opencode-plugin-manager_0.4.2_aarch64-apple-darwin.tar.gz",
        },
        "windows-x86_64": {
          signature: "MOCK_SIG_WIN",
          url: "https://github.com/JadenForge/opencode-plugin-manager/releases/download/v0.4.2/opencode-plugin-manager_0.4.2_x86_64-pc-windows-msvc.zip",
        },
      },
    });
  });

  test("fails when no recognized updater archive exists", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "latest-json-empty-"));

    try {
      await writeFile(join(tempDir, "ignored.txt"), "ignored");

      await expect(
        generateLatestJson({
          downloads: tempDir,
          notes: "Release notes",
          out: null,
          pubDate: "2026-07-07T00:00:00.000Z",
          repo: "JadenForge/opencode-plugin-manager",
          version: "0.4.2",
        }),
      ).rejects.toThrow("No recognized updater archives found.");
    } finally {
      await rm(tempDir, { force: true, recursive: true });
    }
  });

  test("recognizes Windows NSIS exe updater artifacts", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "latest-json-nsis-"));

    try {
      const exePath = join(tempDir, "opencode-plugin-manager_0.4.5_x64-setup.exe");
      await writeFile(exePath, "exe");
      await writeFile(`${exePath}.sig`, "MOCK_SIG_NSIS");

      const latest = await generateLatestJson({
        downloads: tempDir,
        notes: "Release notes",
        out: null,
        pubDate: "2026-07-07T00:00:00.000Z",
        repo: "JadenForge/opencode-plugin-manager",
        version: "0.4.5",
      });

      expect(latest.platforms["windows-x86_64"]).toEqual({
        signature: "MOCK_SIG_NSIS",
        url: "https://github.com/JadenForge/opencode-plugin-manager/releases/download/v0.4.5/opencode-plugin-manager_0.4.5_x64-setup.exe",
      });
    } finally {
      await rm(tempDir, { force: true, recursive: true });
    }
  });

  test("fails when a recognized archive is missing its signature", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "latest-json-missing-sig-"));

    try {
      await writeFile(join(tempDir, "opencode-plugin-manager_0.4.2_x86_64-pc-windows-msvc.zip"), "zip");

      await expect(
        generateLatestJson({
          downloads: tempDir,
          notes: "Release notes",
          out: null,
          pubDate: "2026-07-07T00:00:00.000Z",
          repo: "JadenForge/opencode-plugin-manager",
          version: "0.4.2",
        }),
      ).rejects.toThrow("Missing signature");
    } finally {
      await rm(tempDir, { force: true, recursive: true });
    }
  });
});
