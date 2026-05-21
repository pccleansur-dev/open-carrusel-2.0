import path from "path";

function resolveEnvDir(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  if (!trimmed) return path.resolve(/* turbopackIgnore: true */ process.cwd(), fallback);
  return path.isAbsolute(trimmed)
    ? path.normalize(trimmed)
    : path.resolve(/* turbopackIgnore: true */ process.cwd(), trimmed);
}

export const DATA_DIR = resolveEnvDir(process.env.OC_DATA_DIR, "data");
export const FONT_CACHE_DIR = path.join(DATA_DIR, ".font-cache");
