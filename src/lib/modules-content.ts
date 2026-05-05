import { readFile } from "node:fs/promises";
import path from "node:path";
import { MODULES, type Module } from "@/lib/blueprint-modules";

export type ModuleContent = {
  module: Module;
  raw: string;
  prev: Module | null;
  next: Module | null;
};

const CONTENT_DIR = path.join(process.cwd(), "content", "modules");

// Filesystem read happens at request time on the server only.
export async function loadModuleContent(
  slug: string
): Promise<ModuleContent | null> {
  const idx = MODULES.findIndex((m) => m.slug === slug);
  if (idx === -1) return null;

  const filePath = path.join(CONTENT_DIR, `${slug}.mdx`);
  let raw: string;
  try {
    raw = await readFile(filePath, "utf8");
  } catch {
    return null;
  }

  return {
    module: MODULES[idx],
    raw,
    prev: idx > 0 ? MODULES[idx - 1] : null,
    next: idx < MODULES.length - 1 ? MODULES[idx + 1] : null,
  };
}
