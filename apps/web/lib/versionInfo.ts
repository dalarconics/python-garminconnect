import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CURRENT_APP_VERSION = "0.7.0";
export const PREVIOUS_APP_VERSION = "0.6.0";

export type ReleaseVersion = {
  version: string;
  date: string;
};

export type SystemVersions = {
  current: ReleaseVersion;
  previous: ReleaseVersion | null;
};

export function parseChangelogVersions(content: string): ReleaseVersion[] {
  const regex = /^##\s+\[([0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?)\]\s*-\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/gm;
  const releases: ReleaseVersion[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    releases.push({
      version: match[1],
      date: match[2],
    });
  }
  return releases;
}

export function getSystemVersions(customContent?: string): SystemVersions {
  let content = customContent;
  if (!content) {
    let currentDir = "";
    try {
      if (typeof import.meta !== "undefined" && import.meta.url) {
        currentDir = path.dirname(fileURLToPath(import.meta.url));
      }
    } catch {
      // Ignorar fallback si import.meta no está disponible
    }

    const candidates = [
      path.join(process.cwd(), "CHANGELOG.md"),
      path.join(process.cwd(), "apps", "web", "CHANGELOG.md"),
      currentDir ? path.resolve(currentDir, "..", "CHANGELOG.md") : "",
      currentDir ? path.resolve(currentDir, "..", "..", "apps", "web", "CHANGELOG.md") : "",
    ].filter(Boolean);

    for (const candidate of candidates) {
      try {
        if (fs.existsSync(candidate)) {
          content = fs.readFileSync(candidate, "utf-8");
          break;
        }
      } catch {
        // Ignorar fallos de acceso en rutas tentativas
      }
    }
  }

  if (!content) {
    return {
      current: { version: CURRENT_APP_VERSION, date: "2026-11-02" },
      previous: { version: PREVIOUS_APP_VERSION, date: "2026-10-25" },
    };
  }

  const releases = parseChangelogVersions(content);
  return {
    current: releases[0] ?? { version: CURRENT_APP_VERSION, date: "2026-11-02" },
    previous: releases[1] ?? { version: PREVIOUS_APP_VERSION, date: "2026-10-25" },
  };
}

export function formatVersionDisplay(
  systemVersions: SystemVersions,
  sha?: string | null
): { currentLine: string; previousLine: string } {
  const currentCommit = sha?.trim();
  const currentLine = currentCommit
    ? `v${systemVersions.current.version} · ${currentCommit} · ${systemVersions.current.date}`
    : `v${systemVersions.current.version} · ${systemVersions.current.date}`;

  const previousLine = systemVersions.previous
    ? `Ant: v${systemVersions.previous.version} · ${systemVersions.previous.date}`
    : "";

  return {
    currentLine,
    previousLine,
  };
}
