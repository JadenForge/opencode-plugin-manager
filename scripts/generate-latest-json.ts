import { readdir, readFile, writeFile } from "node:fs/promises";
import { basename, join, relative } from "node:path";

export interface CliOptions {
  readonly downloads: string;
  readonly out: string | null;
  readonly version: string;
  readonly notes: string;
  readonly pubDate: string;
  readonly repo: string;
}

export interface PlatformEntry {
  readonly signature: string;
  readonly url: string;
}

export interface LatestJson {
  readonly version: string;
  readonly notes: string;
  readonly pub_date: string;
  readonly platforms: Record<string, PlatformEntry>;
}

const DEFAULT_REPO = "JadenForge/opencode-plugin-manager";

const parseArgs = (args: readonly string[]): CliOptions => {
  const getValue = (name: string) => {
    const index = args.indexOf(name);

    if (index === -1) {
      return null;
    }

    return args[index + 1] ?? null;
  };

  const version = getValue("--version");
  const downloads = getValue("--downloads") ?? process.env.DOWNLOADS_DIR;

  if (version === null || version.trim().length === 0) {
    throw new Error("Missing required --version argument.");
  }

  if (downloads === undefined || downloads.trim().length === 0) {
    throw new Error("Missing required --downloads argument or DOWNLOADS_DIR environment variable.");
  }

  return {
    downloads,
    notes: getValue("--notes") ?? "See release notes.",
    out: getValue("--out"),
    pubDate: getValue("--pub-date") ?? new Date().toISOString(),
    repo: getValue("--repo") ?? DEFAULT_REPO,
    version,
  };
};

const walkFiles = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);

      if (entry.isDirectory()) {
        return walkFiles(path);
      }

      return [path];
    }),
  );

  return nested.flat();
};

const isArchive = (path: string) => {
  if (path.endsWith(".sig")) {
    return false;
  }

  return path.endsWith(".tar.gz") || path.endsWith(".zip") || path.endsWith(".exe");
};

const platformKeyFor = (fileName: string) => {
  if (fileName.includes("aarch64-apple-darwin")) {
    return "darwin-aarch64";
  }

  if (fileName.includes("x86_64-pc-windows-msvc") || fileName.endsWith("_x64-setup.exe")) {
    return "windows-x86_64";
  }

  return null;
};

const releaseAssetUrl = (repo: string, tag: string, assetName: string) =>
  `https://github.com/${repo}/releases/download/${tag}/${encodeURIComponent(assetName)}`;

export const generateLatestJson = async (options: CliOptions): Promise<LatestJson> => {
  const files = await walkFiles(options.downloads);
  const archives = files.filter(isArchive).sort((left, right) => left.localeCompare(right));
  const platforms: Record<string, PlatformEntry> = {};
  const tag = `v${options.version}`;

  for (const archive of archives) {
    const assetName = basename(archive);
    const platformKey = platformKeyFor(assetName);

    if (platformKey === null) {
      continue;
    }

    const signaturePath = `${archive}.sig`;

    if (!files.includes(signaturePath)) {
      throw new Error(`Missing signature for ${relative(options.downloads, archive)}.`);
    }

    platforms[platformKey] = {
      signature: (await readFile(signaturePath, "utf8")).trim(),
      url: releaseAssetUrl(options.repo, tag, assetName),
    };
  }

  if (Object.keys(platforms).length === 0) {
    throw new Error("No recognized updater archives found.");
  }

  return {
    notes: options.notes,
    platforms,
    pub_date: options.pubDate,
    version: options.version,
  };
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  const latestJson = await generateLatestJson(options);
  const content = `${JSON.stringify(latestJson, null, 2)}\n`;

  if (options.out === null) {
    process.stdout.write(content);
    return;
  }

  await writeFile(options.out, content);
};

if (import.meta.main) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  });
}
